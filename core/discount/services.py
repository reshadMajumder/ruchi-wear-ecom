from decimal import Decimal

from django.utils import timezone
from .models import Discount


def get_product_discount(product):
    now = timezone.now()

    prefetched_discounts = getattr(product, "prefetched_active_product_discounts", None)
    if prefetched_discounts is not None:
        if prefetched_discounts:
            return prefetched_discounts[0].discount

    mapping = (
        product.product_discounts
        .select_related("discount")
        .filter(
            discount__scope="product",
            discount__is_active=True,
            discount__start_date__lte=now,
            discount__end_date__gte=now
        )
        .order_by("-discount__id")
        .first()
    )

    return mapping.discount if mapping else None


def get_global_discount():
    now = timezone.now()

    return (
        Discount.objects.filter(
            scope="global",
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        )
        .order_by("-id")
        .first()
    )


def get_category_discount(product):
    now = timezone.now()
    category = getattr(product, "category", None)

    if not category:
        return None

    prefetched_discounts = getattr(category, "prefetched_active_category_discounts", None)
    if prefetched_discounts is not None:
        if prefetched_discounts:
            return prefetched_discounts[0].discount

    mapping = (
        category.category_discounts
        .select_related("discount")
        .filter(
            discount__scope="category",
            discount__is_active=True,
            discount__start_date__lte=now,
            discount__end_date__gte=now,
        )
        .order_by("-discount__id")
        .first()
    )

    return mapping.discount if mapping else None


def calculate_final_price(product):
    """
    MAIN ENTRY POINT
    """

    price = Decimal(product.selling_price)

    # 1️⃣ product discount
    discount = get_product_discount(product)

    # 2️⃣ fallback category
    if not discount:
        discount = get_category_discount(product)

    # 3️⃣ fallback global
    if not discount:
        discount = get_global_discount()

    if not discount:
        return price

    if discount.discount_type == "percentage":
        price -= (price * Decimal(discount.value) / Decimal("100"))

    elif discount.discount_type == "fixed":
        price -= Decimal(discount.value)

    return max(price, 0)



def get_price_data(product, global_discount=None, forced_discount=None):

    '''
    Returns a dict with original price, final price, discount percent, discount value and is_discounted flag
    '''
    price = Decimal(product.selling_price)

    discount = None

    # When a caller explicitly asks to price with a specific discount,
    # prefer that discount if it's currently valid.
    if forced_discount is not None and forced_discount.is_valid():
        discount = forced_discount

    if not discount:
        discount = get_product_discount(product)

    if not discount:
        discount = get_category_discount(product)

    if not discount:
        if global_discount is not None:
            discount = global_discount
        else:
            discount = get_global_discount()

    if not discount:
        return {
            "original_price": price,
            "final_price": price,
            "discount_percent": 0,
            "discount_value": 0,
            "is_discounted": False
        }

    if discount.discount_type == "percentage":
        discount_percent = Decimal(discount.value)
        final_price = price - (price * discount_percent / Decimal("100"))

    elif discount.discount_type == "fixed":
        final_price = price - Decimal(discount.value)
        discount_percent = ((price - final_price) / price) * 100

    final_price = max(final_price, 0)

    return {
        "original_price": price,
        "final_price": final_price,
        "discount_percent": round(discount_percent, 2),
        "discount_value": price - final_price,
        "is_discounted": True
    }