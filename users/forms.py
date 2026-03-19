from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from .models import CustomUser


class CustomUserCreationForm(UserCreationForm):
    age = forms.IntegerField(
        min_value=0,
        max_value=200,
        required=False,
        widget=forms.NumberInput(attrs={"min": 0, "max": 200, "placeholder": "Age"}),
    )

    GENDER_CHOICES = (
        ("", "Select Gender"),
        ("M", "Male"),
        ("F", "Female"),
        ("O", "Others"),
    )
    gender = forms.ChoiceField(choices=GENDER_CHOICES, required=False)

    COUNTRY_CODES = (
        ("+1", "+1 (US/Canada)"),
        ("+44", "+44 (UK)"),
        ("+61", "+61 (Australia)"),
        ("+91", "+91 (India)"),
        ("+971", "+971 (UAE)"),
    )
    country_code = forms.ChoiceField(
        choices=COUNTRY_CODES, required=False, initial="+91", label="Country Code"
    )
    contact_no = forms.CharField(
        max_length=15,
        required=False,
        label="Phone Number",
        widget=forms.TextInput(attrs={"placeholder": "Phone number"}),
    )

    email = forms.EmailField(required=True)

    class Meta:
        model = CustomUser
        fields = ("username", "email", "age", "gender", "country_code", "contact_no")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Name"
        for field in self.fields.values():
            field.widget.attrs.setdefault("class", "")
            field.widget.attrs["class"] += " form-input"

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("This email is already registered.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        country_code = self.cleaned_data.get("country_code", "")
        contact_no = self.cleaned_data.get("contact_no", "")
        if contact_no:
            if not contact_no.startswith("+"):
                user.contact_no = f"{country_code} {contact_no}"
            else:
                user.contact_no = contact_no
        if commit:
            user.save()
        return user


class CustomAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Name"
        for field in self.fields.values():
            field.widget.attrs.setdefault("class", "")
            field.widget.attrs["class"] += " form-input"
