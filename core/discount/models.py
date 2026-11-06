from django.db import models
from django.utils import timezone
from products.models import Category, Product


class Discount(models.Model):
    DISCOUNT_TYPE = (
        ("percentage", "Percentage"),
        ("fixed", "Fixed"),
    )

    SCOPE_TYPE = (
        ("product", "Product"),
        ("category", "Category"),
        ("global", "Global"),
    )

    name = models.CharField(max_length=255)

    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE)
    value = models.DecimalField(max_digits=10, decimal_places=2)

    scope = models.CharField(max_length=20, choices=SCOPE_TYPE)

    is_active = models.BooleanField(default=True)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    priority = models.IntegerField(default=0)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    make_card = models.BooleanField(default=False)

    def is_valid(self):
        now = timezone.now()
        return self.is_active and self.start_date <= now <= self.end_date

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=["is_active", "make_card", "priority"], name="discount_card_idx"),
            models.Index(fields=["is_active", "scope"], name="discount_active_scope_idx"),
        ]
    



class ProductDiscount(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="product_discounts"
    )
    discount = models.ForeignKey(
        Discount,
        on_delete=models.CASCADE
    )

    class Meta:
        indexes = [
            models.Index(fields=["discount"], name="product_discount_discount_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["product"],
                name="unique_discount_per_product",
            )
        ]


class CategoryDiscount(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="category_discounts",
    )
    discount = models.ForeignKey(
        Discount,
        on_delete=models.CASCADE,
    )

    class Meta:
        indexes = [
            models.Index(fields=["discount"], name="category_discount_discount_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["category"],
                name="unique_discount_per_category",
            )
        ]