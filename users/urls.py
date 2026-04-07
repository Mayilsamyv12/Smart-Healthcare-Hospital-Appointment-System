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

    # OTP API endpoints (JSON)
    path("api/login/request-otp/", views.api_login_request_otp, name="api_login_request_otp"),
    path("api/login/verify-otp/", views.api_login_verify_otp, name="api_login_verify_otp"),
    path("api/register/request-otp/", views.api_register_request_otp, name="api_register_request_otp"),
    path("api/register/verify-otp/", views.api_register_verify_otp, name="api_register_verify_otp"),
]
