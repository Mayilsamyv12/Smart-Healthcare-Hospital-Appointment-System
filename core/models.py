from django.conf import settings
from django.db import models
from django.db.models import Avg



class Hospital(models.Model):
    name = models.CharField(max_length=255)
    about = models.TextField(blank=True, null=True)

    location = models.CharField(max_length=255)
    contact_no = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    image = models.ImageField(upload_to="hospitals/", null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name

    def avg_rating(self):
        result = self.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result else None

    def review_count(self):
        return self.reviews.count()


class Doctor(models.Model):
    # Doctors are identified by doctor_id only.
    # No per-doctor user account — all doctors share one portal login,
    # then enter their unique Doctor ID to access their workspace.
    doctor_id = models.CharField(
        max_length=20,
        unique=True,
        null=True,  # null=True keeps existing DB rows valid
        help_text="Enter a unique Doctor ID manually (e.g. DOC-1001)"
    )
    is_active = models.BooleanField(default=True)

    hospital = models.ForeignKey(
        Hospital, on_delete=models.CASCADE, related_name="doctors"
    )
    name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=255, null=True, blank=True)
    experience = models.PositiveIntegerField(help_text="Years of experience")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    shift_start_time = models.TimeField(
        default="09:00:00", help_text="Start time of shift"
    )
    shift_end_time = models.TimeField(
        default="12:00:00", help_text="End time of shift"
    )
    slot_duration_minutes = models.PositiveIntegerField(
        default=15, help_text="Duration of each slot in minutes"
    )
    patients_per_slot = models.PositiveIntegerField(
        default=3, help_text="Max patients allowed per time slot"
    )
    available_days = models.CharField(
        max_length=100,
        default="Mon, Wed, Fri",
        help_text="Comma-separated days e.g. Mon, Tue, Wed"
    )
    unavailable_dates = models.TextField(blank=True, null=True, help_text="Comma-separated dates doctor is on leave (YYYY-MM-DD)")
    weekly_schedule = models.JSONField(
        default=dict,
        blank=True,
        help_text="Day-wise schedule configurations"
    )
    image = models.ImageField(upload_to="doctors/", null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.doctor_id or 'No ID'})"

    def avg_rating(self):
        result = self.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result else None

    def review_count(self):
        return self.reviews.count()

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class Appointment(models.Model):
    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_appointments")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="appointments")
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")

    patient_name = models.CharField(max_length=255, null=True, blank=True)
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    patient_problem = models.TextField(null=True, blank=True)
    patient_contact = models.CharField(max_length=15, null=True, blank=True)
    patient_location = models.CharField(max_length=255, null=True, blank=True)
    payment_mode = models.CharField(max_length=50, default="Cash on hand")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_updated_by = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return f"Appt: {self.patient_name} with {self.doctor.name} on {self.date}"



class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user} - {self.action} @ {self.timestamp}"



class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, null=True, blank=True, related_name="reviews")
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, null=True, blank=True, related_name="reviews")
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        target = self.hospital or self.doctor
        return f"Review by {self.user.username} for {target} — {self.rating}★"

    class Meta:
        ordering = ["-created_at"]

