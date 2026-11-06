from products.models import ProductVariant


def get_product_variants(product_id):
    return ProductVariant.objects.filter(product_id=product_id).prefetch_related(
        "attributes__attribute_value__attribute"
    )


def get_variant_by_id(variant_id):
    return ProductVariant.objects.select_related("product").prefetch_related(
        "attributes__attribute_value__attribute"
    ).get(id=variant_id)