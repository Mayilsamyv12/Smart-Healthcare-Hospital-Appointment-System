import random

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import CustomUser


from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
# Old serializers were moved/refactored

# ──────────────────────────────────────────────────────────────
# Helper: generate & send OTP
# ──────────────────────────────────────────────────────────────
def _generate_otp():
    return str(random.randint(100000, 999999))  # 6-digit OTP

def _send_otp(identifier, otp):
    """Send OTP via SMTP (email) or Twilio SMS (mobile), based on identifier."""
    print(f"\n--- OTP for {identifier}: {otp} ---\n")

    if "@" in identifier:
        # ── Email via SMTP ──
        subject = "Your OneMeds OTP Verification Code"
        message = (
            f"Hello,\n\n"
            f"Your 6-digit OTP verification code is: {otp}\n\n"
            f"This code will expire in 5 minutes. Do not share this with anyone.\n\n"
            f"Best regards,\nThe OneMeds Team"
        )
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [identifier], fail_silently=False)
            return True
        except Exception as e:
            print(f"SMTP Error: {e}")
            return False
    else:
        # ── Mobile via Twilio SMS ──
        account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        auth_token  = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', '')

        if not (account_sid and auth_token and from_number):
            print("[SMS] Twilio credentials not configured.")
            return settings.DEBUG  # succeed silently in DEBUG mode

        # Normalize to E.164
        mobile = identifier.strip().replace("-", "").replace(" ", "")
        if not mobile.startswith("+"):
            if len(mobile) == 10 and mobile.isdigit():
                mobile = f"+91{mobile}"
            elif mobile.startswith("91") and len(mobile) == 12:
                mobile = f"+{mobile}"

        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            msg = client.messages.create(
                body=f"Your OneMeds OTP is {otp}. Valid for 5 minutes. Do not share this.",
                from_=from_number,
                to=mobile,
            )
            print(f"[SMS] Sent. SID: {msg.sid}")
            return True
        except ImportError:
            print("[SMS] Twilio not installed. Run: pip install twilio")
            return settings.DEBUG
        except Exception as e:
            print(f"[SMS] Twilio Error: {e}")
            return False

# ──────────────────────────────────────────────────────────────
# DRF OTP Views (Unified Send & Verify)
# ──────────────────────────────────────────────────────────────

from .serializers import SendOTPSerializer, VerifyOTPSerializer
from .services import process_otp_request, verify_otp_submission

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier']
            
            success, message, dev_otp = process_otp_request(identifier)
            
            if not success:
                # Due to rate limiting or delivery failure
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
                
            return Response({
                "message": message,
                "dev_otp": dev_otp if settings.DEBUG else None
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier']
            otp_val = serializer.validated_data['otp']
            
            is_valid, error = verify_otp_submission(identifier, otp_val)
            if not is_valid:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
                
            # If Valid, Login existing or Create new User
            is_email = "@" in identifier
            if is_email:
                user, created = CustomUser.objects.get_or_create(email=identifier)
            else:
                user, created = CustomUser.objects.get_or_create(contact_no=identifier)
                
            if created:
                # Setup default username
                base_username = identifier.split('@')[0] if is_email else f"user_{identifier[-4:]}"
                username = base_username
                counter = 1
                while CustomUser.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1
                    
                user.username = username
                if is_email:
                    user.email = identifier
                else:
                    user.contact_no = identifier
                    
                user.set_unusable_password()
                user.save()

            # Generate JWT
            refresh = RefreshToken.for_user(user)
            
            # Log the user in for session-based authentication (compatibility with templates)
            login(request, user)
            
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "redirect": "/",
                "message": "User registered successfully." if created else "Login successful.",
                "user": {
                    "username": user.username,
                    "email": user.email,
                    "contact_no": user.contact_no,
                    "is_new": created
                }
            }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# ──────────────────────────────────────────────────────────────
# Template-based views for Django pages
# ──────────────────────────────────────────────────────────────

def login_view(request):
    """Render the OTP login page (React-powered)."""
    if request.user.is_authenticated:
        return redirect("home")
    return render(request, "users/login.html")


def register_view(request):
    """Render the OTP register page (React-powered)."""
    if request.user.is_authenticated:
        return redirect("home")
    return render(request, "users/register.html")


@login_required
def logout_view(request):
    logout(request)
    return redirect("home")


@login_required
def profile_view(request):
    return render(request, "users/profile.html", {"user": request.user})


# ──────────────────────────────────────────────────────────────
# Password Reset (kept for compatibility)
# ──────────────────────────────────────────────────────────────

def forgot_password(request):
    if request.method == "POST":
        identifier = request.POST.get("identifier")
        user = CustomUser.objects.filter(
            Q(email=identifier) | Q(contact_no=identifier)
        ).first()
        if user:
            otp = _generate_otp()
            request.session["reset_otp"] = otp
            request.session["reset_identifier"] = identifier
            
            if not _send_otp(identifier, otp):
                return render(
                    request,
                    "users/forgot_password.html",
                    {"error": "Failed to send OTP. Please check your contact info and backend configuration."},
                )
                
            return redirect("verify_otp")
        else:
            return render(
                request,
                "users/forgot_password.html",
                {"error": "No account found with this email or phone number."},
            )
    return render(request, "users/forgot_password.html")


def verify_otp(request):
    if "reset_identifier" not in request.session:
        return redirect("forgot_password")
    if request.method == "POST":
        user_otp = request.POST.get("otp")
        session_otp = request.session.get("reset_otp")
        if user_otp == session_otp:
            request.session["otp_verified"] = True
            return redirect("reset_password")
        else:
            return render(
                request,
                "users/verify_otp.html",
                {"error": "Invalid OTP. Please try again."},
            )
    return render(request, "users/verify_otp.html")


def reset_password(request):
    if not request.session.get("otp_verified"):
        return redirect("forgot_password")
    if request.method == "POST":
        password = request.POST.get("password")
        confirm_password = request.POST.get("confirm_password")
        if password == confirm_password:
            identifier = request.session.get("reset_identifier")
            user = CustomUser.objects.filter(
                Q(email=identifier) | Q(contact_no=identifier)
            ).first()
            if user:
                user.set_password(password)
                user.save()
            for key in ["reset_otp", "reset_identifier", "otp_verified"]:
                request.session.pop(key, None)
            return redirect("login")
        else:
            return render(
                request,
                "users/reset_password.html",
                {"error": "Passwords do not match."},
            )
    return render(request, "users/reset_password.html")


def activate(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = CustomUser.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
        user = None
    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        return render(request, "users/email_verification_success.html")
    else:
        return render(request, "users/email_verification_failed.html")
