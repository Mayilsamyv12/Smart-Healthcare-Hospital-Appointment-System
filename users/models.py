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
    contact_no = models.CharField(max_length=15, unique=True, null=True, blank=True)
    country_code = models.CharField(max_length=5, default="+91")
    location = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"



