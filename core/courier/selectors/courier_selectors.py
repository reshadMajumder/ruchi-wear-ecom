from __future__ import annotations

from django.shortcuts import get_object_or_404

from courier.models import CourierCredential, CourierOrder, CourierStore


def get_active_courier_credential(provider: str):
    return CourierCredential.objects.filter(provider=provider, is_active=True).order_by('-updated_at').first()


def get_active_courier_store(provider: str):
    return CourierStore.objects.filter(provider=provider, is_active=True).order_by('-updated_at').first()


def get_courier_store_by_store_id(provider: str, store_id: str):
    return CourierStore.objects.filter(provider=provider, store_id=str(store_id), is_active=True).order_by('-updated_at').first()


def get_courier_order_for_order(order):
    return get_object_or_404(CourierOrder.objects.select_related('order'), order=order)


def get_courier_order_by_consignment_id(consignment_id: str):
    return get_object_or_404(CourierOrder.objects.select_related('order'), consignment_id=consignment_id)


def get_pending_courier_orders(provider: str | None = None):
    queryset = CourierOrder.objects.select_related('order')
    if provider:
        queryset = queryset.filter(provider=provider)
    return queryset.filter(consignment_id__isnull=False).exclude(current_status_slug__in=['delivered', 'returned'])
