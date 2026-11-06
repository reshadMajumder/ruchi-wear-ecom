from django.db import transaction
from django.core.exceptions import ValidationError
from products.models import Category, Product, ProductTypeAttribute, ProductImage, ProductTag
from .common import create_variant_internal


def _resolve_category_and_subcategory(category_id, subcategory_id):
    category = Category.objects.filter(id=category_id, parent__isnull=True).first()
    if not category:
        raise ValidationError({"category_id": "Category not found or is not a root category."})

    if subcategory_id in (None, ""):
        return category, None

    subcategory = Category.objects.filter(id=subcategory_id, parent_id=category.id).first()
    if not subcategory:
        raise ValidationError({"subcategory_id": "Subcategory not found under the selected category."})

    return category, subcategory


@transaction.atomic
def create_product_with_variants(data):
    images_data = data.pop("images", [])
    tag_ids = data.pop("tag_ids", [])

    category, subcategory = _resolve_category_and_subcategory(
        data["category_id"],
        data.get("subcategory_id"),
    )

    product = Product.objects.create(
        name=data["name"],
        description=data["description"],
        category=category,
        subcategory=subcategory,
        product_type_id=data["product_type_id"],
        buying_price=data["buying_price"],
        selling_price=data["selling_price"],
    )

    # 🔥 CREATE IMAGES
    for img in images_data:
        ProductImage.objects.create(
            product=product,
            image_url=img["image_url"],
            is_primary=img.get("is_primary", False)
        )

    # VARIANT LOGIC (unchanged)
    allowed_attributes = set(
        ProductTypeAttribute.objects.filter(
            product_type=product.product_type
        ).values_list("attribute_id", flat=True)
    )

    seen_hashes = set()

    for variant_data in data["variants"]:
        create_variant_internal(
            product,
            variant_data,
            allowed_attributes,
            seen_hashes
        )

    if tag_ids:
        tags = ProductTag.objects.filter(id__in=tag_ids)
        product.tags.set(tags)

    return product




@transaction.atomic
def update_product(product_id, data):
    product = Product.objects.get(id=product_id)

    images_data = data.pop("images", None)
    tag_ids = data.pop("tag_ids", None)
    tags_action = data.pop("tags_action", "set")

    category_id = data.get("category_id", product.category_id)
    subcategory_id = data.get("subcategory_id", product.subcategory_id)
    category, subcategory = _resolve_category_and_subcategory(category_id, subcategory_id)

    data["category"] = category
    data["subcategory"] = subcategory
    data.pop("category_id", None)
    data.pop("subcategory_id", None)

    # 🔥 UPDATE BASIC FIELDS
    for field, value in data.items():
        setattr(product, field, value)

    product.save()

    # ========================
    # 🔥 IMAGE UPDATE LOGIC
    # ========================
    if images_data is not None:
        # Replace strategy (simple + safe)
        product.images.all().delete()

        for img in images_data:
            ProductImage.objects.create(
                product=product,
                image_url=img["image_url"],
                is_primary=img.get("is_primary", False)
            )

    if tag_ids is not None:
        tags = ProductTag.objects.filter(id__in=tag_ids)
        if tags_action == "add":
            product.tags.add(*tags)
        elif tags_action == "remove":
            product.tags.remove(*tags)
        else:
            product.tags.set(tags)

    return product


def delete_product(product_id):
    product = Product.objects.get(id=product_id)

    product.is_active = False
    product.save()

    return product



