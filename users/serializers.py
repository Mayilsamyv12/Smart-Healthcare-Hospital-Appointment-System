from rest_framework import serializers
import re

class SendOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)

    def validate_identifier(self, value):
        value = value.strip()
        
        is_email = "@" in value
        is_mobile = re.match(r'^\+?[1-9]\d{1,14}$', value) or value.isdigit()

        if not is_email and not is_mobile:
            raise serializers.ValidationError("Please provide a valid email ID or mobile number.")
            
        return value

class VerifyOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_identifier(self, value):
        return value.strip()

