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
    from core.models import Doctor
    from commerce.models import LabTest
    
    # Fetch distinct specialties for Doctors/Hospitals
    specialties = Doctor.objects.values_list('specialty', flat=True).distinct().order_by('specialty')
    
    # Fetch distinct Lab Test names
    lab_tests = LabTest.objects.values_list('name', flat=True).distinct().order_by('name')[:8] # Limit to 8
    
    return {
        'sidebar_specialties': specialties,
        'sidebar_lab_tests': lab_tests
    }
