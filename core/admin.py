from django.contrib import admin
from .models import Hospital, Doctor, Appointment

@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'contact_no')
    search_fields = ('name', 'location')

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('name', 'specialty', 'hospital', 'consultation_fee')
    list_filter = ('specialty', 'hospital')
    search_fields = ('name', 'specialty')

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'doctor', 'date', 'time', 'status')
    list_filter = ('status', 'date')
