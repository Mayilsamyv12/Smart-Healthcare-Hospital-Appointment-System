from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# Customize Django admin panel
admin.site.site_header = "OneMeds Administration"
admin.site.site_title = "OneMeds Admin Portal"
admin.site.index_title = "Welcome to OneMeds Admin Portal"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("users/", include("users.urls")),
    path("", include("core.urls")),
    path("commerce/", include("commerce.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(
        settings.STATIC_URL, document_root=settings.BASE_DIR / "static"
    )
