from django.contrib import admin
from django.shortcuts import redirect

from .models import (
    Appointment, Doctor, Hospital,
    Review, Prescription, MedicalRecord, AuditLog
)


# ──────────────────────────────────────────────────────────────
# Audit Log Admin (Main Admin only)
# ──────────────────────────────────────────────────────────────

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "timestamp", "ip_address")
    list_filter = ("action", "timestamp")
    search_fields = ("user__username", "action", "details")
    readonly_fields = ("user", "action", "timestamp", "ip_address", "details")


# ──────────────────────────────────────────────────────────────
# 1. Custom Doctor Admin Site
#    — Always redirects to /doctor-login/ (never shows Django form)
#    — Checks session for doctor_id_verified + current_doctor_id
# ──────────────────────────────────────────────────────────────

class DoctorAdminSite(admin.AdminSite):
    site_header = "OneMeds Doctor Portal"
    site_title = "Doctor Portal"
    index_title = "Manage Your Appointments & Prescriptions"

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
        ("Contact", {"fields": ("contact_no", "email")}),
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
            "fields": ("available_days", "shift_start_time", "unavailable_dates"),
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
    list_display = ("user", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("user__username", "hospital__name", "doctor__name", "comment")
    readonly_fields = ("created_at", "user")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("get_doctor_id", "patient", "doctor", "appointment", "created_at")
    search_fields = ("doctor__doctor_id", "doctor__name", "patient__username", "diagnosis")
    readonly_fields = ("created_at", "updated_at")
    list_filter = ("doctor",)

    def get_doctor_id(self, obj):
        return obj.doctor.doctor_id if obj.doctor else "—"
    get_doctor_id.short_description = "Doctor ID"


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ("title", "patient", "doctor", "record_type", "uploaded_at")
    list_filter = ("record_type", "doctor")
    search_fields = ("title", "patient__username", "doctor__name")
    readonly_fields = ("uploaded_at",)


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


class DoctorPrescriptionAdmin(DoctorFilteredAdmin):
    list_display = ("patient", "get_patient_name", "appointment", "created_at")
    search_fields = ("patient__username", "diagnosis", "symptoms")
    readonly_fields = ("doctor", "appointment", "patient", "created_at", "updated_at")
    fieldsets = (
        ("Prescription Info", {
            "fields": ("doctor", "patient", "appointment")
        }),
        ("Clinical Details", {
            "fields": ("symptoms", "diagnosis", "medicines", "instructions")
        }),
        ("Attachments", {
            "fields": ("digital_signature",)
        }),
    )

    def get_patient_name(self, obj):
        appt = obj.appointment
        return appt.patient_name if appt else "—"
    get_patient_name.short_description = "Patient Name"


class DoctorMedicalRecordAdmin(DoctorFilteredAdmin):
    list_display = ("title", "patient", "record_type", "uploaded_at")
    list_filter = ("record_type",)
    search_fields = ("title", "patient__username")
    readonly_fields = ("doctor", "uploaded_at")


class DoctorSelfProfileAdmin(admin.ModelAdmin):
    """
    Allows the logged-in doctor to view their own profile (read-only).
    Profile is identified by session's current_doctor_id — no user link needed.
    """
    readonly_fields = (
        "doctor_id", "name", "hospital", "specialty",
        "experience", "consultation_fee",
        "available_days", "shift_start_time", "unavailable_dates", "image"
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
            "fields": ("available_days", "shift_start_time", "unavailable_dates")
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
doctor_admin_site.register(Prescription, DoctorPrescriptionAdmin)
doctor_admin_site.register(MedicalRecord, DoctorMedicalRecordAdmin)
