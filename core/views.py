from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import models
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render

from .models import Appointment, Doctor, Hospital, Review


def doctor_login_page(request):
    """Renders the standalone Doctor Login page (powered by React 2-step auth)."""
    # If already logged in as a doctor with verified ID, go straight to panel
    if request.user.is_authenticated and hasattr(request.user, 'doctor_profile'):
        if request.session.get('doctor_id_verified'):
            return redirect('/doctor-panel/')
    return render(request, 'core/doctor_login.html')

def home(request):
    user_location = request.session.get("user_location")
    nearby_hospitals = []
    nearby_doctors = []
    nearby_labs = []

    if user_location:
        nearby_hospitals = Hospital.objects.filter(
            location__icontains=user_location
        )[:6]
        nearby_doctors = Doctor.objects.filter(
            hospital__location__icontains=user_location
        ).select_related("hospital")[:6]
        try:
            from commerce.models import LabTest
            nearby_labs = LabTest.objects.filter(
                location__icontains=user_location
            )[:6]
        except Exception:
            nearby_labs = []
    else:
        nearby_hospitals = Hospital.objects.all()[:6]
        nearby_doctors = Doctor.objects.select_related("hospital").all()[:6]
        try:
            from commerce.models import LabTest
            nearby_labs = LabTest.objects.all()[:6]
        except Exception:
            nearby_labs = []

    return render(request, "core/home.html", {
        "user_location": user_location,
        "nearby_hospitals": nearby_hospitals,
        "nearby_doctors": nearby_doctors,
        "nearby_labs": nearby_labs,
    })


def api_home(request):
    user_location = request.session.get("user_location")
    nearby_hospitals = []
    nearby_doctors = []
    nearby_labs = []

    if user_location:
        nearby_hospitals = Hospital.objects.filter(location__icontains=user_location)[:6]
        nearby_doctors = Doctor.objects.filter(hospital__location__icontains=user_location).select_related("hospital")[:6]
        try:
            from commerce.models import LabTest
            nearby_labs = LabTest.objects.filter(location__icontains=user_location)[:6]
        except Exception:
            nearby_labs = []
    else:
        nearby_hospitals = Hospital.objects.all()[:6]
        nearby_doctors = Doctor.objects.select_related("hospital").all()[:6]
        try:
            from commerce.models import LabTest
            nearby_labs = LabTest.objects.all()[:6]
        except Exception:
            nearby_labs = []

    return JsonResponse({
        "hospitals": [
            {"id": h.id, "name": h.name, "location": h.location, "image": h.image.url if h.image else None} for h in nearby_hospitals
        ],
        "doctors": [
            {"id": d.id, "name": d.name, "specialty": d.specialty or "", "hospital": d.hospital.name if d.hospital else "", "image": d.image.url if d.image else None, "experience": d.experience} for d in nearby_doctors
        ],
        "labs": [
            {"id": l.id, "name": l.name, "location": l.location, "image": l.image.url if l.image else None} for l in nearby_labs
        ]
    })



def hospital_list(request):
    query = request.GET.get("q")
    user_location = request.session.get("user_location")

    hospitals = Hospital.objects.all()

    if user_location:
        hospitals = hospitals.filter(location__icontains=user_location)

    if query:
        hospitals = hospitals.filter(
            models.Q(name__icontains=query) | models.Q(location__icontains=query)
        )


    return render(
        request,
        "core/hospital_list.html",
        {"hospitals": hospitals, "current_location": user_location},
    )


def hospital_detail(request, hospital_id):
    hospital = get_object_or_404(Hospital, id=hospital_id)
    reviews = hospital.reviews.select_related("user").order_by("-created_at")
    user_has_reviewed = False
    if request.user.is_authenticated:
        user_has_reviewed = reviews.filter(user=request.user).exists()
    return render(request, "core/hospital_detail.html", {
        "hospital": hospital,
        "reviews": reviews,
        "user_has_reviewed": user_has_reviewed,
    })


