from django.urls import path

from . import views

urlpatterns = [
    # Template pages (React-powered)
    path("login/", views.login_view, name="login"),
    path("register/", views.register_view, name="register"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
    path("forgot-password/", views.forgot_password, name="forgot_password"),
    path("verify-otp/", views.verify_otp, name="verify_otp"),
    path("reset-password/", views.reset_password, name="reset_password"),

    # Unified OTP API endpoints (DRF)
    path("api/send-otp/", views.SendOTPView.as_view(), name="api_send_otp"),
    path("api/verify-otp/", views.VerifyOTPView.as_view(), name="api_verify_otp"),
]
