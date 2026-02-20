from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Appointment
from commerce.models import Order
from .integrations import GoogleIntegration

# Initialize Integration (Singleton-ish)
google_integration = GoogleIntegration()

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def send_welcome_email(sender, instance, created, **kwargs):
    if created:
        subject = 'Welcome to OneMeds!'
        message = f"""
        Hi {instance.username},

        Welcome to OneMeds! We are excited to have you on board.
        
        Explore our features:
        - Book appointments with top doctors.
        - Order medicines online.
        - Book lab tests.
        
        Stay healthy!
        The OneMeds Team
        """
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.email])
        except Exception as e:
            print(f"Failed to send welcome email: {e}")

@receiver(post_save, sender=Appointment)
def send_appointment_confirmation(sender, instance, created, **kwargs):
    if created:
        # 1. Send Email
        subject = f'Appointment Confirmation - Dr. {instance.doctor.name}'
        message = f"""
        Dear {instance.user.username},

        Your appointment has been successfully booked!

        Details:
        Doctor: Dr. {instance.doctor.name}
        Specialty: {instance.doctor.specialty}
        Date: {instance.date}
        Time: {instance.time}
        Location: {instance.doctor.hospital.name}, {instance.doctor.hospital.location}

        Please arrive 10 minutes early.

        The OneMeds Team
        """
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.user.email])
        except Exception as e:
            print(f"Failed to send appointment confirmation: {e}")

        # 2. Google Integration (Sheet + Calendar)
        google_integration.add_appointment_to_sheet(instance)
        google_integration.create_calendar_event(instance)

@receiver(post_save, sender=Order)
def send_order_confirmation(sender, instance, created, **kwargs):
    if created:
        # 1. Send Email
        subject = f'Order Confirmation - #{instance.id}'
        message = f"""
        Dear {instance.user.username},

        Thank you for your order!

        Order ID: #{instance.id}
        Total Amount: ₹{instance.total_amount}
        Payment Method: {instance.payment_method}
        Status: {instance.status}

        We will notify you when it ships.

        The OneMeds Team
        """
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.user.email])
        except Exception as e:
            print(f"Failed to send order confirmation: {e}")
            
        # 2. Google Integration (Sheet)
        google_integration.add_order_to_sheet(instance)
