from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import Order


def get_order_by_public_order_id(public_order_id):
    """
    Optimized order fetch with related data
    """

    return get_object_or_404(
        Order.objects.prefetch_related(
            "items__variant",
            "items__variant__attributes__attribute_value__attribute",
        ),
        public_order_id=public_order_id
    )


def get_orders_list(filters=None):
    filters = filters or {}

    queryset = Order.objects.all()

    search_term = filters.get("search")
    if search_term:
        queryset = queryset.filter(
            Q(public_order_id__icontains=search_term)
            | Q(customer_phone__icontains=search_term)
            | Q(customer_name__icontains=search_term)
        )

    start_date = filters.get("start_date")
    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)

    end_date = filters.get("end_date")
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)

    status = filters.get("status")
    if status:
        queryset = queryset.filter(status=status)

    payment_method = filters.get("payment_method")
    if payment_method:
        queryset = queryset.filter(payment_method=payment_method)

    is_paid = filters.get("is_paid")
    if is_paid is not None:
        queryset = queryset.filter(is_paid=is_paid)

    sort_by = filters.get("sort_by", "created_at")
    sort_dir = filters.get("sort_dir", "desc")
    sort_field_map = {
        "created_at": "created_at",
        "total_amount": "total_amount",
        "status": "status",
    }
    sort_field = sort_field_map.get(sort_by, "created_at")
    prefix = "-" if sort_dir == "desc" else ""

    return queryset.order_by(f"{prefix}{sort_field}")