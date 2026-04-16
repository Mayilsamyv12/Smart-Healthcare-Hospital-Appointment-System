from django.contrib.auth import authenticate, login as auth_login
from django.conf import settings
from django.utils import timezone
from datetime import date

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Q, Count

from .models import Doctor, Appointment, Prescription, MedicalRecord, AuditLog, PrescriptionTemplate
from commerce.models import Order
from .serializers import (
    DoctorSerializer, DoctorProfileUpdateSerializer, DoctorCreateSerializer,
    AppointmentSerializer, AppointmentStatusSerializer,
    PrescriptionSerializer, PrescriptionWriteSerializer,
    MedicalRecordSerializer,
    PrescriptionTemplateSerializer,
    DoctorLoginSerializer, DoctorIDVerifySerializer,
    UserSerializer,
)
from commerce.serializers import OrderSerializer


# ──────────────────────────────────────────────────────────────
# Permission Classes
# ──────────────────────────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    """Main Admin only."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Admin"


class IsPortalDoctor(permissions.BasePermission):
    """
    Shared portal user (is_staff) who has verified a Doctor ID in the session.
    Replaces the old IsDoctor that required a user.doctor_profile link.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_staff
            and bool(request.session.get('doctor_id_verified'))
            and bool(request.session.get('current_doctor_id'))
        )


class IsDoctor(permissions.BasePermission):
    """Legacy: Active Doctor with a linked doctor profile."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "Doctor"
            and hasattr(request.user, 'doctor_profile')
        )


class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "Patient"


class IsAdminOrDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role in ("Admin",):
            return True
        # Portal doctor with verified Doctor ID
        return (
            request.user.is_staff
            and bool(request.session.get('doctor_id_verified'))
            and bool(request.session.get('current_doctor_id'))
        )


# ──────────────────────────────────────────────────────────────
# Utility
# ──────────────────────────────────────────────────────────────

def get_current_doctor(request):
    """Return the Doctor object for the currently verified session (or fallback)."""
    doctor_id = request.session.get('current_doctor_id')
    
    # Fallback for strict browser cookie-dropping on PATCH/POST
    if not doctor_id and hasattr(request, 'data'):
        doctor_id = request.data.get('fallback_doctor_id')
        
    if not doctor_id:
        return None
    return Doctor.objects.filter(doctor_id=doctor_id, is_active=True).first()


def log_audit(user, action, details=None, request=None):
    ip = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(user=user, action=action, details=details, ip_address=ip)


# ──────────────────────────────────────────────────────────────
# 1. Doctor Authentication — SHARED credentials + Doctor ID
# ──────────────────────────────────────────────────────────────

