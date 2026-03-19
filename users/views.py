import random

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import redirect, render
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from .forms import CustomAuthenticationForm, CustomUserCreationForm
from .models import CustomUser


def register_view(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            # login(request, user) # Optional: Auto-login
            return redirect("login")

    else:
        form = CustomUserCreationForm()
    return render(request, "users/register.html", {"form": form})


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


def login_view(request):
    if request.method == "POST":
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect("home")
    else:
        form = CustomAuthenticationForm()
    return render(request, "users/login.html", {"form": form})


@login_required
def logout_view(request):
    logout(request)
    return redirect("home")


@login_required
def profile_view(request):
    return render(request, "users/profile.html", {"user": request.user})


def forgot_password(request):
    if request.method == "POST":
        identifier = request.POST.get("identifier")
        user = CustomUser.objects.filter(
            Q(email=identifier) | Q(contact_no=identifier)
        ).first()
        if user:
            otp = str(random.randint(1000, 9999))
            request.session["reset_otp"] = otp
            request.session["reset_identifier"] = identifier

            # Print the OTP cleanly in the terminal so we can always test it locally!
            print(f"\n======================================")
            print(f"OTP FOR {identifier} IS: {otp}")
            print(f"======================================\n")

            # Try to send email if it resembles an email
            if "@" in identifier:
                try:
                    send_mail(
                        "Your Password Reset OTP",
                        f"Your 4-digit OTP for password reset is: {otp}",
                        settings.DEFAULT_FROM_EMAIL,
                        [identifier],
                        fail_silently=False,
                    )
                except Exception as e:
                    print(
                        f"Failed to send email: {e} (Please check your settings.py app password)"
                    )
            else:
                print(
                    f"Simulating SMS to {identifier} with OTP: {otp}. Integrate Twilio for live SMS."
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
            # Clean up session
            if "reset_otp" in request.session:
                del request.session["reset_otp"]
            if "reset_identifier" in request.session:
                del request.session["reset_identifier"]
            if "otp_verified" in request.session:
                del request.session["otp_verified"]
            return redirect("login")
        else:
            return render(
                request,
                "users/reset_password.html",
                {"error": "Passwords do not match."},
            )

    return render(request, "users/reset_password.html")
