from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import LabTestViewSet, LabAppointmentViewSet, LabAdminDashboardView, LabIDVerifyView

router = DefaultRouter()
router.register(r'labs', LabTestViewSet, basename='lab')
router.register(r'lab-appointments', LabAppointmentViewSet, basename='lab-appointment')

urlpatterns = [
    path('dashboard/', LabAdminDashboardView.as_view(), name='lab_admin_dashboard'),
    path('verify-lab-id/', LabIDVerifyView.as_view(), name='verify_lab_id'),
    path('', include(router.urls)),
]
