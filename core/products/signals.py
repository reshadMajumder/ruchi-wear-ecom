import logging

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from discount.cache import invalidate_discounts_cache

from .cache import invalidate_products_cache
from .models import Category, Product, ProductImage, ProductTag, ProductType, ProductVariant, Section, SectionProduct


logger = logging.getLogger(__name__)


def _invalidate_products_cache(reason: str) -> None:
    invalidate_products_cache()
    logger.info("Products cache invalidated: %s", reason)


def _invalidate_product_and_discount_caches(reason: str) -> None:
    invalidate_products_cache()
    invalidate_discounts_cache()
    logger.info("Products and discounts caches invalidated: %s", reason)


@receiver(post_save, sender=Product)
@receiver(post_delete, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    _invalidate_product_and_discount_caches(f"product:{instance.id}")


@receiver(post_save, sender=ProductVariant)
@receiver(post_delete, sender=ProductVariant)
def invalidate_product_variant_cache(sender, instance, **kwargs):
    _invalidate_product_cache_reason = f"product_variant:{instance.product_id}"
    _invalidate_products_cache(_invalidate_product_cache_reason)


@receiver(post_save, sender=ProductImage)
@receiver(post_delete, sender=ProductImage)
def invalidate_product_image_cache(sender, instance, **kwargs):
    _invalidate_product_and_discount_caches(f"product_image:{instance.product_id}")


@receiver(post_save, sender=Section)
@receiver(post_delete, sender=Section)
def invalidate_section_cache(sender, instance, **kwargs):
    _invalidate_products_cache(f"section:{instance.id}")


@receiver(post_save, sender=SectionProduct)
@receiver(post_delete, sender=SectionProduct)
def invalidate_section_product_cache(sender, instance, **kwargs):
    _invalidate_products_cache(f"section_product:{instance.section_id}:{instance.product_id}")


@receiver(post_save, sender=ProductTag)
@receiver(post_delete, sender=ProductTag)
def invalidate_product_tag_cache(sender, instance, **kwargs):
    _invalidate_products_cache(f"product_tag:{instance.id}")


@receiver(post_save, sender=Category)
@receiver(post_delete, sender=Category)
def invalidate_category_cache(sender, instance, **kwargs):
    _invalidate_product_and_discount_caches(f"category:{instance.id}")


@receiver(post_save, sender=ProductType)
@receiver(post_delete, sender=ProductType)
def invalidate_product_type_cache(sender, instance, **kwargs):
    _invalidate_products_cache(f"product_type:{instance.id}")


@receiver(m2m_changed, sender=Product.tags.through)
def invalidate_product_tag_relation_cache(sender, instance, action, **kwargs):
    if action in {"post_add", "post_remove", "post_clear"}:
        _invalidate_products_cache(f"product_tags:{instance.id}")