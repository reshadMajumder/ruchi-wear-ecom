from django.db import models
from django.utils import timezone


class Coupon(models.Model):
	DISCOUNT_TYPE_CHOICES = (
		("percentage", "Percentage"),
		("fixed", "Fixed"),
	)
	SCOPE_CHOICES = (
		("global", "Global"),
		("specific", "Specific"),
	)

	code = models.CharField(max_length=50, unique=True)
	discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
	scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="global")
	value = models.DecimalField(max_digits=10, decimal_places=2)

	min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

	is_active = models.BooleanField(default=True)
	start_date = models.DateTimeField()
	end_date = models.DateTimeField()

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def is_valid_now(self):
		now = timezone.now()
		return self.is_active and self.start_date <= now <= self.end_date

	def __str__(self):
		return self.code


class CouponPhoneUsage(models.Model):
	coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="phone_usages")
	holder_name = models.CharField(max_length=255, blank=True)
	phone_number = models.CharField(max_length=20)
	usable_count = models.PositiveIntegerField(default=1)
	used_count = models.PositiveIntegerField(default=0)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("coupon", "phone_number")

	def __str__(self):
		return f"{self.coupon.code} - {self.phone_number} ({self.used_count}/{self.usable_count})"
