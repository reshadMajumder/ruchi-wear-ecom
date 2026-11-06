from __future__ import annotations

import logging

from celery import shared_task

from courier.services.order_service import courier_order_service
from courier.services.sync_service import sync_all_courier_orders, sync_merchant_stores
from order.models import Order


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_courier_orders_task(self):
    try:
        synced = sync_all_courier_orders()
        return {'synced': len(synced)}
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_merchant_stores_task(self):
    logger.info('sync_merchant_stores_task started')
    try:
        stores = sync_merchant_stores()
        logger.info('sync_merchant_stores_task completed with %s stores', len(stores))
        return {'synced': len(stores)}
    except Exception as exc:
        logger.exception('sync_merchant_stores_task failed')
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def bulk_create_delivery_task(self, order_ids):
    created = []
    for order_id in order_ids:
        try:
            order = Order.objects.prefetch_related('items__variant').get(order_id=order_id)
            if hasattr(order, 'courier_order'):
                continue
            created.append(courier_order_service.create_delivery(order))
        except Exception:
            continue
    return {'created': len(created)}
