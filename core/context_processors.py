from commerce.models import CartItem, LabAppointment
from core.models import Appointment


def notification_counts(request):
    counts = {"cart_count": 0, "reminder_count": 0}
    if request.user.is_authenticated:
        # Cart Count
        counts["cart_count"] = CartItem.objects.filter(user=request.user).count()

        # Reminder Count (Active Pending appointments)
        doc_appts = Appointment.objects.filter(user=request.user).exclude(
            status__in=["Completed", "Cancelled", "Rejected"]
        ).count()
        lab_appts = LabAppointment.objects.filter(user=request.user).exclude(
            status__in=["Completed", "Cancelled", "Rejected"]
        ).count()
        counts["reminder_count"] = doc_appts + lab_appts

    return counts


def sidebar_categories(request):
    return {
        "sidebar_doctor_specialties": [],
        "sidebar_lab_categories": [],
        "sidebar_hospital_specialties": [],
    }
