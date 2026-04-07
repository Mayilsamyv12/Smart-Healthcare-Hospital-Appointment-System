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


# ──────────────────────────────────────────────────────────────
# Helper: generate & print OTP
# ──────────────────────────────────────────────────────────────
def _generate_otp():
    return str(random.randint(100000, 999999))  # 6-digit OTP


def _send_otp(identifier, otp):
    """Print OTP to terminal for development; try email if looks like one."""
    print(f"\n{'='*44}")
    print(f"  OTP FOR  : {identifier}")
    print(f"  CODE     : {otp}")
    print(f"{'='*44}\n")

    if "@" in identifier:
        try:
            send_mail(
                "Your OneMeds OTP",
                f"Your 6-digit OTP is: {otp}\n\nDo not share this with anyone.",
                settings.DEFAULT_FROM_EMAIL,
                [identifier],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Email send failed: {e}")


# ──────────────────────────────────────────────────────────────
# OTP-Based Login API  (JSON)
# ──────────────────────────────────────────────────────────────

@require_POST
def api_login_request_otp(request):
    """Step 1: User enters email/mobile → generate & send OTP."""
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    identifier = body.get("identifier", "").strip()
    if not identifier:
        return JsonResponse({"error": "Email or mobile number is required."}, status=400)

    # Look up the user
    user = CustomUser.objects.filter(
        Q(email=identifier) | Q(contact_no=identifier)
    ).first()

    if not user:
        return JsonResponse({"error": "No account found with this email or phone number."}, status=404)

    otp = _generate_otp()
    request.session["login_otp"] = otp
    request.session["login_identifier"] = identifier

    _send_otp(identifier, otp)

    return JsonResponse({"message": "OTP sent successfully.", "dev_otp": otp})  # Remove dev_otp in production


@require_POST
def api_login_verify_otp(request):
    """Step 2: User submits OTP → log in."""
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    user_otp = body.get("otp", "").strip()
    session_otp = request.session.get("login_otp")
    identifier = request.session.get("login_identifier")

    if not session_otp or not identifier:
        return JsonResponse({"error": "Session expired. Please request a new OTP."}, status=400)

    if user_otp != session_otp:
        return JsonResponse({"error": "Invalid OTP. Please try again."}, status=400)

    # Find & log in the user
    user = CustomUser.objects.filter(
        Q(email=identifier) | Q(contact_no=identifier)
    ).first()

    if not user:
        return JsonResponse({"error": "User not found."}, status=404)

    # Log the user in (Django session)
    user.backend = "django.contrib.auth.backends.ModelBackend"
    login(request, user)

    # Clean up OTP from session
    request.session.pop("login_otp", None)
    request.session.pop("login_identifier", None)

    return JsonResponse({"message": "Login successful.", "redirect": "/"})


# ──────────────────────────────────────────────────────────────
# OTP-Based Register API  (JSON)
# ──────────────────────────────────────────────────────────────

@require_POST
def api_register_request_otp(request):
    """Step 1: Collect user details → validate → send OTP."""
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = body.get("name", "").strip()
    age = body.get("age", "").strip()
    gender = body.get("gender", "").strip()
    location = body.get("location", "").strip()
    identifier = body.get("identifier", "").strip()  # email or mobile

    # Validate
    if not name:
        return JsonResponse({"error": "Full name is required."}, status=400)
    if not identifier:
        return JsonResponse({"error": "Email or mobile number is required."}, status=400)

    # Check if already registered
    existing = CustomUser.objects.filter(
        Q(email=identifier) | Q(contact_no=identifier)
    ).first()
    if existing:
        return JsonResponse({"error": "An account already exists with this email or mobile number."}, status=409)

    # Store data in session for later account creation
    request.session["reg_name"] = name
    request.session["reg_age"] = age
    request.session["reg_gender"] = gender
    request.session["reg_location"] = location
    request.session["reg_identifier"] = identifier

    otp = _generate_otp()
    request.session["reg_otp"] = otp
    _send_otp(identifier, otp)

    return JsonResponse({"message": "OTP sent successfully.", "dev_otp": otp})  # Remove dev_otp in production


@require_POST
def api_register_verify_otp(request):
    """Step 2: Verify OTP → create account."""
    import json
    try:
        body = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    user_otp = body.get("otp", "").strip()
    session_otp = request.session.get("reg_otp")
    identifier = request.session.get("reg_identifier")

    if not session_otp or not identifier:
        return JsonResponse({"error": "Session expired. Please start registration again."}, status=400)

    if user_otp != session_otp:
        return JsonResponse({"error": "Invalid OTP. Please try again."}, status=400)

    # Create the user account
    name = request.session.get("reg_name", "")
    age = request.session.get("reg_age")
    gender = request.session.get("reg_gender")
    location = request.session.get("reg_location", "")

    # Determine username from name (make unique)
    base_username = name.lower().replace(" ", "_")
    username = base_username
    counter = 1
    while CustomUser.objects.filter(username=username).exists():
        username = f"{base_username}_{counter}"
        counter += 1

    user = CustomUser(
        username=username,
        first_name=name,
        location=location if location else None,
        gender=gender if gender else None,
    )

    # Set age
    if age:
        try:
            user.age = int(age)
        except ValueError:
            pass

    # Set email or contact_no
    if "@" in identifier:
        user.email = identifier
    else:
        user.contact_no = identifier

    # Set an unusable password (OTP-only auth)
    user.set_unusable_password()
    user.save()

    # Clean session
    for key in ["reg_name", "reg_age", "reg_gender", "reg_location", "reg_identifier", "reg_otp"]:
        request.session.pop(key, None)

    return JsonResponse({"message": "Account created successfully.", "redirect": "/users/login/"})


# ──────────────────────────────────────────────────────────────
# Template-based views for Django pages
# ──────────────────────────────────────────────────────────────

def login_view(request):
    """Render the OTP login page (React-powered)."""
    return render(request, "users/login.html")


def register_view(request):
    """Render the OTP register page (React-powered)."""
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
            _send_otp(identifier, otp)
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
