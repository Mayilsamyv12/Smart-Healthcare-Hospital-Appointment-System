import secrets
import random
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings
from .models import CustomUser, OTPRecord
from rest_framework.exceptions import ValidationError

# Optional: Using django-otp for true hardware token/HOTP style logic, 
# but for custom database storage + expiration, we implement secure manual logic:

def generate_secure_otp():
    """Generates a secure 6-digit numeric OTP."""
    return str(secrets.randbelow(900000) + 100000)

def send_otp_via_smtp(email, otp):
    """Sends the actual OTP via SMTP to the given email."""
    subject = "Your Authentication OTP"
    message = f"Your 6-digit OTP is: {otp}\n\nIt will expire in 5 minutes. Do not share it with anyone."
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

def _normalize_mobile(mobile):
    """Normalize mobile number to E.164 format for Twilio."""
    # Strip whitespace and dashes
    mobile = mobile.strip().replace("-", "").replace(" ", "")
    # Already in E.164 format
    if mobile.startswith("+"):
        return mobile
    # Indian 10-digit number
    if len(mobile) == 10 and mobile.isdigit():
        return f"+91{mobile}"
    # Indian number with country code without +
    if mobile.startswith("91") and len(mobile) == 12:
        return f"+{mobile}"
    # Return as-is and let Twilio validate
    return mobile

def send_otp_via_sms(mobile, otp):
    """Sends an SMS OTP via Twilio. Falls back to console print in DEBUG mode."""
    normalized = _normalize_mobile(mobile)
    print(f"\n--- SMS OTP ---")
    print(f"To: {normalized}")
    print(f"OTP: {otp} (Valid for 5 minutes)")
    print(f"---------------\n")

    # Check Twilio configuration
    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', '')

    if not account_sid or not auth_token or not from_number:
        print("[SMS] Twilio credentials not configured. OTP printed to console only.")
        return settings.DEBUG  # succeed silently in DEBUG mode

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=f"Your OneMeds OTP is {otp}. Valid for 5 minutes. Do not share this with anyone.",
            from_=from_number,
            to=normalized
        )
        print(f"[SMS] Sent successfully. SID: {message.sid}")
        return True
    except ImportError:
        print("[SMS] Twilio library not installed. Run: pip install twilio")
        return settings.DEBUG
    except Exception as e:
        print(f"[SMS] Twilio Error: {e}")
        return False

def process_otp_request(identifier):
    """
    Handles rate-limiting and generating OTP.
    Returns (success_bool, message, dev_otp)
    """
    now = timezone.now()
    
    # Get or create an OTP record for the identifier (handle rate limiting / max attempts)
    record, created = OTPRecord.objects.get_or_create(identifier=identifier)
    
    if not created:
        # Check rate limit: Prevent requesting too often (e.g. 1 minute cooldown)
        if record.created_at >= now - timedelta(minutes=1):
            return False, "Please wait before requesting another OTP.", None
            
        # Reset if it's a new request past the cooldown
        record.attempts = 0
        record.is_verified = False

    plain_otp = generate_secure_otp()
    record.otp_hash = make_password(plain_otp)
    record.created_at = now
    record.is_verified = False
    record.save()
    
    # Dispatch
    is_email = "@" in identifier
    if is_email:
        delivered = send_otp_via_smtp(identifier, plain_otp)
    else:
        delivered = send_otp_via_sms(identifier, plain_otp)
        
    if not delivered:
        return False, "Failed to deliver OTP. Please verify your contact information.", None
        
    return True, "OTP sent successfully.", plain_otp

def verify_otp_submission(identifier, plain_otp):
    """
    Verifies the OTP against max attempts, expiration, and hashes.
    Returns (is_valid, error_message)
    """
    now = timezone.now()
    
    try:
        record = OTPRecord.objects.get(identifier=identifier)
    except OTPRecord.DoesNotExist:
        return False, "OTP not requested or expired."
        
    if record.is_verified:
        return False, "OTP has already been verified."
        
    if record.attempts >= 3:
        record.delete()  # Clear record after max attempts
        return False, "Maximum attempts reached. Please request a new OTP."
        
    if record.created_at < now - timedelta(minutes=5):
        record.delete()  # Expired
        return False, "OTP has expired. Please request a new one."
        
    if not check_password(plain_otp, record.otp_hash):
        record.attempts += 1
        record.save()
        return False, f"Invalid OTP. {3 - record.attempts} attempts remaining."
        
    # Mark as verified
    record.is_verified = True
    record.save()
    return True, None
