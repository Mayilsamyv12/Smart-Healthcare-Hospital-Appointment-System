from django.contrib import admin

from .models import Appointment, CallbackRequest, Doctor, Hospital, Review, Specialty


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "contact_no", "email")
    search_fields = ("name", "location", "email")
    filter_horizontal = ("specialties",)
    fieldsets = (
        ("Basic Info", {
            "fields": ("name", "about", "image")
        }),
        ("Location", {
            "fields": ("location", "latitude", "longitude")
        }),
        ("Contact", {
            "fields": ("contact_no", "email")
        }),
        ("Specialties", {
            "fields": ("specialties",)
        }),
    )


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("name", "specialty", "hospital", "consultation_fee", "available_days", "shift_start_time")
    list_filter = ("specialty", "hospital")
    search_fields = ("name", "specialty__name")
    list_editable = ("available_days",)
    fieldsets = (
        ("Doctor Info", {
            "fields": ("name", "hospital", "specialty", "image")
        }),
        ("Professional Details", {
            "fields": ("experience", "consultation_fee")
        }),
        ("Availability", {
            "fields": ("available_days", "shift_start_time"),
            "description": "Set the days and shift start time for this doctor."
        }),
    )


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("user", "doctor", "date", "time", "status", "payment_mode")
    list_filter = ("status", "date")
    search_fields = ("user__username", "doctor__name", "patient_name")


@admin.register(CallbackRequest)
class CallbackRequestAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "hospital", "status", "created_at")
    list_filter = ("status", "hospital")
    search_fields = ("name", "phone", "hospital__name")
    list_editable = ("status",)
    readonly_fields = ("created_at", "user")
    ordering = ("-created_at",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "get_target", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("user__username", "hospital__name", "doctor__name", "comment")
    readonly_fields = ("created_at", "user")

    def get_target(self, obj):
        return obj.hospital or obj.doctor
    get_target.short_description = "Hospital / Doctor"