class DoctorLoginView(APIView):
    """
    Step 1 of 2: All doctors log in with the ONE shared portal username + password.

    Credentials are set by the Main Admin in settings.py:
        DOCTOR_PORTAL_USERNAME = 'doctor'
        DOCTOR_PORTAL_PASSWORD = 'OneMeds@2024'

    On success → returns JWT. Doctor proceeds to Step 2 (Doctor ID entry).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DoctorLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        # Verify against shared portal credentials stored in settings
        portal_username = getattr(settings, 'DOCTOR_PORTAL_USERNAME', 'doctor')
        portal_password = getattr(settings, 'DOCTOR_PORTAL_PASSWORD', 'OneMeds@2024')

        if username != portal_username or password != portal_password:
            return Response(
                {"error": "Invalid portal credentials. Please contact your admin."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Authenticate the shared portal user in Django
        portal_user = authenticate(request, username=portal_username, password=portal_password)
        if portal_user is None:
            # Portal user not yet created — instruct admin to run setup command
            return Response(
                {
                    "error": "Doctor portal is not set up yet.",
                    "hint": "Admin must run: python manage.py setup_doctor_portal"
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Log in the shared user (sets Django session)
        auth_login(request, portal_user)

        # Issue JWT token
        refresh = RefreshToken.for_user(portal_user)

        return Response({
            "message": "Credentials verified. Please enter your unique Doctor ID to continue.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "requires_doctor_id": True,
        }, status=status.HTTP_200_OK)


class DoctorIDVerifyView(APIView):
    """
    Step 2 of 2: Doctor enters their unique Doctor ID (created by admin).

    Looks up the Doctor record by ID. If valid and active:
    - Sets session['doctor_id_verified'] = True
    - Sets session['current_doctor_id'] = <doctor_id>
    - Redirects to /doctor-panel/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DoctorIDVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        submitted_id = serializer.validated_data['doctor_id'].strip().upper()

        # Look up doctor by ID (no user account link needed)
        try:
            doctor = Doctor.objects.get(doctor_id=submitted_id)
        except Doctor.DoesNotExist:
            log_audit(request.user, "Doctor ID Verify FAILED",
                      f"Invalid ID submitted: {submitted_id}", request=request)
            return Response(
                {"error": "Invalid Doctor ID. Please check and try again."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not doctor.is_active:
            return Response(
                {"error": "This Doctor ID has been deactivated. Contact your admin."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Grant workspace access via session
        request.session['doctor_id_verified'] = True
        request.session['current_doctor_id'] = submitted_id
        request.session['current_doctor_name'] = doctor.name

        log_audit(request.user, "Doctor ID Verified",
                  f"Doctor: {doctor.name} (ID: {submitted_id})", request=request)

        return Response({
            "message": f"Welcome, Dr. {doctor.name}! Your workspace is now unlocked.",
            "doctor_name": doctor.name,
            "doctor_id": submitted_id,
            "panel_url": "/doctor-panel/",
            "verified": True,
        }, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# 2. Admin — Doctor Management (Admin creates doctors + IDs)
# ──────────────────────────────────────────────────────────────

class AdminDoctorViewSet(viewsets.ModelViewSet):
    """Admin-only: Full CRUD for Doctor accounts."""
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return DoctorCreateSerializer
        if self.action in ('update', 'partial_update'):
            return DoctorProfileUpdateSerializer
        return DoctorSerializer

    def get_queryset(self):
        qs = Doctor.objects.select_related('hospital', 'specialty').all()
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(doctor_id__icontains=search))
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        doctor = self.get_object()
        doctor.is_active = not doctor.is_active
        doctor.save()
        log_audit(request.user,
                  f"Doctor {'Activated' if doctor.is_active else 'Deactivated'}",
                  f"Doctor ID: {doctor.doctor_id}", request=request)
        return Response({
            "doctor_id": doctor.doctor_id,
            "is_active": doctor.is_active,
            "message": f"Doctor {doctor.name} {'activated' if doctor.is_active else 'deactivated'}."
        })


# ──────────────────────────────────────────────────────────────
# 3. Doctor Panel — Profile & Dashboard (session-based)
# ──────────────────────────────────────────────────────────────

class DoctorProfileView(APIView):
    """Doctor views/updates own profile using session-verified Doctor ID."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doctor = get_current_doctor(request)
        if not doctor:
            return Response({"error": "Doctor not found in session for GET."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DoctorSerializer(doctor, context={'request': request}).data)

    def patch(self, request):
        doctor = get_current_doctor(request)
        if not doctor:
            return Response({"error": f"Session empty or invalid. current_doctor_id is '{request.session.get('current_doctor_id')}'"}, status=status.HTTP_403_FORBIDDEN)
        serializer = DoctorProfileUpdateSerializer(doctor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_audit(request.user, "Doctor Updated Profile",
                      f"Doctor ID: {doctor.doctor_id}", request=request)
            return Response(DoctorSerializer(doctor, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DoctorDashboardView(APIView):
    """Aggregated dashboard for the currently session-verified doctor or global stats for Admin."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminOrDoctor]

    def get(self, request):
        user = request.user
        doctor = get_current_doctor(request)
        
        # Base queryset
        all_appts = Appointment.objects.all()
        
        # Filter if not Admin or if a specific doctor is selected in session
        if user.role != "Admin" or doctor:
            if not doctor:
                return Response({"error": "Doctor session expired or not found."}, status=status.HTTP_403_FORBIDDEN)
            all_appts = all_appts.filter(doctor=doctor)

        today = date.today()
        today_appts = all_appts.filter(date=today)
        status_counts = (
            all_appts.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        return Response({
            "doctor": DoctorSerializer(doctor, context={'request': request}).data if doctor else {"name": "System Admin"},
            "is_admin": user.role == "Admin",
            "stats": {
                "total_appointments": all_appts.count(),
                "today_count": today_appts.count(),
                "pending_count": all_appts.filter(status='Pending').count(),
                "completed_count": all_appts.filter(status='Completed').count(),
                "status_breakdown": list(status_counts),
            },
            "today_appointments": AppointmentSerializer(
                today_appts.select_related('user', 'doctor', 'doctor__hospital').order_by('time'),
                many=True, context={'request': request}
            ).data,
        })


# ──────────────────────────────────────────────────────────────
# 4. Doctor ViewSet (public read, admin full access)
# ──────────────────────────────────────────────────────────────

class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == "Admin":
            return Doctor.objects.select_related('hospital').all()
        return Doctor.objects.select_related('hospital').filter(is_active=True)


# ──────────────────────────────────────────────────────────────
# 5. Appointment ViewSet (doctor filter by session)
# ──────────────────────────────────────────────────────────────

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related(
            'doctor', 'user', 'doctor__hospital'
        )

        if user.role == "Admin":
            qs = qs.all()
        elif user.is_staff and self.request.session.get('current_doctor_id'):
            # Portal doctor — filter by session Doctor ID
            qs = qs.filter(doctor__doctor_id=self.request.session['current_doctor_id'])
        elif user.role == "Doctor" and hasattr(user, 'doctor_profile'):
            # Legacy: doctor linked to user account
            qs = qs.filter(doctor__user=user)
        else:
            # Patients see their own
            qs = qs.filter(user=user)

        params = self.request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('date'):
            qs = qs.filter(date=params['date'])
        if params.get('search'):
            qs = qs.filter(
                Q(patient_name__icontains=params['search']) |
                Q(doctor__name__icontains=params['search']) |
                Q(patient_problem__icontains=params['search'])
            )
        return qs.order_by('-date', '-time')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        log_audit(self.request.user, "Appointment Booked", request=self.request)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrDoctor])
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        user = request.user

        # Ensure permission
        if user.role != "Admin":
            doctor = get_current_doctor(request)
            if not doctor or appointment.doctor != doctor:
                return Response({"error": "Forbidden. This appointment belongs to another doctor."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AppointmentStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        
        # Enforce exactly the requested subset: Pending -> Completed / Cancelled
        if new_status not in ["Pending", "Completed", "Cancelled"]:
            return Response({"error": f"Status '{new_status}' is not allowed via this workflow."}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = new_status
        appointment.last_updated_by = request.user.role if request.user else 'System'
        appointment.save()
        log_audit(request.user, f"Appointment → {appointment.status}", f"Appt #{pk}", request=request)
        return Response({"id": appointment.id, "status": appointment.status})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        doctor = get_current_doctor(request)
        if not doctor:
             return Response({"error": "No active doctor session."}, status=status.HTTP_403_FORBIDDEN)

        # Handle multipart (file upload) or JSON prescription data
        generate_method = request.data.get('generate_method', 'template')
        diagnosis = request.data.get('diagnosis', '')
        medicines_raw = request.data.get('medicines', [])
        symptoms = request.data.get('symptoms', '')
        instructions = request.data.get('instructions', '')
        lab_tests = request.data.get('lab_tests', '')
        follow_up_date = request.data.get('follow_up_date') or None
        
        import json
        if isinstance(medicines_raw, str):
            try:
                medicines = json.loads(medicines_raw)
            except Exception:
                medicines = []
        else:
            medicines = medicines_raw

        prescription = None

        if generate_method == 'upload':
            # Uploaded file prescription
            prescription_file = request.FILES.get('prescription_file')
            if not prescription_file:
                return Response({"error": "Prescription file is compulsory for upload method."}, status=status.HTTP_400_BAD_REQUEST)
            
            prescription, _ = Prescription.objects.update_or_create(
                appointment=appointment,
                defaults={
                    'doctor': doctor,
                    'patient': appointment.user,
                    'generate_method': 'upload',
                    'prescription_file': prescription_file,
                    'diagnosis': diagnosis,
                    'symptoms': symptoms,
                    'instructions': instructions,
                    'lab_tests': lab_tests,
                    'follow_up_date': follow_up_date,
                    'medicines': [],
                }
            )
        else:
            # Template-based prescription — diagnosis or medicines required
            if not diagnosis and not medicines:
                return Response({"error": "Diagnosis or Medicines are compulsory for prescription."}, status=status.HTTP_400_BAD_REQUEST)
            
            prescription, _ = Prescription.objects.update_or_create(
                appointment=appointment,
                defaults={
                    'doctor': doctor,
                    'patient': appointment.user,
                    'generate_method': 'template',
                    'symptoms': symptoms,
                    'diagnosis': diagnosis,
                    'medicines': medicines,
                    'instructions': instructions,
                    'lab_tests': lab_tests,
                    'follow_up_date': follow_up_date,
                }
            )

        # Only mark as completed if prescription is successfully generated
        appointment.status = 'Completed'
        appointment.save()

        log_audit(request.user, "Appointment Completed", f"Appt #{pk}", request=request)
        return Response({
            "message": "Appointment completed and prescription generated.",
            "appointment_id": appointment.id,
            "prescription_id": prescription.id if prescription else None,
        })

    @action(detail=False, methods=['post'])
    def mark_leave(self, request):
        doctor = get_current_doctor(request)
        if not doctor:
            return Response({"error": "No active doctor session."}, status=status.HTTP_403_FORBIDDEN)
        dates = request.data.get('dates', [])
        if not dates:
            return Response({"error": "Provide a list of dates."}, status=status.HTTP_400_BAD_REQUEST)
        existing = set(d.strip() for d in (doctor.unavailable_dates or '').split(',') if d.strip())
        existing.update(dates)
        doctor.unavailable_dates = ','.join(sorted(existing))
        doctor.save()
        return Response({"message": "Leave dates updated.", "unavailable_dates": list(existing)})


# ──────────────────────────────────────────────────────────────
# 6. Prescription ViewSet
# ──────────────────────────────────────────────────────────────

class PrescriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PrescriptionWriteSerializer
        return PrescriptionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Prescription.objects.select_related('doctor', 'patient', 'appointment')
        if user.role == "Admin":
            return qs.all()
        doctor_id = self.request.session.get('current_doctor_id')
        if user.is_staff and doctor_id:
            return qs.filter(doctor__doctor_id=doctor_id)
        if hasattr(user, 'doctor_profile'):
            return qs.filter(doctor__user=user)
        return qs.filter(patient=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsPortalDoctor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save()
        log_audit(self.request.user, "Prescription Created", request=self.request)


# ──────────────────────────────────────────────────────────────
# 7. Medical Record ViewSet
# ──────────────────────────────────────────────────────────────

class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MedicalRecord.objects.select_related('patient', 'doctor')
        if user.role == "Admin":
            return qs.all()
        doctor_id = self.request.session.get('current_doctor_id')
        if user.is_staff and doctor_id:
            return qs.filter(doctor__doctor_id=doctor_id)
        if hasattr(user, 'doctor_profile'):
            return qs.filter(doctor__user=user)
        return qs.filter(patient=user)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrDoctor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        doctor = get_current_doctor(self.request)
        serializer.save(doctor=doctor)
        log_audit(self.request.user, "Medical Record Uploaded", request=self.request)

    @action(detail=False, methods=['post'], url_path='upload-for-appointment')
    def upload_for_appointment(self, request):
        """Doctor uploads a medical record tied to a specific appointment."""
        doctor = get_current_doctor(request)
        if not doctor:
            return Response({"error": "No active doctor session."}, status=status.HTTP_403_FORBIDDEN)

        appt_id = request.data.get('appointment_id')
        if not appt_id:
            return Response({"error": "appointment_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.get(id=appt_id, doctor=doctor)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        record = MedicalRecord.objects.create(
            patient=appointment.user,
            doctor=doctor,
            appointment=appointment,
            title=request.data.get('title', 'Medical Record'),
            record_type=request.data.get('record_type', 'Other'),
            file=file,
            notes=request.data.get('notes', ''),
        )
        log_audit(request.user, "Medical Record Uploaded for Appointment", f"Appt #{appt_id}", request=request)
        return Response(MedicalRecordSerializer(record, context={'request': request}).data, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────
# 7b. Prescription Template ViewSet (doctor's own templates)
# ──────────────────────────────────────────────────────────────

class PrescriptionTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionTemplateSerializer
    permission_classes = [IsPortalDoctor]

    def get_queryset(self):
        doctor = get_current_doctor(self.request)
        if not doctor:
            return PrescriptionTemplate.objects.none()
        return PrescriptionTemplate.objects.filter(doctor=doctor).order_by('-updated_at')

    def perform_create(self, serializer):
        doctor = get_current_doctor(self.request)
        serializer.save(doctor=doctor)

    def perform_update(self, serializer):
        serializer.save()


# ──────────────────────────────────────────────────────────────
# 7c. Appointment Detail View (prescription + records combined)
# ──────────────────────────────────────────────────────────────

class AppointmentDetailView(APIView):
    """
    Returns full detail of one appointment including its prescription and medical records.
    Accessible by the patient who owns it, or the doctor who managed it.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        try:
            # Patient: own appointment; Doctor: their appointment
            if user.is_staff and request.session.get('current_doctor_id'):
                appt = Appointment.objects.select_related('user', 'doctor').get(
                    id=pk, doctor__doctor_id=request.session['current_doctor_id']
                )
            else:
                appt = Appointment.objects.select_related('user', 'doctor').get(id=pk, user=user)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        prescription = None
        try:
            prescription = PrescriptionSerializer(appt.prescription, context={'request': request}).data
        except Prescription.DoesNotExist:
            pass

        records = MedicalRecord.objects.filter(appointment=appt).select_related('doctor')
        return Response({
            "appointment": AppointmentSerializer(appt, context={'request': request}).data,
            "prescription": prescription,
            "medical_records": MedicalRecordSerializer(records, many=True, context={'request': request}).data,
        })


# ──────────────────────────────────────────────────────────────
# 8. Patient Dashboard
# ──────────────────────────────────────────────────────────────

class PatientDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        appointments = Appointment.objects.filter(user=user).select_related(
            'doctor', 'doctor__hospital'
        ).order_by('-date', '-time')

        prescriptions = Prescription.objects.filter(patient=user).select_related(
            'doctor', 'appointment'
        ).order_by('-created_at')

        records = MedicalRecord.objects.filter(patient=user).select_related(
            'doctor'
        ).order_by('-uploaded_at')

        orders = Order.objects.filter(user=user).order_by('-created_at')

        return Response({
            "profile": UserSerializer(user).data,
            "appointments": AppointmentSerializer(appointments, many=True, context={'request': request}).data,
            "prescriptions": PrescriptionSerializer(prescriptions, many=True, context={'request': request}).data,
            "medical_records": MedicalRecordSerializer(records, many=True, context={'request': request}).data,
            "orders": OrderSerializer(orders, many=True, context={'request': request}).data,
            "stats": {
                "total_appointments": appointments.count(),
                "upcoming": appointments.filter(
                    date__gte=date.today(), status='Pending'
                ).count(),
                "completed": appointments.filter(status='Completed').count(),
                "total_prescriptions": prescriptions.count(),
                "total_orders": orders.count(),
            }
        })


# ──────────────────────────────────────────────────────────────
# 9. Available Slots (public)
# ──────────────────────────────────────────────────────────────

class DoctorSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, doctor_id):
        from datetime import datetime, timedelta, time as dtime

        doctor = Doctor.objects.filter(id=doctor_id, is_active=True).first()
        if not doctor:
            return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        date_str = request.query_params.get('date')
        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()
        except ValueError:
            return Response({"error": "Use YYYY-MM-DD format."}, status=status.HTTP_400_BAD_REQUEST)

        unavailable = [d.strip() for d in (doctor.unavailable_dates or '').split(',') if d.strip()]
        if selected_date.strftime('%Y-%m-%d') in unavailable:
            return Response({"date": str(selected_date), "available": False, "slots": [], "reason": "Doctor is on leave."})

        shift_start = doctor.shift_start_time or dtime(9, 0)
        current_dt = datetime.combine(selected_date, shift_start)
        end_dt = current_dt + timedelta(hours=3)

        booked_times = set(
            Appointment.objects.filter(
                doctor=doctor, date=selected_date, status__in=['Pending', 'Completed']
            ).values_list('time', flat=True)
        )

        slots = []
        while current_dt < end_dt:
            slot_time = current_dt.time()
            slots.append({
                "time": slot_time.strftime('%H:%M'),
                "label": current_dt.strftime('%I:%M %p'),
                "is_available": slot_time not in booked_times,
            })
            current_dt += timedelta(minutes=30)

        return Response({
            "doctor_name": doctor.name,
            "date": str(selected_date),
            "available": True,
            "slots": slots,
        })
