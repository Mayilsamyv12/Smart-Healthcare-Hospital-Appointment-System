from django.contrib import admin
from .models import Medicine, LabTest, Order, LabCategory

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ('name', 'price')
    search_fields = ('name',)

@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'location', 'category')
    search_fields = ('name', 'location')
    list_filter = ('category',)

@admin.register(LabCategory)
class LabCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'payment_method')
    readonly_fields = ('created_at',)
