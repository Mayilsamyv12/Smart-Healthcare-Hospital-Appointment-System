from django.contrib import admin

from .models import LabAppointment, LabReview, LabTest, Medicine, Order


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "strip_count")
    search_fields = ("name",)


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ("name", "lab_id", "location", "contact_no", "shift_start_time", "shift_end_time")
    search_fields = ("name", "lab_id", "location", "contact_no")
    fieldsets = (
        ("Basic Info", {
            "fields": ("name", "lab_id", "about", "location", "contact_no", "image")
        }),
        ("Map Details", {
            "fields": ("latitude", "longitude")
        }),
        ("Availability & Slots", {
            "fields": ("available_days", "shift_start_time", "shift_end_time", "slot_duration_minutes", "patients_per_slot", "unavailable_dates", "weekly_schedule"),
            "description": "Configure the lab's working hours and patient capacity per slot."
        }),
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "total_amount", "status", "created_at")
    list_filter = ("status", "payment_method")
    readonly_fields = ("created_at",)


@admin.register(LabAppointment)
class LabAppointmentAdmin(admin.ModelAdmin):
    list_display = ("lab_test", "user", "date", "time", "status")
    list_filter = ("status", "date", "lab_test")
    search_fields = ("lab_test__name", "user__username")
    list_editable = ("status",)
    date_hierarchy = "date"


@admin.register(LabReview)
class LabReviewAdmin(admin.ModelAdmin):
    list_display = ("lab", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("lab__name", "user__username", "comment")
