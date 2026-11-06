from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from courier.clients.pathao import PathaoClient, PathaoAPIError
from courier.models import CourierOrder
from courier.selectors.courier_selectors import get_active_courier_store, get_courier_order_for_order
from courier.services.sync_service import sync_merchant_stores
from courier.services.token_service import token_service
from courier.utils import (
    DEFAULT_DELIVERY_TYPE,
    DEFAULT_ITEM_TYPE,
    PATHAO_PROVIDER,
    PATHAO_STATUS_MAP,
    build_merchant_order_id,
    normalize_phone,
    DEFAULT_ORDER_WEIGHT,
    normalize_pathao_weight,
)


class CourierOrderService:
    def _get_store(self, provider: str = PATHAO_PROVIDER):
        store = get_active_courier_store(provider)
        if store:
            return store

        sync_merchant_stores(provider=provider)
        store = get_active_courier_store(provider)
        if not store:
            raise ValidationError('No active courier store found.')
        return store

    def _calculate_order_weight(self, order) -> Decimal:
        total_weight = Decimal('0.000')
        for item in order.items.select_related('variant').all():
            try:
                variant_weight = normalize_pathao_weight(item.variant.weight)
            except Exception:
                variant_weight = Decimal('0.000')
            total_weight += variant_weight * item.quantity

        # If item weights are missing or zero, prefer an explicit order.weight (if present),
        # otherwise fall back to a sane default to allow courier creation.
        if total_weight <= 0:
            if hasattr(order, 'weight'):
                try:
                    explicit = normalize_pathao_weight(getattr(order, 'weight'))
                    if explicit >= DEFAULT_ORDER_WEIGHT:
                        return explicit
                except Exception:
                    pass
            return DEFAULT_ORDER_WEIGHT

        return normalize_pathao_weight(total_weight)

    def _build_payload(self, order, store, overrides=None, *, provider: str = PATHAO_PROVIDER):
        item_weight = self._calculate_order_weight(order)
        if item_weight < DEFAULT_ORDER_WEIGHT:
            raise ValidationError('Order weight is required for courier creation.')

        amount_to_collect = Decimal('0.00')
        if order.payment_method == 'cash_on_delivery':
            amount_to_collect = Decimal(str(order.total_amount)).quantize(Decimal('1'))

        merchant_order_id = build_merchant_order_id(order.public_order_id)
        item_quantity = sum(item.quantity for item in order.items.all())
        item_description = ', '.join(sorted({item.product_name for item in order.items.all()})) or 'Order items'

        payload = {
            'store_id': int(store.store_id),
            'merchant_order_id': merchant_order_id,
            'recipient_name': order.customer_name,
            'recipient_phone': normalize_phone(order.customer_phone),
            'recipient_secondary_phone': '',
            'recipient_address': order.address or order.detailed_address,
            'recipient_city': None,
            'recipient_zone': None,
            'recipient_area': None,
            'delivery_type': DEFAULT_DELIVERY_TYPE,
            'item_type': DEFAULT_ITEM_TYPE,
            'special_instruction': '',
            'item_quantity': item_quantity,
            'item_weight': float(item_weight.quantize(Decimal('0.001'))),
            'item_description': item_description,
            'amount_to_collect': int(amount_to_collect),
        }

        # Apply optional overrides from request body (if provided). Only set values
        # when user supplied non-null/meaningful values.
        if overrides:
            # recipient name validation
            if 'recipient_name' in overrides and overrides.get('recipient_name'):
                name = str(overrides.get('recipient_name'))
                if not (3 <= len(name) <= 100):
                    raise ValidationError('Recipient name must be between 3 and 100 characters.')
                payload['recipient_name'] = name

            # phones
            if 'recipient_phone' in overrides and overrides.get('recipient_phone'):
                payload['recipient_phone'] = normalize_phone(overrides.get('recipient_phone'))
            if 'recipient_secondary_phone' in overrides and overrides.get('recipient_secondary_phone'):
                payload['recipient_secondary_phone'] = normalize_phone(overrides.get('recipient_secondary_phone'))

            # address
            if 'recipient_address' in overrides and overrides.get('recipient_address'):
                addr = str(overrides.get('recipient_address'))
                if not (10 <= len(addr) <= 220):
                    raise ValidationError('Recipient address must be between 10 and 220 characters.')
                payload['recipient_address'] = addr

            # city/zone/area: optional — do not send nulls
            for key in ('recipient_city', 'recipient_zone', 'recipient_area'):
                if key in overrides and overrides.get(key) not in (None, '', 'null'):
                    try:
                        payload[key] = int(overrides.get(key))
                    except Exception:
                        raise ValidationError(f'{key} must be an integer if provided.')

            # delivery and item type
            if 'delivery_type' in overrides and overrides.get('delivery_type') is not None:
                try:
                    payload['delivery_type'] = int(overrides.get('delivery_type'))
                except Exception:
                    raise ValidationError('delivery_type must be an integer.')

            if 'item_type' in overrides and overrides.get('item_type') is not None:
                try:
                    payload['item_type'] = int(overrides.get('item_type'))
                except Exception:
                    raise ValidationError('item_type must be an integer.')

            # special instruction
            if 'special_instruction' in overrides and overrides.get('special_instruction') is not None:
                payload['special_instruction'] = str(overrides.get('special_instruction'))

            # quantities and weights
            if 'item_quantity' in overrides and overrides.get('item_quantity') is not None:
                try:
                    payload['item_quantity'] = int(overrides.get('item_quantity'))
                except Exception:
                    raise ValidationError('item_quantity must be an integer.')

            if 'item_weight' in overrides and overrides.get('item_weight') is not None:
                try:
                    w = float(overrides.get('item_weight'))
                except Exception:
                    raise ValidationError('item_weight must be a number (kg).')
                if not (0.5 <= w <= 10.0):
                    raise ValidationError('item_weight must be between 0.5 and 10 kg.')
                payload['item_weight'] = float(Decimal(str(w)).quantize(Decimal('0.001')))

            # description
            if 'item_description' in overrides and overrides.get('item_description') is not None:
                payload['item_description'] = str(overrides.get('item_description'))

            # amount to collect
            if 'amount_to_collect' in overrides and overrides.get('amount_to_collect') is not None:
                try:
                    payload['amount_to_collect'] = int(overrides.get('amount_to_collect'))
                except Exception:
                    raise ValidationError('amount_to_collect must be an integer.')

            # merchant provided store_id / merchant_order_id
            if 'store_id' in overrides and overrides.get('store_id') not in (None, ''):
                try:
                    payload['store_id'] = int(overrides.get('store_id'))
                except Exception:
                    raise ValidationError('store_id must be an integer.')

            if 'merchant_order_id' in overrides and overrides.get('merchant_order_id'):
                payload['merchant_order_id'] = str(overrides.get('merchant_order_id'))

        return payload

    @transaction.atomic
    def create_delivery(self, order, overrides=None, *, provider: str = PATHAO_PROVIDER):
        if hasattr(order, 'courier_order'):
            raise ValidationError('Courier delivery already exists for this order.')

        if not order.address:
            raise ValidationError('Order address is required.')

        store = self._get_store(provider)
        payload = self._build_payload(order, store, overrides=overrides, provider=provider)

        _, access_token = token_service.get_valid_access_token(provider)
        client = PathaoClient(access_token=access_token)

        try:
            response = client.create_order(payload)
        except PathaoAPIError as exc:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('Pathao create order failed for order %s with payload %s', order.order_id, payload)
            raise ValidationError(str(exc)) from exc

        data = response.get('data', response)
        consignment_id = data.get('consignment_id') or data.get('consignmentId')
        if not consignment_id:
            raise ValidationError('Pathao did not return a consignment id.')

        courier_order = CourierOrder.objects.create(
            order=order,
            provider=provider,
            consignment_id=str(consignment_id),
            merchant_order_id=payload['merchant_order_id'],
            delivery_fee=Decimal(str(data.get('delivery_fee', 0) or 0)),
            amount_to_collect=Decimal(str(payload['amount_to_collect'])),
            delivery_type=payload['delivery_type'],
            current_status=data.get('order_status', ''),
            status=data.get('order_status', ''),
            current_status_slug=PATHAO_STATUS_MAP.get(data.get('order_status', ''), str(data.get('order_status', '')).lower().replace(' ', '_')),
            last_synced_at=timezone.now(),
            raw_response=response,
        )
        return courier_order

    def get_delivery_status(self, order):
        return get_courier_order_for_order(order)

    @transaction.atomic
    def bulk_create_deliveries(self, orders, *, provider: str = PATHAO_PROVIDER):
        results = []
        for order in orders:
            if hasattr(order, 'courier_order'):
                continue
            try:
                results.append(self.create_delivery(order, provider=provider))
            except ValidationError:
                continue
        return results


courier_order_service = CourierOrderService()
