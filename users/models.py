from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ("Admin", "Main Admin"),
        ("Doctor", "Doctor"),
        ("Patient", "Patient"),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="Patient")
    
    GENDER_CHOICES = (("M", "Male"), ("F", "Female"), ("O", "Other"))
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=1, choices=GENDER_CHOICES, null=True, blank=True
    )
    contact_no = models.CharField(max_length=15, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class OTPRecord(models.Model):
    identifier = models.CharField(max_length=255, unique=True)
    otp_hash = models.CharField(max_length=255)
    # NOT auto_now_add — must be updatable when a new OTP is issued
    created_at = models.DateTimeField(default=timezone.now)
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    def __str__(self):
        return self.identifier

