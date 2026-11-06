# products/selectors.py

from django.utils import timezone
from django.db.models import Prefetch
from django.db.models import Q

from .models import Product, ProductVariant, ProductImage


def _enabled_variants_prefetch():
    return Prefetch(
        "variants",
        queryset=ProductVariant.objects.filter(stock__gt=0).prefetch_related(
            "attributes__attribute_value__attribute"
        ),
    )


def _primary_images_prefetch():
    return Prefetch(
        "images",
        queryset=ProductImage.objects.filter(is_primary=True),
        to_attr="prefetched_primary_images",
    )


def _active_product_discounts_prefetch():
    from discount.models import ProductDiscount

    now = timezone.now()
    return Prefetch(
        "product_discounts",
        queryset=ProductDiscount.objects.select_related("discount").filter(
            discount__scope="product",
            discount__is_active=True,
            discount__start_date__lte=now,
            discount__end_date__gte=now,
        ).order_by("-discount__id"),
        to_attr="prefetched_active_product_discounts",
    )


def _active_category_discounts_prefetch():
    from discount.models import CategoryDiscount

    now = timezone.now()
    return Prefetch(
        "category__category_discounts",
        queryset=CategoryDiscount.objects.select_related("discount").filter(
            discount__scope="category",
            discount__is_active=True,
            discount__start_date__lte=now,
            discount__end_date__gte=now,
        ).order_by("-discount__id"),
        to_attr="prefetched_active_category_discounts",
    )


def _is_truthy(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def get_all_products(filters=None):
    filters = filters or {}

    queryset = Product.objects.filter(
        is_active=True,
        variants__stock__gt=0,
    ).distinct()

    category = filters.get("category")
    if category:
        if str(category).isdigit():
            queryset = queryset.filter(category_id=int(category))
        else:
            queryset = queryset.filter(category__slug=category)

    subcategory = filters.get("subcategory")
    if subcategory:
        if str(subcategory).isdigit():
            queryset = queryset.filter(subcategory_id=int(subcategory))
        else:
            queryset = queryset.filter(subcategory__slug=subcategory)

    product_type = filters.get("product_type")
    if product_type:
        if str(product_type).isdigit():
            queryset = queryset.filter(product_type_id=int(product_type))
        else:
            queryset = queryset.filter(product_type__name__iexact=product_type)

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search)
        )

    min_price = filters.get("min_price")
    if min_price not in (None, ""):
        try:
            queryset = queryset.filter(selling_price__gte=min_price)
        except (TypeError, ValueError):
            pass

    max_price = filters.get("max_price")
    if max_price not in (None, ""):
        try:
            queryset = queryset.filter(selling_price__lte=max_price)
        except (TypeError, ValueError):
            pass

    in_stock = filters.get("in_stock")
    if in_stock is not None and _is_truthy(in_stock):
        queryset = queryset.filter(variants__stock__gt=0).distinct()

    if _is_truthy(filters.get("discounted_only")):
        now = timezone.now()
        from discount.models import Discount

        has_global_discount = Discount.objects.filter(
            scope="global",
            is_active=True,
            start_date__lte=now,
            end_date__gte=now,
        ).exists()

        if has_global_discount:
            queryset = queryset
        else:
            queryset = queryset.filter(
                Q(
                    product_discounts__discount__scope="product",
                    product_discounts__discount__is_active=True,
                    product_discounts__discount__start_date__lte=now,
                    product_discounts__discount__end_date__gte=now,
                )
                | Q(
                    category__category_discounts__discount__scope="category",
                    category__category_discounts__discount__is_active=True,
                    category__category_discounts__discount__start_date__lte=now,
                    category__category_discounts__discount__end_date__gte=now,
                )
            ).distinct()

    sort = (filters.get("sort") or "").strip().lower()
    if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
        queryset = queryset.order_by("selling_price", "id")
    elif sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
        queryset = queryset.order_by("-selling_price", "id")
    elif sort in {"new", "newest", "new_products"}:
        queryset = queryset.order_by("-created_at", "-id")
    else:
        queryset = queryset.order_by("id")

    return queryset.select_related(
        "category", "subcategory", "product_type"
    ).prefetch_related(
        _primary_images_prefetch(),
        _active_product_discounts_prefetch(),
        _active_category_discounts_prefetch(),
    )