def doctor_list(request):
    doctors = Doctor.objects.all()
    user_location = request.session.get("user_location")
    if user_location:
        doctors = doctors.filter(hospital__location__icontains=user_location)

    specialty = request.GET.get("specialty")
    if specialty:
        doctors = doctors.filter(specialty__icontains=specialty)

    return render(
        request,
        "core/doctor_list.html",
        {"doctors": doctors, "current_location": user_location},
    )


def doctor_profile(request, doctor_id):
    doctor = get_object_or_404(Doctor, id=doctor_id)
    reviews = doctor.reviews.select_related("user").order_by("-created_at")
    user_has_reviewed = False
    if request.user.is_authenticated:
        user_has_reviewed = reviews.filter(user=request.user).exists()
    return render(request, "core/doctor_profile.html", {
        "doctor": doctor,
        "reviews": reviews,
        "user_has_reviewed": user_has_reviewed,
    })


@login_required
def book_appointment(request, doctor_id):
    doctor = get_object_or_404(Doctor, id=doctor_id)

    # Get selected date from GET or default to today
    selected_date_str = request.GET.get("date")
    if selected_date_str:
        try:
            from datetime import datetime

            selected_date = datetime.strptime(selected_date_str, "%Y-%m-%d").date()
        except ValueError:
            from datetime import date

            selected_date = date.today()
    else:
        from datetime import date

        selected_date = date.today()

    if request.method == "POST":
        date_str = request.POST.get("date")
        time_str = request.POST.get("time")

        # Check if already booked up to capacity
        duration_mins = doctor.slot_duration_minutes or 15
        max_patients = doctor.patients_per_slot or 3
        
        booked_count = Appointment.objects.filter(
            doctor=doctor, date=date_str, time=time_str
        ).exclude(status__in=["Rejected", "Cancelled"]).count()
        
        if booked_count >= max_patients:
            messages.error(
                request, "This time slot is fully booked. Please choose another."
            )
            return redirect("book_appointment", doctor_id=doctor.id)

        patient_name = request.POST.get("patient_name")
        patient_age = request.POST.get("patient_age")
        if not patient_age: patient_age = None
        patient_problem = request.POST.get("patient_problem")
        patient_contact = request.POST.get("patient_contact")
        patient_location = request.POST.get("patient_location")
        payment_mode = request.POST.get("payment_mode", "Cash on hand")

        Appointment.objects.create(
            user=request.user,
            doctor=doctor,
            date=date_str,
            time=time_str,
            patient_name=patient_name,
            patient_age=patient_age,
            patient_problem=patient_problem,
            patient_contact=patient_contact,
            patient_location=patient_location,
            payment_mode=payment_mode
        )

        messages.success(request, "Appointment booked successfully!")
        return redirect("/patient/dashboard/")

    # Generate Slots
    from datetime import datetime, time, timedelta

    shift_start = doctor.shift_start_time or time(9, 0)
    shift_end = doctor.shift_end_time or time(12, 0)
    
    current_dt = datetime.combine(selected_date, shift_start)
    end_dt = datetime.combine(selected_date, shift_end)
    
    # Handle overnight shift implicitly if start > end
    if end_dt <= current_dt:
        end_dt += timedelta(days=1)

    duration_mins = doctor.slot_duration_minutes or 15
    max_patients = doctor.patients_per_slot or 3

    slots = []
    while current_dt < end_dt:
        slot_time = current_dt.time()
        
        # Count non-cancelled appointments for this specific slot time
        booked_count = Appointment.objects.filter(
            doctor=doctor, 
            date=selected_date, 
            time=slot_time
        ).exclude(status__in=["Rejected", "Cancelled"]).count()

        is_booked = booked_count >= max_patients

        slots.append(
            {
                "time": slot_time.strftime("%H:%M:%S"),
                "label": current_dt.strftime("%I:%M %p")[:5] + current_dt.strftime("%p").lower(),
                "is_booked": is_booked,
                "booked_count": booked_count,
                "max_patients": max_patients
            }
        )
        current_dt += timedelta(minutes=duration_mins)

    return render(
        request,
        "core/book_appointment.html",
        {
            "doctor": doctor,
            "slots": slots,
            "selected_date": selected_date.strftime("%Y-%m-%d"),
        },
    )


