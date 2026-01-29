from commerce.models import CartItem, LabAppointment
from core.models import Appointment
from django.db.models import Q
import datetime

def notification_counts(request):
    counts = {'cart_count': 0, 'reminder_count': 0}
    if request.user.is_authenticated:
        # Cart Count
        counts['cart_count'] = CartItem.objects.filter(user=request.user).count()
        
        # Reminder Count (Upcoming appointments)
        # Assuming we want to show count of future or pending appointments
        # Simple count of all for now as 'reminders' usually implies all active bookings
        doc_appts = Appointment.objects.filter(user=request.user).count()
        lab_appts = LabAppointment.objects.filter(user=request.user).count()
        counts['reminder_count'] = doc_appts + lab_appts
        
    return counts

def sidebar_categories(request):
    from core.models import Specialty
    from commerce.models import LabCategory

    # Fetch Specialties and LabCategories
    doctor_specialties = Specialty.objects.all().order_by('name')
    lab_categories = LabCategory.objects.all().order_by('name')
    
    # Hospital specialties are shared with Doctor specialties for now
    hospital_specialties = doctor_specialties

    return {
        'sidebar_doctor_specialties': doctor_specialties,
        'sidebar_lab_categories': lab_categories,
        'sidebar_hospital_specialties': hospital_specialties,
    }
