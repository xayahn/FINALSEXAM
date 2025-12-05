from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = 'Ensure ADMIN_USERNAME has ADMIN_PASSWORD; create superuser if missing, update password if user exists.'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        email = os.environ.get('ADMIN_EMAIL', 'layugcyrussjosh@gmail.com')

        if not password:
            self.stdout.write(self.style.WARNING('ADMIN_PASSWORD env var is not set. Skipping update/create.'))
            return

        try:
            user = User.objects.filter(username=username).first()
            if user:
                # Update to the provided password if different
                if not user.check_password(password):
                    user.set_password(password)
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f'Password for user "{username}" updated.'))
                else:
                    self.stdout.write(self.style.WARNING(f'User "{username}" already has this password. No change.'))
            else:
                User.objects.create_superuser(username=username, email=email, password=password)
                self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating/updating user: {e}'))