@login_required
def reminder_list(request):
    appointments = Appointment.objects.filter(user=request.user).order_by(
        "date", "time"
    )
    from commerce.models import LabAppointment

    lab_appointments = LabAppointment.objects.filter(user=request.user).order_by(
        "date", "time"
    )
    return render(
        request,
        "core/reminder_list.html",
        {"appointments": appointments, "lab_appointments": lab_appointments},
    )


def api_profile_data(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not logged in"}, status=401)

    apps = Appointment.objects.filter(user=request.user).order_by("date", "time")
    appointments_list = [
        {"id": a.id, "doctor": a.doctor.name, "date": a.date, "time": a.time}
        for a in apps
    ]

    from commerce.models import Order

    orders = Order.objects.filter(user=request.user).order_by("-created_at")
    orders_list = [
        {
            "id": o.id,
            "status": o.status,
            "total": str(o.total_amount),
            "date": o.created_at.strftime("%Y-%m-%d"),
        }
        for o in orders
    ]

    return JsonResponse(
        {
            "username": request.user.username,
            "email": request.user.email,
            "appointments": appointments_list,
            "orders": orders_list,
        }
    )


def search_view(request):
    query = request.GET.get("q")
    user_location = request.session.get("user_location")
    hospitals = []
    doctors = []
    labs = []
    medicines = []

    if query:
        from commerce.models import LabTest, Medicine

        # Search Hospitals
        hospitals = Hospital.objects.filter(
            models.Q(name__icontains=query)
            | models.Q(location__icontains=query)
            | models.Q(contact_no__icontains=query)
        ).distinct()

        # Search Doctors
        doctors = Doctor.objects.filter(
            models.Q(name__icontains=query)
            | models.Q(specialty__icontains=query)
            | models.Q(hospital__name__icontains=query)
            | models.Q(hospital__location__icontains=query)
        ).distinct()

        # Search Lab Tests
        labs = LabTest.objects.filter(
            models.Q(name__icontains=query)
            | models.Q(features__icontains=query)
            | models.Q(category__name__icontains=query)
            | models.Q(location__icontains=query)
        ).distinct()

        # Search Medicines
        medicines = Medicine.objects.filter(
            models.Q(name__icontains=query) | models.Q(description__icontains=query)
        ).distinct()

        if user_location:
            hospitals = hospitals.filter(location__icontains=user_location)
            doctors = doctors.filter(hospital__location__icontains=user_location)
            labs = labs.filter(location__icontains=user_location)

    return render(
        request,
        "core/search_results.html",
        {
            "query": query,
            "hospitals": hospitals,
            "doctors": doctors,
            "labs": labs,
            "medicines": medicines,
            "current_location": user_location,
        },
    )




@login_required
def submit_review(request):
    if request.method == "POST":
        hospital_id = request.POST.get("hospital_id")
        doctor_id = request.POST.get("doctor_id")
        rating = request.POST.get("rating")
        comment = request.POST.get("comment", "").strip()

        if not rating:
            messages.error(request, "Please select a star rating.")
            return redirect(request.META.get("HTTP_REFERER", "home"))

        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError
        except ValueError:
            messages.error(request, "Invalid rating value.")
            return redirect(request.META.get("HTTP_REFERER", "home"))

        if hospital_id:
            hospital = get_object_or_404(Hospital, id=hospital_id)
            # Prevent duplicate reviews
            if Review.objects.filter(user=request.user, hospital=hospital).exists():
                messages.warning(request, "You have already reviewed this hospital.")
            else:
                Review.objects.create(
                    user=request.user,
                    hospital=hospital,
                    rating=rating,
                    comment=comment,
                )
                messages.success(request, "✅ Thank you for your review!")
            return redirect("hospital_detail", hospital_id=hospital_id)

        elif doctor_id:
            doctor = get_object_or_404(Doctor, id=doctor_id)
            if Review.objects.filter(user=request.user, doctor=doctor).exists():
                messages.warning(request, "You have already reviewed this doctor.")
            else:
                Review.objects.create(
                    user=request.user,
                    doctor=doctor,
                    rating=rating,
                    comment=comment,
                )
                messages.success(request, "✅ Thank you for your review!")
            return redirect("doctor_profile", doctor_id=doctor_id)

    return redirect("home")


@login_required
def edit_review(request, review_id):
    review = get_object_or_404(Review, id=review_id, user=request.user)
    if request.method == "POST":
        rating = request.POST.get("rating")
        comment = request.POST.get("comment", "").strip()
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError
        except (ValueError, TypeError):
            messages.error(request, "Invalid rating value.")
            return redirect(request.META.get("HTTP_REFERER", "home"))
        review.rating = rating
        review.comment = comment
        review.save()
        messages.success(request, "✅ Review updated successfully!")
        if review.hospital:
            return redirect("hospital_detail", hospital_id=review.hospital.id)
        elif review.doctor:
            return redirect("doctor_profile", doctor_id=review.doctor.id)
    return redirect("home")


@login_required
def delete_review(request, review_id):
    review = get_object_or_404(Review, id=review_id, user=request.user)
    if request.method == "POST":
        hospital_id = review.hospital.id if review.hospital else None
        doctor_id = review.doctor.id if review.doctor else None
        review.delete()
        messages.success(request, "🗑️ Review deleted successfully.")
        if hospital_id:
            return redirect("hospital_detail", hospital_id=hospital_id)
        elif doctor_id:
            return redirect("doctor_profile", doctor_id=doctor_id)
    return redirect("home")


def about(request):
    return render(request, "core/about.html")


def terms(request):
    return render(request, "core/terms.html")


def privacy(request):
    return render(request, "core/privacy.html")


def contact(request):
    return render(request, "core/contact.html")


def help_page(request):
    return render(request, "core/help.html")


def set_location(request):
    if request.method == "POST":
        location = request.POST.get("location")
        if location:
            request.session["user_location"] = location
            messages.success(request, f"Location set to {location}")
        else:
            if "user_location" in request.session:
                del request.session["user_location"]
                messages.info(request, "Location filter cleared")
    return redirect(request.META.get("HTTP_REFERER", "home"))

def api_hospitals(request):
    hospitals = Hospital.objects.all()
    user_location = request.session.get("user_location")
    if user_location:
         hospitals = hospitals.filter(location__icontains=user_location)
    
    data = []
    for h in hospitals:
        data.append({
            "id": h.id,
            "name": h.name,
            "location": h.location,
            "image": h.image.url if h.image else None,
            "about": getattr(h, 'about', ''),
            "contact_no": getattr(h, 'contact_no', ''),
            "latitude": getattr(h, 'latitude', ''),
            "longitude": getattr(h, 'longitude', ''),
            "specialties": [],
            "avg_rating": h.avg_rating(),
            "review_count": h.review_count()
        })
    return JsonResponse({"hospitals": data, "current_location": user_location})

def api_doctors(request):
    doctors = Doctor.objects.select_related("hospital").all()
    user_location = request.session.get("user_location")
    if user_location:
         doctors = doctors.filter(hospital__location__icontains=user_location)
         
    data = []
    for d in doctors:
        data.append({
            "id": d.id,
            "name": d.name,
            "specialty": d.specialty or "",
            "hospital": d.hospital.name if d.hospital else "",
            "hospital_id": d.hospital.id if d.hospital else None,
            "image": d.image.url if d.image else None,
            "experience": d.experience,
            "consultation_fee": getattr(d, 'consultation_fee', 0),
            "avg_rating": d.avg_rating(),
            "review_count": d.review_count()
        })
    return JsonResponse({"doctors": data, "current_location": user_location})
