from django.db import models
from django.conf import settings

class Hospital(models.Model):
    name = models.CharField(max_length=255)
    specialties = models.TextField(help_text="Comma-separated list of specialties")
    location = models.CharField(max_length=255)
    contact_no = models.CharField(max_length=15)
    image = models.ImageField(upload_to='hospitals/', null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True) 
    longitude = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name

class Doctor(models.Model):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='doctors')
    name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=255)
    experience = models.PositiveIntegerField(help_text="Years of experience")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='doctors/', null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.specialty}"

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Booked', 'Booked'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled')
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Appointment with {self.doctor.name} on {self.date}"
