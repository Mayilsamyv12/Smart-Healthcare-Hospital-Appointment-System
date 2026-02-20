from django.shortcuts import render, get_object_or_404, redirect
from .models import Hospital, Doctor, Appointment
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import models

def home(request):
    return render(request, 'core/home.html')

def hospital_list(request):
    query = request.GET.get('q')
    user_location = request.session.get('user_location')
    
    hospitals = Hospital.objects.all()
    
    if user_location:
        hospitals = hospitals.filter(location__icontains=user_location)

    if query:
        hospitals = hospitals.filter(models.Q(name__icontains=query) | models.Q(location__icontains=query))
        
    specialty = request.GET.get('specialty')
    if specialty:
        hospitals = hospitals.filter(specialties__name__icontains=specialty)
        
    return render(request, 'core/hospital_list.html', {'hospitals': hospitals, 'current_location': user_location})


def hospital_detail(request, hospital_id):
    hospital = get_object_or_404(Hospital, id=hospital_id)
    return render(request, 'core/hospital_detail.html', {'hospital': hospital})

def doctor_list(request):
    doctors = Doctor.objects.all()
    user_location = request.session.get('user_location')
    if user_location:
        doctors = doctors.filter(hospital__location__icontains=user_location)
        
    specialty = request.GET.get('specialty')
    if specialty:
        doctors = doctors.filter(specialty__name__icontains=specialty)
        
    return render(request, 'core/doctor_list.html', {'doctors': doctors, 'current_location': user_location})


@login_required
def book_appointment(request, doctor_id):
    doctor = get_object_or_404(Doctor, id=doctor_id)
    
    # Get selected date from GET or default to today
    selected_date_str = request.GET.get('date')
    if selected_date_str:
        try:
            from datetime import datetime
            selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
        except ValueError:
            from datetime import date
            selected_date = date.today()
    else:
        from datetime import date
        selected_date = date.today()

    if request.method == 'POST':
        date_str = request.POST.get('date')
        time_str = request.POST.get('time')
        
        # Check if already booked
        if Appointment.objects.filter(doctor=doctor, date=date_str, time=time_str).exists():
            messages.error(request, 'This slot is already booked. Please choose another.')
            return redirect('book_appointment', doctor_id=doctor.id)
            
        Appointment.objects.create(user=request.user, doctor=doctor, date=date_str, time=time_str)
        
        # Send email confirmation (Placeholder for next step)
        # send_confirmation_email(request.user, doctor, date_str, time_str)
        
        messages.success(request, 'Appointment booked successfully!')
        return redirect('reminder_list')

    # Generate Slots
    from datetime import datetime, timedelta, time
    
    shift_start = doctor.shift_start_time or time(9, 0)
    current_dt = datetime.combine(selected_date, shift_start)
    end_dt = current_dt + timedelta(hours=3) # 3 Hours Shift logic
    
    booked_times = Appointment.objects.filter(doctor=doctor, date=selected_date).values_list('time', flat=True)
    
    slots = []
    while current_dt < end_dt:
        slot_time = current_dt.time()
        is_booked = False
        # Simple check: if slot_time is exactly in booked_times
        if slot_time in booked_times:
            is_booked = True
            
        slots.append({
            'time': slot_time.strftime('%H:%M'), 
            'label': current_dt.strftime('%I:%M %p'),
            'is_booked': is_booked
        })
        current_dt += timedelta(minutes=30) # 30 min interval

    return render(request, 'core/book_appointment.html', {
        'doctor': doctor, 
        'slots': slots, 
        'selected_date': selected_date.strftime('%Y-%m-%d')
    })

@login_required
def reminder_list(request):
    appointments = Appointment.objects.filter(user=request.user).order_by('date', 'time')
    from commerce.models import LabAppointment
    lab_appointments = LabAppointment.objects.filter(user=request.user).order_by('date', 'time')
    return render(request, 'core/reminder_list.html', {'appointments': appointments, 'lab_appointments': lab_appointments})

def search_view(request):
    query = request.GET.get('q')
    user_location = request.session.get('user_location')
    hospitals = []
    doctors = []
    labs = []
    medicines = []
    
    if query:
        from commerce.models import LabTest, Medicine
        
        # Search Hospitals
        hospitals = Hospital.objects.filter(
            models.Q(name__icontains=query) | 
            models.Q(location__icontains=query) |
            models.Q(specialties__name__icontains=query) |
            models.Q(contact_no__icontains=query)
        ).distinct()
        
        # Search Doctors
        doctors = Doctor.objects.filter(
            models.Q(name__icontains=query) | 
            models.Q(specialty__name__icontains=query) |
            models.Q(hospital__name__icontains=query) |
            models.Q(hospital__location__icontains=query)
        ).distinct()
        
        # Search Lab Tests
        labs = LabTest.objects.filter(
            models.Q(name__icontains=query) | 
            models.Q(features__icontains=query) |
            models.Q(category__name__icontains=query) |
            models.Q(location__icontains=query)
        ).distinct()
        
        # Search Medicines
        medicines = Medicine.objects.filter(
            models.Q(name__icontains=query) | 
            models.Q(description__icontains=query)
        ).distinct()
        
        if user_location:
            hospitals = hospitals.filter(location__icontains=user_location)
            doctors = doctors.filter(hospital__location__icontains=user_location)
            labs = labs.filter(location__icontains=user_location)
            # Medicines usually don't have location filtering in this simple model sans Pharmacy inventory
        
    return render(request, 'core/search_results.html', {
        'query': query,
        'hospitals': hospitals,
        'doctors': doctors,
        'labs': labs,
        'medicines': medicines,
        'current_location': user_location
    })


def about(request):
    return render(request, 'core/about.html')

def terms(request):
    return render(request, 'core/terms.html')

def privacy(request):
    return render(request, 'core/privacy.html')

def contact(request):
    return render(request, 'core/contact.html')

def help_page(request):
    return render(request, 'core/help.html')

def set_location(request):
    if request.method == 'POST':
        location = request.POST.get('location')
        if location:
            request.session['user_location'] = location
            messages.success(request, f"Location set to {location}")
        else:
            if 'user_location' in request.session:
                del request.session['user_location']
                messages.info(request, "Location filter cleared")
    return redirect(request.META.get('HTTP_REFERER', 'home'))





