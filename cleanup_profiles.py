import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_project.settings')
django.setup()

from core.models import Doctor

def cleanup_admin_doctor_profiles():
    # Find all doctors whose linked user has the 'Admin' role
    admins_with_profiles = Doctor.objects.filter(user__role="Admin")
    count = admins_with_profiles.count()
    
    if count > 0:
        print(f"🧹 Found {count} Doctor profile(s) linked to Admin users. Deleting...")
        for doc in admins_with_profiles:
            print(f" - Deleting profile for: {doc.user.username}")
            doc.delete()
        print("✅ Cleanup complete.")
    else:
        print("✨ No Admin users have Doctor profiles. All clean!")

if __name__ == "__main__":
    cleanup_admin_doctor_profiles()
