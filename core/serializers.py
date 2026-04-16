from rest_framework import serializers
from .models import Doctor, Appointment, Prescription, MedicalRecord, Hospital, PrescriptionTemplate
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
            'available_days', 'shift_start_time', 'shift_end_time', 'slot_duration_minutes', 'patients_per_slot', 'unavailable_dates',
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
            'available_days', 'shift_start_time', 'shift_end_time', 'slot_duration_minutes', 'patients_per_slot', 'unavailable_dates'
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
# Prescription Serializers
# ──────────────────────────────────────────────────────────────

class PrescriptionSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    appointment_id = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), source='appointment', write_only=True
    )
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    prescription_file = serializers.FileField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'appointment', 'appointment_id',
            'doctor', 'doctor_name', 'patient', 'patient_username',
            'generate_method', 'symptoms', 'diagnosis', 'medicines', 'instructions',
            'lab_tests', 'follow_up_date',
            'prescription_file', 'digital_signature', 'created_at', 'updated_at'
        ]
        read_only_fields = ['doctor', 'patient', 'created_at', 'updated_at']


class PrescriptionWriteSerializer(serializers.ModelSerializer):
    """Doctor creates/updates a prescription linked to an appointment."""
    appointment_id = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), source='appointment'
    )
    prescription_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Prescription
        fields = [
            'appointment_id', 'generate_method', 'symptoms', 'diagnosis',
            'medicines', 'instructions', 'lab_tests', 'follow_up_date',
            'prescription_file', 'digital_signature'
        ]

    def validate_appointment_id(self, appointment):
        """Ensure the appointment belongs to the requesting doctor."""
        request = self.context.get('request')
        if request and hasattr(request.user, 'doctor_profile'):
            if appointment.doctor != request.user.doctor_profile:
                raise serializers.ValidationError(
                    "You can only write prescriptions for your own appointments."
                )
        return appointment

    def create(self, validated_data):
        request = self.context.get('request')
        appointment = validated_data['appointment']
        # Try session doctor first, then linked doctor_profile
        from .api_views import get_current_doctor
        doctor = get_current_doctor(request) if request else None
        if not doctor and hasattr(request.user, 'doctor_profile'):
            doctor = request.user.doctor_profile
        patient = appointment.user

        prescription, _ = Prescription.objects.update_or_create(
            appointment=appointment,
            defaults={
                'doctor': doctor,
                'patient': patient,
                **{k: v for k, v in validated_data.items() if k != 'appointment'}
            }
        )
        return prescription


# ──────────────────────────────────────────────────────────────
# Medical Record Serializer
# ──────────────────────────────────────────────────────────────

class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    appointment_id = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), source='appointment', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'appointment', 'appointment_id',
            'title', 'record_type', 'file', 'notes', 'uploaded_at'
        ]
        read_only_fields = ['patient', 'doctor', 'uploaded_at', 'appointment']


class PrescriptionTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionTemplate
        fields = ['id', 'name', 'diagnosis', 'medicines', 'instructions', 'lab_tests', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    prescriptions = PrescriptionSerializer(many=True)
    medical_records = MedicalRecordSerializer(many=True)


# ──────────────────────────────────────────────────────────────
# Auth Serializers
# ──────────────────────────────────────────────────────────────

class DoctorLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'})


class DoctorIDVerifySerializer(serializers.Serializer):
    doctor_id = serializers.CharField(max_length=20)
