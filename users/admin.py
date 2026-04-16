from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    
    fieldsets = UserAdmin.fieldsets + (
        ("Profile Information", {"fields": ("role", "age", "gender", "contact_no", "location")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Role Selection", {"fields": ("role",)}),
        ("Profile Information", {"fields": ("age", "gender", "contact_no", "location")}),
    )

