from rest_framework import serializers
from .models import LabTest, LabAppointment, LabReview, Order
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'contact_no', 'age', 'gender', 'location']

class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = [
            'id', 'name', 'about', 'location', 'contact_no',
            'latitude', 'longitude', 'image',
            'shift_start_time', 'shift_end_time',
            'slot_duration_minutes', 'patients_per_slot',
            'available_days', 'unavailable_dates', 'weekly_schedule',
            'avg_rating', 'review_count'
        ]

class LabAppointmentSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    lab_test = LabTestSerializer(read_only=True)
    
    class Meta:
        model = LabAppointment
        fields = ['id', 'user', 'lab_test', 'date', 'time', 'status', 'created_at']

class LabReviewSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = LabReview
        fields = ['id', 'user', 'rating', 'comment', 'created_at']

class OrderSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'items', 'total_amount',
            'house_no', 'street', 'landmark', 'pincode', 'city',
            'payment_method', 'status', 'is_paid', 'created_at'
        ]