def get_product_by_slug(slug):
    return Product.objects.filter(
        is_active=True,
        variants__stock__gt=0,
    ).distinct().select_related(
        "category", "product_type"
    ).prefetch_related(
        "images",
        _enabled_variants_prefetch(),
        _active_product_discounts_prefetch(),
        _active_category_discounts_prefetch(),
    ).get(slug=slug)


def get_all_products_admin(filters=None):
    filters = filters or {}

    queryset = Product.objects.all()

    is_active_filter = filters.get("is_active")
    if is_active_filter is not None:
        queryset = queryset.filter(is_active=_is_truthy(is_active_filter))

    category = filters.get("category")
    if category:
        if str(category).isdigit():
            queryset = queryset.filter(category_id=int(category))
        else:
            queryset = queryset.filter(category__slug=category)

    subcategory = filters.get("subcategory")
    if subcategory:
        if str(subcategory).isdigit():
            queryset = queryset.filter(subcategory_id=int(subcategory))
        else:
            queryset = queryset.filter(subcategory__slug=subcategory)

    product_type = filters.get("product_type")
    if product_type:
        if str(product_type).isdigit():
            queryset = queryset.filter(product_type_id=int(product_type))
        else:
            queryset = queryset.filter(product_type__name__iexact=product_type)

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search) |
            Q(slug__icontains=search)
        )

    min_price = filters.get("min_price")
    if min_price not in (None, ""):
        try:
            queryset = queryset.filter(selling_price__gte=min_price)
        except (TypeError, ValueError):
            pass

    max_price = filters.get("max_price")
    if max_price not in (None, ""):
        try:
            queryset = queryset.filter(selling_price__lte=max_price)
        except (TypeError, ValueError):
            pass

    in_stock = filters.get("in_stock")
    if in_stock is not None and _is_truthy(in_stock):
        queryset = queryset.filter(variants__stock__gt=0).distinct()

    if _is_truthy(filters.get("discounted_only")):
        now = timezone.now()
        from discount.models import Discount

        has_global_discount = Discount.objects.filter(
            scope="global",
            is_active=True,
            start_date__lte=now,
            end_date__gte=now,
        ).exists()

        if has_global_discount:
            queryset = queryset
        else:
            queryset = queryset.filter(
                Q(
                    product_discounts__discount__scope="product",
                    product_discounts__discount__is_active=True,
                    product_discounts__discount__start_date__lte=now,
                    product_discounts__discount__end_date__gte=now,
                )
                | Q(
                    category__category_discounts__discount__scope="category",
                    category__category_discounts__discount__is_active=True,
                    category__category_discounts__discount__start_date__lte=now,
                    category__category_discounts__discount__end_date__gte=now,
                )
            ).distinct()

    sort = (filters.get("sort") or "").strip().lower()
    if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
        queryset = queryset.order_by("selling_price", "id")
    elif sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
        queryset = queryset.order_by("-selling_price", "id")
    elif sort in {"new", "newest", "new_products"}:
        queryset = queryset.order_by("-created_at", "-id")
    else:
        queryset = queryset.order_by("-id")

    return queryset.select_related(
        "category", "subcategory", "product_type"
    ).prefetch_related(
        _primary_images_prefetch(),
        _active_product_discounts_prefetch(),
        _active_category_discounts_prefetch(),
    )


def get_product_by_slug_admin(slug):
    return Product.objects.select_related(
        "category", "subcategory", "product_type"
    ).prefetch_related(
        "images",
        "tags",
        "variants__attributes__attribute_value__attribute",
        _active_product_discounts_prefetch(),
        _active_category_discounts_prefetch(),
    ).get(slug=slug)