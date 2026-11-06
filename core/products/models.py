from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
import hashlib
import json
from django.db.models import Sum
from django.db.models import Q


User = get_user_model()


# ============================================================
# ABSTRACT BASE
# ============================================================

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ============================================================
# CATEGORY
# ============================================================

class Category(TimeStampedModel):
    name = models.CharField(max_length=255)
    image_url = models.URLField(null=True, blank=True)
    slug = models.SlugField()

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children"
    )

    def _build_unique_slug_for_scope(self, base_slug):
        candidate = base_slug or "category"

        scoped_qs = Category.objects.all()
        if self.parent_id is None:
            scoped_qs = scoped_qs.filter(parent__isnull=True)
        else:
            scoped_qs = scoped_qs.filter(parent_id=self.parent_id)

        if self.pk:
            scoped_qs = scoped_qs.exclude(pk=self.pk)

        if not scoped_qs.filter(slug=candidate).exists():
            return candidate

        suffix = 2
        while scoped_qs.filter(slug=f"{candidate}-{suffix}").exists():
            suffix += 1
        return f"{candidate}-{suffix}"

    def save(self, *args, **kwargs):
        base_slug = slugify(self.slug or self.name)
        self.slug = self._build_unique_slug_for_scope(base_slug)
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["slug"],
                condition=Q(parent__isnull=True),
                name="unique_root_category_slug",
            ),
            models.UniqueConstraint(
                fields=["parent", "slug"],
                condition=Q(parent__isnull=False),
                name="unique_subcategory_slug_per_parent",
            ),
        ]

    def __str__(self):
        return self.name


# ============================================================
# PRODUCT TYPE & ATTRIBUTES
# ============================================================

class ProductType(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Attribute(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class ProductTypeAttribute(models.Model):
    product_type = models.ForeignKey(ProductType, on_delete=models.CASCADE)
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("product_type", "attribute")


class AttributeValue(models.Model):
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=100)

    class Meta:
        unique_together = ("attribute", "value")

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class ProductTag(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ============================================================
# PRODUCT
# ============================================================

from django.db.models import Sum
from django.core.exceptions import ValidationError

class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    subcategory = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="subcategory_products",
        null=True,
        blank=True,
    )

    product_type = models.ForeignKey(
        ProductType,
        on_delete=models.PROTECT
    )

    tags = models.ManyToManyField(
        "ProductTag",
        blank=True,
        related_name="products",
    )

    buying_price = models.DecimalField(max_digits=10, decimal_places=2,default=0.00)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2,default=0.00)

    is_active = models.BooleanField(default=True)

    def clean(self):
        if self.selling_price < self.buying_price:
            raise ValidationError("Selling price cannot be less than buying price")

    def _build_unique_slug(self, base_slug):
        candidate = base_slug or "product"
        queryset = Product.objects.all()

        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        if not queryset.filter(slug=candidate).exists():
            return candidate

        suffix = 2
        while queryset.filter(slug=f"{candidate}-{suffix}").exists():
            suffix += 1
        return f"{candidate}-{suffix}"

    def save(self, *args, **kwargs):
        base_slug = slugify(self.slug or self.name)
        self.slug = self._build_unique_slug(base_slug)
        super().save(*args, **kwargs)

    @property
    def total_stock(self):
        return self.variants.aggregate(
            total=Sum("stock")
        )["total"] or 0

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=["is_active", "created_at", "id"], name="product_active_new_idx"),
            models.Index(fields=["is_active", "selling_price", "id"], name="product_active_price_idx"),
            models.Index(fields=["is_active", "category"], name="product_active_category_idx"),
            models.Index(fields=["is_active", "product_type"], name="product_active_ptype_idx"),
        ]


class Section(TimeStampedModel):
    title = models.CharField(max_length=255)
    priority = models.IntegerField(default=0)
    products = models.ManyToManyField(
        "Product",
        through="SectionProduct",
        related_name="sections",
    )

    class Meta:
        ordering = ["-priority", "-id"]

    def __str__(self):
        return self.title


class SectionProduct(TimeStampedModel):
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="section_products",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="product_sections",
    )
    priority = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["section", "product"],
                name="unique_product_per_section",
            )
        ]
        ordering = ["-priority", "-id"]

# ============================================================
# PRODUCT IMAGES (MULTIPLE)
# ============================================================

class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image_url = models.URLField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_primary:
            ProductImage.objects.filter(
                product=self.product,
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)

        super().save(*args, **kwargs)




# ============================================================
# PRODUCT VARIANT (CORE ENGINE)
# ============================================================


class ProductVariant(TimeStampedModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants"
    )

    sku = models.CharField(max_length=100, unique=True)

    stock = models.PositiveIntegerField(default=0)
    weight = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    combination_hash = models.CharField(max_length=64)

    class Meta:
        unique_together = ("product", "combination_hash")
        indexes = [
            models.Index(fields=["product", "stock"], name="variant_product_stock_idx"),
        ]

    def generate_combination_hash(self, attr_value_ids):
        """
        Generate a deterministic hash for attribute combination
        """
        sorted_ids = sorted(attr_value_ids)
        raw = json.dumps(sorted_ids)
        return hashlib.sha256(raw.encode()).hexdigest()

    def clean(self):
        if self.stock < 0:
            raise ValidationError("Stock cannot be negative")
        if self.weight < 0:
            raise ValidationError("Weight cannot be negative")


    def __str__(self):
        return f"{self.product.name} - {self.sku}"


class VariantAttributeValue(models.Model):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="attributes"
    )
    attribute_value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("variant", "attribute_value")


