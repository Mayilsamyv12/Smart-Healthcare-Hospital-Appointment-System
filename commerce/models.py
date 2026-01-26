from django.db import models
from django.conf import settings

class LabTest(models.Model):
    name = models.CharField(max_length=255)
    features = models.TextField(help_text="Description of the test")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    image = models.ImageField(upload_to='labs/', null=True, blank=True)

    def __str__(self):
        return self.name


class Medicine(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='medicines/', null=True, blank=True)

    def __str__(self):
        return self.name

class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, null=True, blank=True)
    lab_test = models.ForeignKey(LabTest, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    
    def get_total_price(self):
        if self.medicine:
            return self.medicine.price * self.quantity
        if self.lab_test:
            return self.lab_test.price * self.quantity
        return 0


class Order(models.Model):
    STATUS_CHOICES = (
        ('Ordered', 'Ordered'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered')
    )
    PAYMENT_CHOICES = (
        ('COD', 'Cash on Delivery'),
        ('UPI', 'UPI'),
        ('Card', 'Card')
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

    prescription = models.ImageField(upload_to='prescriptions/', null=True, blank=True)

    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Ordered')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} by {self.user.username}"

class LabAppointment(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Booked', 'Booked'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled')
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lab_test = models.ForeignKey(LabTest, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lab Test: {self.lab_test.name} for {self.user.username}"

