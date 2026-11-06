from __future__ import annotations

from typing import Optional

PATHAO_DELIVERY_EVENTS = {
    'order.created',
    'order.updated',
    'order.pickup-requested',
    'order.assigned-for-pickup',
    'order.picked',
    'order.at-the-sorting-hub',
    'order.in-transit',
    'order.received-at-last-mile-hub',
    'order.assigned-for-delivery',
    'order.delivered',
    'order.partial-delivery',
    'order.delivery-failed',
    'order.on-hold',
}

PATHAO_RETURN_EVENTS = {
    'order.pickup-cancelled',
    'order.pickup-failed',
    'order.returned',
    'order.return-id-created',
    'order.return-in-transit',
    'order.returned-to-merchant',
    'order.paid-return',
    'order.exchanged',
}

AUTO_STOCK_RESTORE_EVENTS = {
    'order.pickup-cancelled',
    'order.pickup-failed',
    'order.returned-to-merchant',
}

ORDER_STATUS_MAP = {
    'order.created': 'confirmed',
    'order.delivered': 'completed',
    'order.pickup-cancelled': 'cancelled',
    'order.pickup-failed': 'cancelled',
    'order.returned-to-merchant': 'cancelled',
}


def normalize_event(event: str | None) -> str:
    return str(event or '').strip().lower()


def should_auto_restore_stock(event: str | None) -> bool:
    return normalize_event(event) in AUTO_STOCK_RESTORE_EVENTS


def map_pathao_event_to_order_status(event: str | None) -> Optional[str]:
    return ORDER_STATUS_MAP.get(normalize_event(event))


def is_delivered_event(event: str | None) -> bool:
    return normalize_event(event) == 'order.delivered'


def is_return_event(event: str | None) -> bool:
    return normalize_event(event) in PATHAO_RETURN_EVENTS


def is_cancel_event(event: str | None) -> bool:
    return normalize_event(event) in {'order.pickup-cancelled', 'order.pickup-failed'}
