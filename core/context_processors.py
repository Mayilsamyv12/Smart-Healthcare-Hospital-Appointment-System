from commerce.models import CartItem, LabAppointment
from core.models import Appointment


def notification_counts(request):
    counts = {"cart_count": 0, "reminder_count": 0}
    if request.user.is_authenticated:
        # Cart Count
        counts["cart_count"] = CartItem.objects.filter(user=request.user).count()

        # Reminder Count (Upcoming appointments)
        # Assuming we want to show count of future or pending appointments
        # Simple count of all for now as 'reminders' usually implies all active bookings
        doc_appts = Appointment.objects.filter(user=request.user).count()
        lab_appts = LabAppointment.objects.filter(user=request.user).count()
        counts["reminder_count"] = doc_appts + lab_appts

    return counts


def sidebar_categories(request):
    from commerce.models import LabCategory

    lab_categories = LabCategory.objects.all().order_by("name")

    return {
        "sidebar_doctor_specialties": [],
        "sidebar_lab_categories": lab_categories,
        "sidebar_hospital_specialties": [],
    }
