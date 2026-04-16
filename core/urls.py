from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    # Note: /api/home/ is now served via api_urls.py → home_api_urls.py
    path("api/hospitals/", views.api_hospitals, name="api_hospitals"),
    path("api/doctors/", views.api_doctors, name="api_doctors"),
    path("hospitals/", views.hospital_list, name="hospital_list"),
    path("hospital/<int:hospital_id>/", views.hospital_detail, name="hospital_detail"),

    path("doctors/", views.doctor_list, name="doctor_list"),
    path("doctor/<int:doctor_id>/", views.doctor_profile, name="doctor_profile"),
    path("book/<int:doctor_id>/", views.book_appointment, name="book_appointment"),
    path("reminders/", views.reminder_list, name="reminder_list"),
    path("search/", views.search_view, name="search"),
    path("api/profile-data/", views.api_profile_data, name="api_profile_data"),
    path("about/", views.about, name="about"),
    path("terms/", views.terms, name="terms"),
    path("privacy/", views.privacy, name="privacy"),
    path("contact/", views.contact, name="contact"),
    path("help/", views.help_page, name="help"),
    path("set-location/", views.set_location, name="set_location"),
    path("reviews/submit/", views.submit_review, name="submit_review"),
    path("reviews/<int:review_id>/edit/", views.edit_review, name="edit_review"),
    path("reviews/<int:review_id>/delete/", views.delete_review, name="delete_review"),
    
    # React Client-Side Routes
    path("patient/dashboard", views.home, name="patient_dashboard_react"),
    path("patient/dashboard/", views.home, name="patient_dashboard_react_slash"),
    # Patient Profile (React SPA)
    path("patient/profile", views.home, name="patient_profile_react"),
    path("patient/profile/", views.home, name="patient_profile_react_slash"),
    # Doctor login page (renders React 2-step auth UI)
    path("doctor-login/", views.doctor_login_page, name="doctor_login_page"),
    # Doctor Admin Panel (React SPA — isolated from patient layout)
    path("doctor-panel/", views.home, name="doctor_panel_react"),
    path("doctor-panel", views.home, name="doctor_panel_react_noslash"),
]
