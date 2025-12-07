import os
import mimetypes
import dj_database_url
from pathlib import Path

# WINDOWS FIX
mimetypes.add_type("text/css", ".css", True)
mimetypes.add_type("text/javascript", ".js", True)

BASE_DIR = Path(__file__).resolve().parent.parent
# Read sensitive settings from environment so Render can configure them securely
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-me-for-production')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
# ALLOWED_HOSTS should be a comma-separated list in Render (or '*' for testing)
# Parse env var robustly and normalise values (remove scheme and trailing slashes).
import re
import ast

_raw_allowed = os.environ.get('ALLOWED_HOSTS', '*')
def _clean_host(h: str) -> str:
    h = h.strip()
    # remove http:// or https:// if present
    h = re.sub(r'^https?://', '', h)
    # remove trailing slash
    return h.rstrip('/')

if _raw_allowed is None or _raw_allowed == '':
    ALLOWED_HOSTS = []
elif _raw_allowed.strip() == '*':
    ALLOWED_HOSTS = ['*']
else:
    # allow JSON-like list in env, or comma-separated string
    try:
        parsed = ast.literal_eval(_raw_allowed)
        if isinstance(parsed, (list, tuple)):
            ALLOWED_HOSTS = [_clean_host(x) for x in parsed if x]
        else:
            ALLOWED_HOSTS = [_clean_host(x) for x in str(_raw_allowed).split(',') if x.strip()]
    except Exception:
        ALLOWED_HOSTS = [_clean_host(x) for x in str(_raw_allowed).split(',') if x.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves static files directly from Gunicorn in production
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# POSTGRESQL DATABASE
# Replace your existing DATABASES block with this in backend/settings.py

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get(
            'DATABASE_URL',
            'sqlite:///' + os.path.join(BASE_DIR, 'db.sqlite3')
        ),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'

# This tells Django where to put files when running 'collectstatic'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Optional: Place for extra static files if you have them
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media (user uploaded) files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Use WhiteNoise storage backend for compressed static files in production
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Security-related defaults (can be overridden via environment variables on Render)
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False') == 'True'
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    "https://finalsexam-1.onrender.com", # Your FRONTEND URL (no trailing slash)
]

CORS_ALLOW_CREDENTIALS = True