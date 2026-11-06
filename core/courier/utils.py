from __future__ import annotations

import os
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError


PATHAO_PROVIDER = 'pathao'
REDX_PROVIDER = 'redx'
STEADFAST_PROVIDER = 'steadfast'

PATHAO_STATUS_MAP = {
    'Pending': 'pending',
    'Pickup Requested': 'pickup_requested',
    'Picked Up': 'picked_up',
    'In Transit': 'in_transit',
    'Delivered': 'delivered',
    'Partial Delivered': 'partial_delivered',
    'Returned': 'returned',
}

DEFAULT_ITEM_TYPE = 2
DEFAULT_DELIVERY_TYPE = 48
CACHE_TTL_24_HOURS = 60 * 60 * 24
MIN_PATHAO_ITEM_WEIGHT = Decimal('0.500')
DEFAULT_ORDER_WEIGHT = MIN_PATHAO_ITEM_WEIGHT


def decimalize(value: Any, default: str = '0.00') -> Decimal:
    if value in (None, ''):
        return Decimal(default)
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def quantize_weight(value: Any) -> Decimal:
    return decimalize(value, '0.000').quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)


def normalize_pathao_weight(value: Any) -> Decimal:
    weight = quantize_weight(value)
    if weight < MIN_PATHAO_ITEM_WEIGHT:
        return MIN_PATHAO_ITEM_WEIGHT
    return weight


def build_merchant_order_id(public_order_id: str) -> str:
    return f'ADU-{public_order_id}'


def normalize_phone(phone: str) -> str:
    normalized = ''.join(ch for ch in str(phone).strip() if ch.isdigit())
    if len(normalized) < 10:
        raise ValidationError('Recipient phone number is invalid.')
    return normalized


def load_pathao_env_config() -> dict[str, str]:
    return {
        'base_url': os.getenv('PATHAO_BASE_URL', 'https://courier-api-sandbox.pathao.com'),
        'client_id': os.getenv('PATHAO_CLIENT_ID', ''),
        'client_secret': os.getenv('PATHAO_CLIENT_SECRET', ''),
        'username': os.getenv('PATHAO_USERNAME', ''),
        'password': os.getenv('PATHAO_PASSWORD', ''),
    }
