from rest_framework import serializers
from .models import Doctor, Appointment, Hospital
from django.contrib.auth import get_user_model

User = get_user_model()


# ──────────────────────────────────────────────────────────────
# User Serializers
# ──────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'contact_no', 'age', 'gender', 'location', 'role'
        ]
        read_only_fields = ['id', 'username', 'role']


class PatientSummarySerializer(serializers.ModelSerializer):
    """Lightweight patient info for doctor-facing views."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'contact_no', 'age', 'gender', 'location']


# ──────────────────────────────────────────────────────────────
# Hospital & Specialty Serializers
# ──────────────────────────────────────────────────────────────


class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'location', 'contact_no']


# ──────────────────────────────────────────────────────────────
# Doctor Serializers
# ──────────────────────────────────────────────────────────────

class DoctorSerializer(serializers.ModelSerializer):
    hospital = HospitalSerializer(read_only=True)
    class Meta:
        model = Doctor
        fields = [
            'id', 'doctor_id', 'name', 'hospital', 'specialty',
            'experience', 'consultation_fee', 'is_active',
            'available_days', 'shift_start_time', 'shift_end_time', 'slot_duration_minutes', 'patients_per_slot', 'unavailable_dates', 'weekly_schedule',
            'image', 'avg_rating', 'review_count'
        ]
        # doctor_id is set by admin — writable via API too
        read_only_fields = ['id']

    def get_avg_rating(self, obj):
        return obj.avg_rating()

    def get_review_count(self, obj):
        return obj.review_count()


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    """Allows doctors to update only their own profile fields (not doctor_id)."""
    class Meta:
        model = Doctor
        fields = [
            'name', 'image', 'experience', 'consultation_fee',
            'available_days', 'shift_start_time', 'shift_end_time', 'slot_duration_minutes', 'patients_per_slot', 'unavailable_dates', 'weekly_schedule'
        ]


class DoctorCreateSerializer(serializers.ModelSerializer):
    """
    Admin-only: Create a Doctor record with a manually assigned Doctor ID.
    No user account is created — all doctors share the portal login.
    """
    hospital_id = serializers.PrimaryKeyRelatedField(
        queryset=Hospital.objects.all(), source='hospital', write_only=True
    )


    class Meta:
        model = Doctor
        fields = [
            'doctor_id',
            'name', 'hospital_id',
            'experience', 'consultation_fee',
            'available_days', 'shift_start_time', 'image'
        ]

    def validate_doctor_id(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Doctor ID is required.")
        value = value.strip().upper()
        if Doctor.objects.filter(doctor_id=value).exists():
            raise serializers.ValidationError(f"Doctor ID '{value}' is already in use.")
        return value

    def create(self, validated_data):
        return Doctor.objects.create(**validated_data)

    def to_representation(self, instance):
        return DoctorSerializer(instance, context=self.context).data


# ──────────────────────────────────────────────────────────────
# Appointment Serializers
# ──────────────────────────────────────────────────────────────


class AppointmentSerializer(serializers.ModelSerializer):
    doctor = DoctorSerializer(read_only=True)
    user = PatientSummarySerializer(read_only=True)
    doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.all(), source='doctor', write_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            'id', 'user', 'doctor', 'doctor_id', 'date', 'time', 'status',
            'patient_name', 'patient_age', 'patient_problem',
            'patient_contact', 'patient_location', 'payment_mode', 'created_at',
            'last_updated_by', 'updated_at'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at', 'last_updated_by']


class AppointmentStatusSerializer(serializers.Serializer):
    """Used by doctors to update appointment status."""
    STATUS_CHOICES = ['Pending', 'Completed', 'Cancelled']
    status = serializers.ChoiceField(choices=STATUS_CHOICES)



# ──────────────────────────────────────────────────────────────


# ──────────────────────────────────────────────────────────────
# Dashboard Serializers
# ──────────────────────────────────────────────────────────────

class DoctorDashboardSerializer(serializers.Serializer):
    """Aggregated doctor dashboard data."""
    profile = DoctorSerializer()
    total_appointments = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    today_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    today_appointments = AppointmentSerializer(many=True)


class PatientDashboardSerializer(serializers.Serializer):
    """Aggregated patient dashboard data."""
    profile = UserSerializer()
    appointments = AppointmentSerializer(many=True)


# ──────────────────────────────────────────────────────────────
# Auth Serializers
# ──────────────────────────────────────────────────────────────

class DoctorLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})


class DoctorIDVerifySerializer(serializers.Serializer):
    doctor_id = serializers.CharField(max_length=20)
