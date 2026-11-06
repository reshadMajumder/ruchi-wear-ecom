from __future__ import annotations

import logging

from django.db import transaction

from courier.models import CourierOrder
from products.models import ProductVariant


logger = logging.getLogger(__name__)


class CourierStockManager:
    @transaction.atomic
    def restore_reserved_stock_once(self, courier_order: CourierOrder, *, reason: str = '') -> bool:
        locked = CourierOrder.objects.select_for_update().select_related('order').get(pk=courier_order.pk)
        if locked.is_stock_restored:
            return False

        items = list(locked.order.items.select_related('variant').all())
        variant_ids = [item.variant_id for item in items]
        variants = ProductVariant.objects.select_for_update().in_bulk(variant_ids)

        for item in items:
            variant = variants.get(item.variant_id)
            if variant is not None:
                variant.stock += item.quantity

        for variant in variants.values():
            variant.save(update_fields=['stock'])

        locked.is_stock_restored = True
        locked.save(update_fields=['is_stock_restored', 'updated_at'])

        logger.info(
            'courier_stock_restored',
            extra={
                'order_id': str(locked.order.order_id),
                'consignment_id': locked.consignment_id,
                'reason': reason,
            },
        )
        return True


courier_stock_manager = CourierStockManager()
