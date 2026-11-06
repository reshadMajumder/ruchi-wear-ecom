from django.core.exceptions import ValidationError
from products.models import ProductVariant, AttributeValue, VariantAttributeValue


def validate_variant_attribute_values(attr_value_ids, allowed_attributes):
    if not attr_value_ids:
        raise ValidationError("Attributes list cannot be empty.")

    if len(set(attr_value_ids)) != len(attr_value_ids):
        raise ValidationError("Duplicate attribute value IDs are not allowed in a single variant.")

    rows = list(
        AttributeValue.objects.filter(id__in=attr_value_ids).values_list("id", "attribute_id")
    )
    existing_value_ids = {row[0] for row in rows}
    missing_value_ids = sorted(set(attr_value_ids) - existing_value_ids)
    if missing_value_ids:
        raise ValidationError(f"Invalid attribute value id(s): {missing_value_ids}.")

    selected_attribute_ids = [row[1] for row in rows]
    if len(set(selected_attribute_ids)) != len(selected_attribute_ids):
        raise ValidationError("A variant cannot contain multiple values for the same attribute.")

    allowed_attribute_ids = set(allowed_attributes)
    invalid_attribute_ids = sorted(set(selected_attribute_ids) - allowed_attribute_ids)
    if invalid_attribute_ids:
        raise ValidationError("One or more attributes are not allowed for this product type.")

    missing_attribute_ids = sorted(allowed_attribute_ids - set(selected_attribute_ids))
    if missing_attribute_ids:
        raise ValidationError(
            "Each variant must include exactly one value for every attribute of this product type."
        )


def create_variant_internal(product, variant_data, allowed_attributes, seen_hashes=None):
    """
    Internal reusable function for creating variants safely.

    Used by:
    - create_product_with_variants
    - add_variant_to_product
    """
    import uuid

    attr_value_ids = variant_data["attributes"]

    # Only validate attributes if there are any to validate against
    if allowed_attributes:
        validate_variant_attribute_values(attr_value_ids, allowed_attributes)

    # 🔥 Generate combination hash
    temp = ProductVariant(product=product)
    combination_hash = temp.generate_combination_hash(attr_value_ids)

    # ❌ VALIDATION 2: Duplicate variant (DB-level check)
    if ProductVariant.objects.filter(
        product=product,
        combination_hash=combination_hash
    ).exists():
        raise ValidationError("Variant already exists")

    # ❌ VALIDATION 3: Duplicate inside same request
    if seen_hashes is not None:
        if combination_hash in seen_hashes:
            raise ValidationError("Duplicate variant in request payload")
        seen_hashes.add(combination_hash)

    # Auto-generate SKU if blank
    sku = variant_data.get("sku", "").strip()
    if not sku:
        sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"

    # ✅ Create variant
    variant = ProductVariant.objects.create(
        product=product,
        sku=sku,
        stock=variant_data["stock"],
        weight=variant_data.get("weight", 0),
        combination_hash=combination_hash
    )

    # 🔗 Attach attributes
    for attr_id in attr_value_ids:
        VariantAttributeValue.objects.create(
            variant=variant,
            attribute_value_id=attr_id
        )

    return variant