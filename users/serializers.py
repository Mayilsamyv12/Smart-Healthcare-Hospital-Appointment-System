from rest_framework import serializers
from .models import CustomUser
import re

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(required=True)

    class Meta:
        model = CustomUser
        fields = ['country_code', 'contact_no', 'password', 'name', 'age', 'gender', 'location']

    def validate_contact_no(self, value):
        value = value.strip()
        if not value.isdigit():
            raise serializers.ValidationError("Mobile number must contain only digits.")
        if CustomUser.objects.filter(contact_no=value).exists():
            raise serializers.ValidationError("A user with this mobile number already exists.")
        return value

    def create(self, validated_data):
        contact_no = validated_data.get('contact_no')
        password = validated_data.pop('password')
        name = validated_data.pop('name')
        
        # Username defaults to mobile number for mobile-only auth
        username = contact_no
        
        user = CustomUser.objects.create(
            username=username,
            first_name=name,
            role="Patient",
            **validated_data
        )
        user.set_password(password)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    contact_no = serializers.CharField()
    password = serializers.CharField(write_only=True)
