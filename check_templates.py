import os
import django
from django.conf import settings
from django.template.loader import get_template

def check_templates():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    settings.configure(
        DEBUG=True,
        SECRET_KEY='secret',
        ROOT_URLCONF=__name__,
        INSTALLED_APPS=[
            'django.contrib.admin',
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'django.contrib.sessions',
            'django.contrib.messages',
            'django.contrib.staticfiles',
            'core',
            'commerce',
            'users',
        ],
        TEMPLATES=[{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [os.path.join(BASE_DIR, 'templates')],
            'APP_DIRS': True,
        }],
    )
    django.setup()

    has_error = False
    template_dirs = [os.path.join(BASE_DIR, 'templates')]
    print("Checking templates...")
    
    for template_dir in template_dirs:
        for root, dirs, files in os.walk(template_dir):
            for file in files:
                if file.endswith('.html'):
                    path = os.path.join(root, file)
                    rel_path = os.path.relpath(path, template_dir)
                    template_name = rel_path.replace(os.sep, '/')
                    try:
                        get_template(template_name)
                    except Exception as e:
                        print(f"ERROR in {template_name}: {e}")
                        has_error = True

    if not has_error:
        print("All templates syntax valid.")

if __name__ == "__main__":
    check_templates()
