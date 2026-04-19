from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings


class Command(BaseCommand):
    help = 'Creates (or resets) the shared Doctor Portal login account used by all doctors.'

    def handle(self, *args, **options):
        User = get_user_model()
        username = settings.DOCTOR_PORTAL_USERNAME
        password = settings.DOCTOR_PORTAL_PASSWORD

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'is_staff': True,       # Required for Django admin site access
                'is_active': True,
                'role': 'Doctor',
                'first_name': 'Doctor',
                'last_name': 'Portal',
            }
        )
        # Always update password & staff flag in case they changed
        user.set_password(password)
        user.is_staff = True
        user.is_active = True
        user.save()

        status = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(
            f'\n[SUCCESS] {status} shared Doctor Portal user.\n'
            f'   Username : {username}\n'
            f'   Password : {password}\n'
            f'\nShare these credentials with ALL your doctors.\n'
            f'Each doctor uses their unique Doctor ID to access their own workspace.\n'
        ))
