from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import LabTest, LabAppointment, LabReview
from .serializers import LabTestSerializer, LabAppointmentSerializer, LabReviewSerializer
from django.utils import timezone
from datetime import datetime, time, timedelta

class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        lab = self.get_object()
        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.now().date().strftime('%Y-%m-%d')
        
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        # Basic slot generation logic (same as view)
        unavailable = [d.strip() for d in (lab.unavailable_dates or '').split(',') if d.strip()]
        if date_str in unavailable:
            return Response({"date": date_str, "slots": [], "closed": True})

        day_abbr = selected_date.strftime("%a")
        schedule = (lab.weekly_schedule or {}).get(day_abbr)
        
        if schedule:
            if not schedule.get('active'):
                return Response({"date": date_str, "slots": [], "closed": True})
            shift_start = datetime.strptime(schedule.get('start', '09:00'), "%H:%M").time()
            shift_end = datetime.strptime(schedule.get('end', '18:00'), "%H:%M").time()
        else:
            if day_abbr not in (lab.available_days or ''):
                return Response({"date": date_str, "slots": [], "closed": True})
            shift_start = lab.shift_start_time or time(9, 0)
            shift_end = lab.shift_end_time or time(18, 0)

        current_dt = datetime.combine(selected_date, shift_start)
        end_dt = datetime.combine(selected_date, shift_end)
        if end_dt <= current_dt: end_dt += timedelta(days=1)

        duration_mins = lab.slot_duration_minutes or 30
        max_patients = lab.patients_per_slot or 5
        slots = []
        
        while current_dt < end_dt:
            slot_time = current_dt.time()
            booked_count = LabAppointment.objects.filter(lab_test=lab, date=selected_date, time=slot_time).exclude(status="Cancelled").count()
            slots.append({
                "time": slot_time.strftime("%H:%M:%S"),
                "label": current_dt.strftime("%I:%M %p"),
                "is_booked": booked_count >= max_patients,
                "booked_count": booked_count,
                "max_patients": max_patients
            })
            current_dt += timedelta(minutes=duration_mins)

        return Response({"date": date_str, "slots": slots})

class LabAppointmentViewSet(viewsets.ModelViewSet):
    queryset = LabAppointment.objects.all()
    serializer_class = LabAppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return LabAppointment.objects.all()
        return LabAppointment.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(LabAppointment.STATUS_CHOICES):
            appointment.status = new_status
            appointment.save()
            return Response({"status": "success"})
        return Response({"error": "Invalid status"}, status=400)

class LabIDVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        submitted_id = request.data.get('lab_id', '').strip().upper()
        try:
            lab = LabTest.objects.get(lab_id=submitted_id)
            request.session['lab_id_verified'] = True
            request.session['current_lab_id'] = submitted_id
            request.session['current_lab_name'] = lab.name
            return Response({
                "message": f"Welcome to {lab.name} Portal!",
                "lab_name": lab.name,
                "lab_id": submitted_id,
                "verified": True
            })
        except LabTest.DoesNotExist:
            return Response({"error": "Invalid Lab ID."}, status=400)

class LabAdminDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        current_lab_id = request.session.get('current_lab_id')
        
        labs = LabTest.objects.all()
        appointments = LabAppointment.objects.all()
        
        # Filter if a specific lab is selected via Portal ID
        if current_lab_id:
            lab = labs.filter(lab_id=current_lab_id).first()
            if lab:
                labs = labs.filter(id=lab.id)
                appointments = appointments.filter(lab_test=lab)

        today = timezone.now().date()
        today_appts = appointments.filter(date=today)
        
        return Response({
            "total_labs": labs.count(),
            "total_appointments": appointments.count(),
            "today_appointments": today_appts.count(),
            "pending_count": appointments.filter(status="Pending").count(),
            "completed_count": appointments.filter(status="Completed").count(),
            "labs": LabTestSerializer(labs, many=True).data,
            "recent_appointments": LabAppointmentSerializer(appointments.order_by('-created_at')[:10], many=True).data,
            "current_lab_id": current_lab_id
        })
