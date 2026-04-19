from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .api_views import (
    # Auth
    DoctorLoginView,
    DoctorIDVerifyView,
    # Admin Doctor Management
    AdminDoctorViewSet,
    # Doctor
    DoctorViewSet,
    DoctorProfileView,
    DoctorDashboardView,
    DoctorSlotsView,
    # Appointments
    AppointmentViewSet,
    # Patient
    PatientDashboardView,
)

# ── DRF Router ──────────────────────────────────────────────
router = DefaultRouter()
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'admin/doctors', AdminDoctorViewSet, basename='admin-doctor')

urlpatterns = [
    # ── Standard JWT (for patients / OTP flow) ──────────────
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Doctor 2-Step Auth ───────────────────────────────────
    # Step 1: POST username + password → JWT
    path('auth/doctor-login/', DoctorLoginView.as_view(), name='doctor_login'),
    # Step 2: POST doctor_id → session verified → grants /doctor-panel/ access
    path('auth/verify-doctor-id/', DoctorIDVerifyView.as_view(), name='verify_doctor_id'),

    # ── Doctor Panel ─────────────────────────────────────────
    # Doctor's own profile (GET/PATCH)
    path('doctor/profile/', DoctorProfileView.as_view(), name='doctor_profile_api'),
    # Doctor's aggregated dashboard stats
    path('doctor/dashboard/', DoctorDashboardView.as_view(), name='doctor_dashboard'),
    # Available slots for a specific doctor on a date
    path('doctor/<int:doctor_id>/slots/', DoctorSlotsView.as_view(), name='doctor_slots'),

    # ── Patient Panel ─────────────────────────────────────────
    # Patient's aggregated dashboard (appointments)
    path('patient/dashboard/', PatientDashboardView.as_view(), name='patient_dashboard'),

    # ── Home page data (existing) ─────────────────────────────
    path('home/', include('core.home_api_urls')),

    # ── Lab APIs ──────────────────────────────────────────────
    path('commerce/', include('commerce.api_urls')),

    # ── Router-registered ViewSets ────────────────────────────
    path('', include(router.urls)),
]
