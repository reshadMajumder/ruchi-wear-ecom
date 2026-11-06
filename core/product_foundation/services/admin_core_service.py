from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch
from products.models import *


def create_category(data):
    parent = None

    if data.get("parent_id"):
        parent = Category.objects.filter(id=data["parent_id"]).first()
        if not parent:
            raise ValidationError("Parent category not found")

    return Category.objects.create(
        name=data["name"],
        image_url=data.get("image_url"),
        parent=parent
    )


def create_product_type(data):
    if ProductType.objects.filter(name=data["name"]).exists():
        raise ValidationError("ProductType already exists")

    return ProductType.objects.create(name=data["name"])


def create_attribute(data):
    if Attribute.objects.filter(name=data["name"]).exists():
        raise ValidationError("Attribute already exists")

    return Attribute.objects.create(name=data["name"])


def create_attribute_value(data):
    attribute = Attribute.objects.filter(id=data["attribute_id"]).first()

    if not attribute:
        raise ValidationError("Attribute not found")

    if AttributeValue.objects.filter(
        attribute=attribute,
        value=data["value"]
    ).exists():
        raise ValidationError("Attribute value already exists")

    return AttributeValue.objects.create(
        attribute=attribute,
        value=data["value"]
    )


def assign_attribute_to_product_type(data):
    product_type = ProductType.objects.filter(id=data["product_type_id"]).first()
    attribute = Attribute.objects.filter(id=data["attribute_id"]).first()

    if not product_type or not attribute:
        raise ValidationError("Invalid product type or attribute")

    if ProductTypeAttribute.objects.filter(
        product_type=product_type,
        attribute=attribute
    ).exists():
        raise ValidationError("Already assigned")

    return ProductTypeAttribute.objects.create(
        product_type=product_type,
        attribute=attribute
    )


def create_or_assign_attribute_to_product_type(product_type_id, attribute_name):
    product_type = ProductType.objects.filter(id=product_type_id).first()
    if not product_type:
        raise ValidationError("Product type not found")

    attribute, _ = Attribute.objects.get_or_create(name=attribute_name)

    mapping, created = ProductTypeAttribute.objects.get_or_create(
        product_type=product_type,
        attribute=attribute,
    )

    return attribute, mapping, created


def get_attributes_for_admin():
    return Attribute.objects.prefetch_related(
        "values",
        Prefetch(
            "producttypeattribute_set",
            queryset=ProductTypeAttribute.objects.select_related("product_type"),
            to_attr="prefetched_product_type_mappings",
        ),
    ).order_by("name")


def get_attribute_for_admin(attribute_id):
    return Attribute.objects.prefetch_related(
        "values",
        Prefetch(
            "producttypeattribute_set",
            queryset=ProductTypeAttribute.objects.select_related("product_type"),
            to_attr="prefetched_product_type_mappings",
        ),
    ).get(id=attribute_id)


@transaction.atomic
def update_attribute_details(attribute_id, data):
    obj = Attribute.objects.get(id=attribute_id)

    new_name = data.get("name")
    new_values = data.get("values")
    new_product_type_ids = data.get("product_type_ids")

    if new_name:
        duplicate_name_exists = Attribute.objects.filter(name=new_name).exclude(id=obj.id).exists()
        if duplicate_name_exists:
            raise ValidationError({"error": "Attribute already exists"})

    if new_product_type_ids is not None:
        existing_type_ids = set(
            ProductType.objects.filter(id__in=new_product_type_ids).values_list("id", flat=True)
        )
        missing_type_ids = sorted(set(new_product_type_ids) - existing_type_ids)
        if missing_type_ids:
            raise ValidationError({"error": f"Invalid product type id(s): {missing_type_ids}"})

    if new_name:
        obj.name = new_name
        obj.save(update_fields=["name"])

    if new_values is not None:
        existing_values_qs = AttributeValue.objects.filter(attribute=obj)
        requested_values = set(new_values)

        removable_values_qs = existing_values_qs.exclude(value__in=requested_values)
        used_values = sorted(
            removable_values_qs.filter(variantattributevalue__isnull=False)
            .values_list("value", flat=True)
            .distinct()
        )
        if used_values:
            raise ValidationError(
                {
                    "error": "Cannot remove attribute values that are used in variants.",
                    "used_values": used_values,
                }
            )

        removable_values_qs.delete()

        existing_value_set = set(existing_values_qs.values_list("value", flat=True))
        for value in new_values:
            if value not in existing_value_set:
                AttributeValue.objects.create(attribute=obj, value=value)

    if new_product_type_ids is not None:
        current_type_ids = set(
            ProductTypeAttribute.objects.filter(attribute=obj).values_list("product_type_id", flat=True)
        )
        requested_type_ids = set(new_product_type_ids)

        removable_type_ids = current_type_ids - requested_type_ids
        in_use_type_ids = sorted(
            Product.objects.filter(product_type_id__in=removable_type_ids)
            .values_list("product_type_id", flat=True)
            .distinct()
        )
        if in_use_type_ids:
            raise ValidationError(
                {
                    "error": "Cannot remove product type mappings that are used by products.",
                    "used_product_type_ids": in_use_type_ids,
                }
            )

        if removable_type_ids:
            ProductTypeAttribute.objects.filter(
                attribute=obj,
                product_type_id__in=removable_type_ids,
            ).delete()

        add_type_ids = requested_type_ids - current_type_ids
        for product_type_id in add_type_ids:
            ProductTypeAttribute.objects.create(attribute=obj, product_type_id=product_type_id)

    return get_attribute_for_admin(obj.id)