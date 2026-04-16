"""
Home page API URLs — separated to keep api_urls.py clean.
These are served under /api/home/ via the main api_urls.py include.
"""
from django.urls import path
from core.views import api_home

urlpatterns = [
    path('', api_home, name='api_home_data'),
]
