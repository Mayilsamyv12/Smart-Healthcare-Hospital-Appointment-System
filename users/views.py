from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from .models import CustomUser

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, LoginSerializer

# ──────────────────────────────────────────────────────────────
# DRF Authentication Views (Password-Based)
# ──────────────────────────────────────────────────────────────

class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT
            refresh = RefreshToken.for_user(user)
            
            # Log the user in for session-based authentication
            login(request, user)
            
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "redirect": "/",
                "message": "User registered successfully.",
                "user": {
                    "username": user.username,
                    "contact_no": user.contact_no,
                    "role": user.role
                }
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            contact_no = serializer.validated_data['contact_no']
            password = serializer.validated_data['password']
            
            # Find user by contact_no or username
            user = CustomUser.objects.filter(
                Q(contact_no=contact_no) | Q(username=contact_no)
            ).first()
            
            if user and user.check_password(password):
                # Generate JWT
                refresh = RefreshToken.for_user(user)
                
                # Log the user in for session-based authentication
                login(request, user)
                
                return Response({
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "redirect": "/",
                    "message": "Login successful.",
                    "user": {
                        "username": user.username,
                        "contact_no": user.contact_no,
                        "role": user.role
                    }
                }, status=status.HTTP_200_OK)
            
            return Response({"error": "Invalid mobile or password."}, status=status.HTTP_401_UNAUTHORIZED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class ResetPasswordAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        contact_no = request.data.get('contact_no')
        name = request.data.get('name')
        new_password = request.data.get('new_password')

        if not contact_no or not name or not new_password:
            return Response({"error": "Please provide mobile number, name, and new password."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify user exists with this contact_no and name (first_name)
        user = CustomUser.objects.filter(contact_no=contact_no, first_name=name).first()

        if user:
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password updated successfully. You can now login."}, status=status.HTTP_200_OK)
        
        return Response({"error": "User not found with these details."}, status=status.HTTP_404_NOT_FOUND)

# ──────────────────────────────────────────────────────────────
# Template-based views for Django pages
# ──────────────────────────────────────────────────────────────

def login_view(request):
    """Render the login page (React-powered)."""
    if request.user.is_authenticated:
        return redirect("/")
    return render(request, "users/login.html")


def register_view(request):
    """Render the register page (React-powered)."""
    if request.user.is_authenticated:
        return redirect("/")
    return render(request, "users/register.html")


@login_required
def logout_view(request):
    logout(request)
    return redirect("/")




# ──────────────────────────────────────────────────────────────
# Password Reset (Stubbed for future use)
# ──────────────────────────────────────────────────────────────

def forgot_password(request):
    # This would now use standard email links instead of OTP
    return render(request, "users/forgot_password.html")


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
