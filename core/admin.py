from django.contrib import admin
from django.shortcuts import redirect

from .models import (
    Appointment, Doctor, Hospital,
    Review
)


# ──────────────────────────────────────────────────────────────


# ──────────────────────────────────────────────────────────────
# 1. Custom Doctor Admin Site
#    — Always redirects to /doctor-login/ (never shows Django form)
#    — Checks session for doctor_id_verified + current_doctor_id
# ──────────────────────────────────────────────────────────────

class DoctorAdminSite(admin.AdminSite):
    site_header = "OneMeds Doctor Portal"
    site_title = "Doctor Portal"
    index_title = "Manage Your Appointments"

    def has_permission(self, request):
        """
        Grant access only when:
        1. A staff user (shared portal user) is logged in
        2. session['doctor_id_verified'] = True
        3. session['current_doctor_id'] is set to a valid Doctor ID
        """
        if not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False
        if not request.user.is_staff:
            return False
        return (
            bool(request.session.get('doctor_id_verified'))
            and bool(request.session.get('current_doctor_id'))
        )

    def login(self, request, extra_context=None):
        """
        Never show Django's built-in admin login.
        Always redirect to the custom 2-step Doctor Login page.
        """
        # Not authenticated at all
        if not request.user.is_authenticated:
            return redirect('/doctor-login/?next=/doctor-panel/')

        # Authenticated but not staff (patient or regular user logged in)
        if not request.user.is_staff:
            return redirect('/doctor-login/?error=notdoctor')

        # Staff but Doctor ID not yet verified
        if not request.session.get('doctor_id_verified'):
            return redirect('/doctor-login/?next=/doctor-panel/')

        # Should never reach here
        return redirect('/doctor-login/')

    def each_context(self, request):
        """Inject current doctor info into every admin page context."""
        ctx = super().each_context(request)
        ctx['current_doctor_name'] = request.session.get('current_doctor_name', '')
        ctx['current_doctor_id'] = request.session.get('current_doctor_id', '')
        return ctx


doctor_admin_site = DoctorAdminSite(name='doctor_admin')


# ──────────────────────────────────────────────────────────────
# 2. Main Admin Site — Model Registrations
# ──────────────────────────────────────────────────────────────

@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "contact_no")
    search_fields = ("name", "location")
    fieldsets = (
        ("Basic Info", {"fields": ("name", "about", "image")}),
        ("Location", {"fields": ("location", "latitude", "longitude")}),
        ("Contact", {"fields": ("contact_no",)}),
    )



@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("doctor_id", "name", "specialty", "hospital", "is_active")
    list_filter = ("specialty", "hospital", "is_active")
    search_fields = ("name", "doctor_id", "specialty__name")
    # doctor_id is editable — admin types it manually
    fieldsets = (
        ("Workspace Access", {
            "fields": ("doctor_id", "is_active"),
            "description": (
                "⚠️ Doctor ID must be unique. "
                "All doctors use the SHARED portal login, then enter this ID to access their workspace."
            ),
        }),
        ("Doctor Info", {
            "fields": ("name", "hospital", "specialty", "image")
        }),
        ("Professional Details", {
            "fields": ("experience", "consultation_fee")
        }),
        ("Availability", {
            "fields": ("available_days", "shift_start_time", "shift_end_time", "unavailable_dates", "weekly_schedule"),
        }),
    )

    def has_change_permission(self, request, obj=None):
        return super().has_change_permission(request, obj)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("get_doctor_id", "patient_name", "doctor", "date", "time", "status")
    list_filter = ("status", "date", "doctor")
    search_fields = ("doctor__doctor_id", "doctor__name", "patient_name", "user__username")
    list_editable = ("status",)
    readonly_fields = ("created_at",)
    date_hierarchy = "date"

    def get_doctor_id(self, obj):
        return obj.doctor.doctor_id
    get_doctor_id.short_description = "Doctor ID"





@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('user', 'doctor', 'hospital', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('user__username', 'doctor__name', 'hospital__name', 'comment')


# ──────────────────────────────────────────────────────────────
# 3. Doctor Panel — Filtered Model Admins
#    All querysets filtered by session['current_doctor_id']
#    No user account link required
# ──────────────────────────────────────────────────────────────

def _get_session_doctor(request):
    """Return the Doctor object for the current session's verified doctor_id."""
    doctor_id = request.session.get('current_doctor_id')
    if not doctor_id:
        return None
    try:
        return Doctor.objects.get(doctor_id=doctor_id)
    except Doctor.DoesNotExist:
        return None


class DoctorFilteredAdmin(admin.ModelAdmin):
    """
    Base class: all querysets filtered by the session's current_doctor_id.
    Doctors see only THEIR OWN patients and records.
    """
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        doctor = _get_session_doctor(request)
        if doctor:
            return qs.filter(doctor=doctor)
        return qs.none()

    def save_model(self, request, obj, form, change):
        if not change:
            doctor = _get_session_doctor(request)
            if doctor:
                obj.doctor = doctor
        super().save_model(request, obj, form, change)

    def has_add_permission(self, request):
        return bool(_get_session_doctor(request))

    def has_delete_permission(self, request, obj=None):
        return False  # Doctors cannot delete records


class DoctorAppointmentAdmin(DoctorFilteredAdmin):
    list_display = ("patient_name", "get_patient_contact", "date", "time", "status", "payment_mode")
    list_filter = ("status", "date")
    search_fields = ("patient_name", "user__username", "patient_problem")
    list_editable = ("status",)
    readonly_fields = ("user", "doctor", "date", "time", "patient_contact", "patient_location", "created_at")
    date_hierarchy = "date"
    fieldsets = (
        ("Patient Info", {
            "fields": ("user", "patient_name", "patient_age", "patient_contact", "patient_location")
        }),
        ("Appointment Details", {
            "fields": ("doctor", "date", "time", "status", "payment_mode")
        }),
        ("Problem Description", {
            "fields": ("patient_problem",)
        }),
    )

    def get_patient_contact(self, obj):
        return obj.patient_contact or "—"
    get_patient_contact.short_description = "Contact"



class DoctorSelfProfileAdmin(admin.ModelAdmin):
    """
    Allows the logged-in doctor to view their own profile (read-only).
    Profile is identified by session's current_doctor_id — no user link needed.
    """
    readonly_fields = (
        "doctor_id", "name", "hospital", "specialty",
        "experience", "consultation_fee",
        "available_days", "shift_start_time", "shift_end_time", "unavailable_dates", "weekly_schedule", "image"
    )
    fieldsets = (
        ("Your Doctor ID", {
            "fields": ("doctor_id",),
            "description": "Your unique Doctor ID is set by the Main Admin.",
        }),
        ("Profile", {
            "fields": ("name", "hospital", "specialty", "image")
        }),
        ("Professional Details", {
            "fields": ("experience", "consultation_fee")
        }),
        ("Availability Schedule", {
            "fields": ("available_days", "shift_start_time", "shift_end_time", "unavailable_dates", "weekly_schedule")
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        doctor_id = request.session.get('current_doctor_id')
        if doctor_id:
            return qs.filter(doctor_id=doctor_id)
        return qs.none()

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # Profile is view-only in the panel


# ──────────────────────────────────────────────────────────────
# 4. Register to Custom Doctor Admin Site
# ──────────────────────────────────────────────────────────────

doctor_admin_site.register(Doctor, DoctorSelfProfileAdmin)
doctor_admin_site.register(Appointment, DoctorAppointmentAdmin)
