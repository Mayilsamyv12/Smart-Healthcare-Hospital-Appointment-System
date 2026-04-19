from django.urls import path
from . import views

urlpatterns = [
    # Template pages (React-powered containers)
    path("login/", views.login_view, name="login"),
    path("register/", views.register_view, name="register"),
    path("logout/", views.logout_view, name="logout"),

    path("forgot-password/", views.forgot_password, name="forgot_password"),

    # Password-Based API endpoints (DRF)
    path("api/login/", views.LoginAPIView.as_view(), name="api_login"),
    path("api/register/", views.RegisterAPIView.as_view(), name="api_register"),
    path("api/reset-password/", views.ResetPasswordAPIView.as_view(), name="api_reset_password"),
]
