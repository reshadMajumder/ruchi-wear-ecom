import uuid
from django.db import models
from products.models import Product, ProductVariant
from decimal import Decimal


class DeliverySettings(models.Model):
    """Singleton model to store delivery charges and tax settings."""
    inside_dhaka_charge = models.DecimalField(max_digits=10, decimal_places=2, default=60)
    outside_dhaka_charge = models.DecimalField(max_digits=10, decimal_places=2, default=120)
    vat_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="VAT percentage (e.g., 5 for 5%)")
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Tax percentage (e.g., 10 for 10%)")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Delivery Settings"

    def __str__(self):
        return "Delivery Settings"

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Order(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    )
    PAYMENT_METHOD_CHOICES = (
        ("cash_on_delivery", "Cash on Delivery"),
        ("bkash", "Bkash"),
    )


    order_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    public_order_id = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        editable=False,
        db_index=True,
    )

    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=20)
    division = models.CharField(max_length=100, default="", blank=True)
    city = models.CharField(max_length=100, default="", blank=True)
    detailed_address = models.TextField(default="", blank=True)
    address = models.TextField()
    is_inside_dhaka = models.BooleanField(default=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_method= models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="cash_on_delivery")
    is_paid = models.BooleanField(default=False)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount_before_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=50, null=True, blank=True)
    coupon_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    # Optional stored order weight (kilograms). Used as a fallback when item/variant weights
    # are missing or when an administrator needs to override the computed weight.
    weight = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.500'), null=True, blank=True)

    def __str__(self):
        return str(self.order_id)
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT)

    quantity = models.PositiveIntegerField()

    # 🔥 snapshot fields
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    actual_selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    product_name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"