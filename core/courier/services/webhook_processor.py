from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone

from courier.models import CourierOrder, CourierWebhookLog
from courier.services.status_mapper import (
    is_cancel_event,
    is_delivered_event,
    is_return_event,
    map_pathao_event_to_order_status,
    normalize_event,
    should_auto_restore_stock,
)
from courier.services.stock_manager import courier_stock_manager
from courier.utils import PATHAO_PROVIDER, decimalize
from order.services import cancel_order, complete_order, confirm_order


logger = logging.getLogger(__name__)


def _extract_event(payload: dict[str, Any]) -> str:
    return normalize_event(payload.get('event') or payload.get('type') or payload.get('event_name'))


def _extract_data(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get('data')
    if isinstance(data, dict):
        return data
    return payload


def _extract_consignment_id(payload: dict[str, Any]) -> str:
    data = _extract_data(payload)
    value = data.get('consignment_id') or data.get('consignmentId') or payload.get('consignment_id')
    result = str(value) if value not in (None, '') else ''
    logger.debug(
        'extract_consignment_id',
        extra={
            'payload_has_data_key': 'data' in payload,
            'data_keys': list(data.keys()) if data else [],
            'value_found': value,
            'result': result,
        },
    )
    return result


def _extract_return_consignment_id(payload: dict[str, Any]) -> str:
    data = _extract_data(payload)
    value = data.get('return_consignment_id') or data.get('returnConsignmentId')
    return str(value) if value not in (None, '') else ''


def _extract_merchant_order_id(payload: dict[str, Any]) -> str:
    data = _extract_data(payload)
    value = data.get('merchant_order_id') or data.get('merchantOrderId') or payload.get('merchant_order_id')
    return str(value) if value not in (None, '') else ''


def create_webhook_log(payload: dict[str, Any], headers: dict[str, Any], signature: str) -> tuple[CourierWebhookLog, bool]:
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
    payload_hash = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    event = _extract_event(payload)
    consignment_id = _extract_consignment_id(payload)

    logger.debug(
        'webhook_log_creation',
        extra={
            'payload_keys': list(payload.keys()),
            'event': event,
            'consignment_id': consignment_id,
            'payload': payload,
        },
    )

    try:
        log = CourierWebhookLog.objects.create(
            event=event or 'unknown',
            consignment_id=consignment_id,
            payload=payload,
            headers=headers,
            signature=str(signature or ''),
            payload_hash=payload_hash,
        )
        return log, True
    except IntegrityError:
        log = CourierWebhookLog.objects.get(payload_hash=payload_hash)
        logger.info(
            'duplicate_webhook_received',
            extra={'event': log.event, 'consignment_id': log.consignment_id, 'webhook_log_id': log.id},
        )
        return log, False


class PathaoWebhookProcessor:
    @transaction.atomic
    def process_by_log_id(self, webhook_log_id: int) -> None:
        log = CourierWebhookLog.objects.select_for_update().get(pk=webhook_log_id)
        if log.processed:
            return
        try:
            payload = log.payload if isinstance(log.payload, dict) else {}
            data = _extract_data(payload)
            event = normalize_event(log.event or _extract_event(payload))
            consignment_id = _extract_consignment_id(payload)
            merchant_order_id = _extract_merchant_order_id(payload)

            logger.info(
                'webhook_processing_start',
                extra={
                    'webhook_log_id': webhook_log_id,
                    'event': event,
                    'consignment_id': consignment_id,
                    'merchant_order_id': merchant_order_id,
                },
            )

            courier_order = self._get_courier_order(consignment_id=consignment_id, merchant_order_id=merchant_order_id)
            if courier_order is None:
                log.processed = True
                error_msg = f'CourierOrder not found for webhook event (consignment_id={consignment_id}, merchant_order_id={merchant_order_id}).'
                log.processing_error = error_msg
                log.save(update_fields=['processed', 'processing_error'])
                logger.warning(
                    'webhook_courier_order_not_found',
                    extra={'webhook_log_id': webhook_log_id, 'event': event, 'consignment_id': consignment_id, 'merchant_order_id': merchant_order_id, 'error': error_msg},
                )
                return

            restored_during_cancel = self._sync_order_state(courier_order, event)

            if should_auto_restore_stock(event) and not courier_order.is_stock_restored and not restored_during_cancel:
                courier_stock_manager.restore_reserved_stock_once(courier_order, reason=f'webhook:{event}')
                courier_order.refresh_from_db(fields=['is_stock_restored'])

            self._update_courier_order(courier_order, event, payload, data, consignment_id)

            log.processed = True
            log.processing_error = ''
            log.save(update_fields=['processed', 'processing_error'])
            logger.info(
                'webhook_processing_complete',
                extra={
                    'webhook_log_id': webhook_log_id,
                    'event': event,
                    'order_id': str(courier_order.order.order_id),
                    'consignment_id': consignment_id,
                },
            )
        except Exception as exc:
            log.processing_error = str(exc)
            log.save(update_fields=['processing_error'])
            raise

    def _get_courier_order(self, *, consignment_id: str, merchant_order_id: str) -> CourierOrder | None:
        queryset = CourierOrder.objects.select_for_update().select_related('order')
        logger.debug(
            'courier_order_lookup_start',
            extra={
                'consignment_id': consignment_id,
                'merchant_order_id': merchant_order_id,
                'total_courier_orders': CourierOrder.objects.count(),
            },
        )
        
        # Try both if both are provided (strict match)
        if consignment_id and merchant_order_id:
            row = queryset.filter(consignment_id=consignment_id, merchant_order_id=merchant_order_id).first()
            if row:
                return row
            logger.warning('mismatched_ids_in_webhook', extra={'consignment_id': consignment_id, 'merchant_order_id': merchant_order_id})

        # Fallback to individual matches
        if consignment_id:
            row = queryset.filter(consignment_id=consignment_id).first()
            if row:
                return row
        
        if merchant_order_id:
            row = queryset.filter(merchant_order_id=merchant_order_id).first()
            if row:
                return row
        
        return None

    def _sync_order_state(self, courier_order: CourierOrder, event: str) -> bool:
        target = map_pathao_event_to_order_status(event)
        order = courier_order.order

        if target == 'confirmed':
            if order.status == 'pending':
                confirm_order(order.order_id)
            return False

        if target == 'completed':
            if order.status == 'pending':
                confirm_order(order.order_id)
            if order.status in {'pending', 'confirmed'}:
                complete_order(order.order_id)
            return False

        if target == 'cancelled':
            if order.status in {'pending', 'confirmed'}:
                cancel_order(order.order_id)
                courier_order.is_stock_restored = True
                courier_order.is_cancelled = True
                courier_order.save(update_fields=['is_stock_restored', 'is_cancelled', 'updated_at'])
                return True
            logger.info(
                'cancel_mapping_skipped',
                extra={'order_id': str(order.order_id), 'current_status': order.status, 'event': event},
            )
        return False

    def _update_courier_order(
        self,
        courier_order: CourierOrder,
        event: str,
        payload: dict[str, Any],
        data: dict[str, Any],
        consignment_id: str,
    ) -> None:
        status_text = str(data.get('order_status') or event)
        courier_order.courier_name = PATHAO_PROVIDER
        courier_order.provider = PATHAO_PROVIDER
        if consignment_id:
            courier_order.consignment_id = consignment_id

        return_consignment_id = _extract_return_consignment_id(payload)
        if return_consignment_id:
            courier_order.return_consignment_id = return_consignment_id

        store_id = data.get('store_id') or payload.get('store_id')
        if store_id not in (None, ''):
            courier_order.store_id = str(store_id)

        courier_order.current_status = status_text
        courier_order.status = status_text
        courier_order.current_status_slug = event.replace('.', '_').replace('-', '_')
        courier_order.last_synced_at = timezone.now()
        courier_order.delivery_fee = decimalize(data.get('delivery_fee'), str(courier_order.delivery_fee))
        courier_order.collected_amount = decimalize(
            data.get('collected_amount', data.get('amount_collected')),
            str(courier_order.collected_amount),
        )
        courier_order.courier_payload = payload
        courier_order.raw_response = payload
        courier_order.is_delivered = courier_order.is_delivered or is_delivered_event(event)
        courier_order.is_returned = courier_order.is_returned or is_return_event(event)
        courier_order.is_cancelled = courier_order.is_cancelled or is_cancel_event(event)
        courier_order.save(
            update_fields=[
                'courier_name',
                'provider',
                'consignment_id',
                'return_consignment_id',
                'store_id',
                'current_status',
                'status',
                'current_status_slug',
                'last_synced_at',
                'delivery_fee',
                'collected_amount',
                'courier_payload',
                'raw_response',
                'is_delivered',
                'is_returned',
                'is_cancelled',
                'updated_at',
            ]
        )


pathao_webhook_processor = PathaoWebhookProcessor()
