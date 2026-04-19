from django.conf import settings
from django.db import models


class LabTest(models.Model):
    name = models.CharField(max_length=255)
    about = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255)
    contact_no = models.CharField(max_length=15, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    lab_id = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Unique Lab Portal ID (e.g. LAB-1001)")
    image = models.ImageField(upload_to="labs/", null=True, blank=True)

    # Scheduling Fields
    shift_start_time = models.TimeField(
        default="09:00:00", help_text="Start time of shift"
    )
    shift_end_time = models.TimeField(
        default="18:00:00", help_text="End time of shift"
    )
    slot_duration_minutes = models.PositiveIntegerField(
        default=30, help_text="Duration of each slot in minutes"
    )
    patients_per_slot = models.PositiveIntegerField(
        default=5, help_text="Max patients allowed per time slot"
    )
    available_days = models.CharField(
        max_length=100,
        default="Mon, Tue, Wed, Thu, Fri, Sat",
        help_text="Comma-separated days e.g. Mon, Tue, Wed"
    )
    unavailable_dates = models.TextField(
        blank=True, null=True, help_text="Comma-separated dates lab is closed (YYYY-MM-DD)"
    )
    weekly_schedule = models.JSONField(
        default=dict,
        blank=True,
        help_text="Day-wise schedule configurations"
    )

    class Meta:
        verbose_name = "Lab"
        verbose_name_plural = "Labs"

    def __str__(self):
        return self.name

    def avg_rating(self):
        from django.db.models import Avg
        result = self.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(result, 1) if result else None

    def review_count(self):
        return self.reviews.count()


class Medicine(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    strip_count = models.PositiveIntegerField(default=10, help_text="Number of tablets/units per strip")
    image = models.ImageField(upload_to="medicines/", null=True, blank=True)

    def __str__(self):
        return self.name


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, null=True, blank=True
    )
    lab_test = models.ForeignKey(
        LabTest, on_delete=models.CASCADE, null=True, blank=True
    )
    quantity = models.PositiveIntegerField(default=1)

    def get_total_price(self):
        if self.medicine:
            return self.medicine.price * self.quantity
        if self.lab_test:
            # Price removed from LabTest, returning 0
            return 0
        return 0


class Order(models.Model):
    STATUS_CHOICES = (
        ("Ordered", "Ordered"),
        ("Shipped", "Shipped"),
        ("Delivered", "Delivered"),
    )
    PAYMENT_CHOICES = (
        ("COD", "Cash on Delivery"),
        ("Online", "Online Payment (Razorpay)")
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    items = models.TextField(help_text="JSON list of items or text summary")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Address Fields
    house_no = models.CharField(max_length=100, default="")
    street = models.CharField(max_length=255, default="")
    landmark = models.CharField(max_length=255, blank=True, null=True)
    pincode = models.CharField(max_length=10, default="")
    city = models.CharField(max_length=100, default="")



    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Ordered")
    
    # Razorpay Fields
    razorpay_order_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    is_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} by {self.user.username}"


class LabAppointment(models.Model):
    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Booked", "Booked"),
        ("Completed", "Completed"),
        ("Cancelled", "Cancelled"),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lab_test = models.ForeignKey(LabTest, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lab Test: {self.lab_test.name} for {self.user.username}"


class LabReview(models.Model):
    lab = models.ForeignKey(
        LabTest, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(default=5)  # 1 to 5
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.lab.name} by {self.user.username}"
