from django.conf import settings
from django.db import models
from django.db.models import Avg


class Specialty(models.Model):
    name = models.CharField(max_length=100)
    icon = models.ImageField(upload_to="specialties/", null=True, blank=True)
    slug = models.SlugField(unique=True, null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Specialties"


class Hospital(models.Model):
    name = models.CharField(max_length=255)
    about = models.TextField(blank=True, null=True)
    # Changed from TextField to ManyToMany
    specialties = models.ManyToManyField(
        Specialty, blank=True, related_name="hospitals"
    )
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
    hospital = models.ForeignKey(
        Hospital, on_delete=models.CASCADE, related_name="doctors"
    )
    name = models.CharField(max_length=255)
    # Changed from CharField to ForeignKey. nullable for migration.
    specialty = models.ForeignKey(
        Specialty, on_delete=models.SET_NULL, null=True, related_name="doctors"
    )
    experience = models.PositiveIntegerField(help_text="Years of experience")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    shift_start_time = models.TimeField(
        default="09:00:00", help_text="Start time of 3-hour shift"
    )
    available_days = models.CharField(
        max_length=100,
        default="Mon, Wed, Fri",
        help_text="Comma-separated days e.g. Mon, Tue, Wed"
    )
    image = models.ImageField(upload_to="doctors/", null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.specialty}"

    def avg_rating(self):
        result = self.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result else None

    def review_count(self):
        return self.reviews.count()


class Appointment(models.Model):
    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Booked", "Booked"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")

    patient_name = models.CharField(max_length=255, null=True, blank=True)
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    patient_problem = models.TextField(null=True, blank=True)
    patient_contact = models.CharField(max_length=15, null=True, blank=True)
    patient_location = models.CharField(max_length=255, null=True, blank=True)
    payment_mode = models.CharField(max_length=50, choices=(("Cash on hand", "Cash on hand"), ("Razorpay", "Razorpay")), default="Cash on hand")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Appointment with {self.doctor.name} on {self.date}"


class CallbackRequest(models.Model):
    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Called", "Called"),
        ("Closed", "Closed"),
    )
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="callback_requests")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15)
    message = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Callback: {self.name} → {self.hospital.name} [{self.status}]"

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Callback Request"
        verbose_name_plural = "Callback Requests"


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
