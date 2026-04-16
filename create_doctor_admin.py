import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'healthcare_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Doctor, Hospital, Specialty

User = get_user_model()

def create_doctor_superuser():
    username = "dr_admin"
    email = "dr_admin@onemeds.com"
    password = "adminpassword123"

    # 1. Create Superuser
    user, created = User.objects.get_or_create(username=username)
    if created or not user.is_superuser:
        user.set_password(password)
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"✅ Superuser '{username}' created/updated.")
    else:
        print(f"ℹ️ Superuser '{username}' already exists.")

    # 2. Ensure Specialties exist
    specialty, _ = Specialty.objects.get_or_create(name="General Physician")

    # 3. Ensure Hospital exists
    hospital, _ = Hospital.objects.get_or_create(
        name="Apollo Hospital",
        defaults={'location': 'Chennai', 'contact_no': '1234567890'}
    )

    # 4. Create Doctor Profile
    doctor, created = Doctor.objects.get_or_create(
        user=user,
        defaults={
            'hospital': hospital,
            'name': 'Admin Doctor',
            'specialty': specialty,
            'experience': 10,
            'consultation_fee': 500,
            'available_days': 'Mon, Tue, Wed, Thu, Fri',
        }
    )

    if created:
        print(f"✅ Doctor profile created for '{username}'.")
    else:
        print(f"ℹ️ Doctor profile for '{username}' already exists.")

    print("\n" + "="*40)
    print("LOGIN CREDENTIALS")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Doctor Panel: http://127.0.0.1:8000/doctor-panel/")
    print("="*40)

if __name__ == "__main__":
    create_doctor_superuser()
