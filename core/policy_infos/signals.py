"""
Django signals for cache invalidation on model changes.
Automatically clears cached FAQ and policy data when database is updated.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from core.cache_utils import invalidate_cache, invalidate_cache_pattern

from .models import FAQ, PolicyTerms


# Cache invalidation keys for policy_infos
POLICY_INFOS_NAMESPACE = "policy_infos"
CACHE_KEYS = {
    "policy_terms": "policy_terms",
    "faq_list": "faq_list",
    "faq_public_list": "faq_public_list",
}


@receiver(post_save, sender=PolicyTerms)
@receiver(post_delete, sender=PolicyTerms)
def invalidate_policy_terms_cache(sender, instance, **kwargs):
    """
    Invalidate policy & terms cache on create, update, or delete.
    """
    invalidate_cache(POLICY_INFOS_NAMESPACE, [CACHE_KEYS["policy_terms"]])


@receiver(post_save, sender=FAQ)
@receiver(post_delete, sender=FAQ)
def invalidate_faq_cache(sender, instance, **kwargs):
    """
    Invalidate FAQ cache (both admin and public lists) on create, update, or delete.
    Includes deletion of per-FAQ detail cache keys.
    """
    # Invalidate list endpoints
    invalidate_cache(
        POLICY_INFOS_NAMESPACE,
        [CACHE_KEYS["faq_list"], CACHE_KEYS["faq_public_list"]],
    )

    # Invalidate detail cache for this specific FAQ
    detail_key = f"faq_detail_{instance.id}"
    invalidate_cache(POLICY_INFOS_NAMESPACE, [detail_key])
