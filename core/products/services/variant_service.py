from django.db import transaction
from django.core.exceptions import ValidationError
from products.models import (
    Product,
    ProductTypeAttribute,
    ProductVariant,
    VariantAttributeValue,
)
from .common import create_variant_internal, validate_variant_attribute_values


@transaction.atomic
def add_variant_to_product(product_id, variant_data):
    '''
    Adds a new variant to an existing product.
    '''
    product = Product.objects.get(id=product_id)

    allowed_attributes = set(
        ProductTypeAttribute.objects.filter(
            product_type=product.product_type
        ).values_list("attribute_id", flat=True)
    )

    return create_variant_internal(
        product,
        variant_data,
        allowed_attributes
    )


@transaction.atomic
def update_variant(variant_id, data):
    '''
    Updates an existing variant's attributes.

    ''' 
    variant = ProductVariant.objects.select_for_update().get(id=variant_id)

    # Stock is restricted to the dedicated increase/decrease endpoint.
    if "stock" in data:
        raise ValidationError("Stock cannot be changed directly. Use the stock increase/decrease endpoint.")

    if "weight" in data:
        variant.weight = data["weight"]

    # update attributes (dangerous but allowed)
    if "attributes" in data:
        attr_ids = data["attributes"]

        # Ensure attributes belong to this product type.
        allowed_attribute_ids = set(
            ProductTypeAttribute.objects.filter(
                product_type=variant.product.product_type
            ).values_list("attribute_id", flat=True)
        )

        validate_variant_attribute_values(attr_ids, allowed_attribute_ids)

        new_hash = variant.generate_combination_hash(attr_ids)

        # prevent duplicate
        if ProductVariant.objects.filter(
            product=variant.product,
            combination_hash=new_hash
        ).exclude(id=variant.id).exists():
            raise ValidationError("Variant already exists")

        # reset attributes
        variant.attributes.all().delete()

        for attr_id in attr_ids:
            VariantAttributeValue.objects.create(
                variant=variant,
                attribute_value_id=attr_id
            )

        variant.combination_hash = new_hash

    variant.save()
    return variant



@transaction.atomic
def update_variant_stock(variant_id, quantity, operation):
    '''
    Updates a variant's stock level.
    operation: "increase" or "decrease"
    '''
    variant = ProductVariant.objects.select_for_update().get(id=variant_id)

    if operation == "decrease":
        if variant.stock < quantity:
            raise ValidationError("Not enough stock")
        variant.stock -= quantity

    elif operation == "increase":
        variant.stock += quantity

    variant.save()
    return variant

