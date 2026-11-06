import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .cache import invalidate_discounts_cache
from products.cache import invalidate_products_cache

from .models import CategoryDiscount, Discount, ProductDiscount


logger = logging.getLogger(__name__)


def _invalidate_products_cache(reason: str) -> None:
    invalidate_products_cache()
    logger.info("Products cache invalidated from discount app: %s", reason)


def _invalidate_discount_caches(reason: str) -> None:
    invalidate_discounts_cache()
    logger.info("Discount cache invalidated: %s", reason)


@receiver(post_save, sender=Discount)
@receiver(post_delete, sender=Discount)
def invalidate_discount_cache(sender, instance, **kwargs):
    _invalidate_discount_caches(f"discount:{instance.id}")
    _invalidate_products_cache(f"discount:{instance.id}")


@receiver(post_save, sender=ProductDiscount)
@receiver(post_delete, sender=ProductDiscount)
def invalidate_product_discount_cache(sender, instance, **kwargs):
    _invalidate_discount_caches(f"product_discount:{instance.product_id}:{instance.discount_id}")
    _invalidate_products_cache(f"product_discount:{instance.product_id}:{instance.discount_id}")


@receiver(post_save, sender=CategoryDiscount)
@receiver(post_delete, sender=CategoryDiscount)
def invalidate_category_discount_cache(sender, instance, **kwargs):
    _invalidate_discount_caches(f"category_discount:{instance.category_id}:{instance.discount_id}")
    _invalidate_products_cache(f"category_discount:{instance.category_id}:{instance.discount_id}")