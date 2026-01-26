from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('hospitals/', views.hospital_list, name='hospital_list'),
    path('hospital/<int:hospital_id>/', views.hospital_detail, name='hospital_detail'),

    path('doctors/', views.doctor_list, name='doctor_list'),
    path('book/<int:doctor_id>/', views.book_appointment, name='book_appointment'),
    path('reminders/', views.reminder_list, name='reminder_list'),
    path('search/', views.search_view, name='search'),
    
    path('about/', views.about, name='about'),
    path('terms/', views.terms, name='terms'),
    path('privacy/', views.privacy, name='privacy'),
    path('contact/', views.contact, name='contact'),
    path('help/', views.help_page, name='help'),
    path('set-location/', views.set_location, name='set_location'),




]
