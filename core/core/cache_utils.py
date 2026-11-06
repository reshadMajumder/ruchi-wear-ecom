"""
Modular cache utility for DRY caching across the application.
Provides decorators and helper functions for cache management.
Can be used in any app for consistent caching patterns.
"""

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional

from django.core.cache import cache
from django.utils.decorators import method_decorator
from rest_framework.response import Response


class CacheKeyBuilder:
    """Generates consistent, namespaced cache keys across the application."""

    @staticmethod
    def build(namespace: str, identifier: str, version: str = "v1") -> str:
        """
        Build a cache key with namespace and identifier.

        Args:
            namespace: App or feature namespace (e.g., 'policy_infos')
            identifier: Unique identifier (e.g., 'faq_list', 'policy_terms')
            version: Optional version string for cache invalidation

        Returns:
            Formatted cache key: f"{namespace}:{version}:{identifier}"
        """
        return f"{namespace}:{version}:{identifier}"

    @staticmethod
    def hash_params(params: dict) -> str:
        """
        Hash query parameters to create unique cache keys for filtered queries.

        Args:
            params: Dictionary of parameters to hash

        Returns:
            Hex hash of the JSON-serialized parameters
        """
        param_json = json.dumps(params, sort_keys=True, default=str)
        return hashlib.md5(param_json.encode()).hexdigest()


class CacheManager:
    """High-level cache operations with error handling and TTL support."""

    DEFAULT_TTL = 3600  # 1 hour

    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        """
        Safely retrieve a value from cache.

        Args:
            key: Cache key
            default: Default value if key not found or error occurs

        Returns:
            Cached value or default
        """
        try:
            return cache.get(key, default)
        except Exception as e:
            # Log and fail gracefully
            print(f"Cache get error for key {key}: {e}")
            return default

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        """
        Safely set a value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (default 1 hour)

        Returns:
            True if successful, False otherwise
        """
        try:
            cache.set(key, value, ttl)
            return True
        except Exception as e:
            print(f"Cache set error for key {key}: {e}")
            return False

    @classmethod
    def delete(cls, key: str) -> bool:
        """
        Safely delete a key from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            cache.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error for key {key}: {e}")
            return False

    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """
        Delete all cache keys matching a pattern.

        Args:
            pattern: Pattern like "namespace:version:*"

        Returns:
            Number of keys deleted
        """
        try:
            delete_pattern = getattr(cache, "delete_pattern", None)
            if callable(delete_pattern):
                result = delete_pattern(pattern)
                return int(result or 0)

            keys = []
            keys_method = getattr(cache, "keys", None)
            if callable(keys_method):
                keys = keys_method(pattern)
                if keys:
                    cache.delete_many(keys)
                return len(keys) if keys else 0

            cache.clear()
            return 0
        except Exception as e:
            print(f"Cache delete pattern error for pattern {pattern}: {e}")
            return 0


def cache_response(
    namespace: str,
    identifier_fn: Optional[Callable] = None,
    ttl: int = CacheManager.DEFAULT_TTL,
):
    """
    Decorator for caching API view responses.

    Usage:
        @cache_response('policy_infos', identifier_fn=lambda req: 'faq_list')
        def get(self, request):
            ...

    Args:
        namespace: Cache namespace (e.g., 'policy_infos')
        identifier_fn: Function(request) -> identifier string; if None, uses method name
        ttl: Cache time-to-live in seconds

    Returns:
        Decorator function
    """

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Build cache key
            identifier = (
                identifier_fn(request, *args, **kwargs)
                if identifier_fn
                else view_func.__name__
            )
            cache_key = CacheKeyBuilder.build(namespace, identifier)

            # Try to get from cache
            cached_response = CacheManager.get(cache_key)
            if cached_response is not None:
                return Response(cached_response, status=200)

            # Execute view and cache response
            response = view_func(self, request, *args, **kwargs)

            # Only cache successful responses (2xx status codes)
            if isinstance(response, Response) and 200 <= response.status_code < 300:
                CacheManager.set(cache_key, response.data, ttl)

            return response

        return wrapper

    return decorator


def invalidate_cache(namespace: str, identifiers: list[str]) -> None:
    """
    Invalidate specific cache keys by identifiers.

    Usage:
        invalidate_cache('policy_infos', ['faq_list', 'policy_terms'])

    Args:
        namespace: Cache namespace
        identifiers: List of identifiers to invalidate
    """
    for identifier in identifiers:
        cache_key = CacheKeyBuilder.build(namespace, identifier)
        CacheManager.delete(cache_key)


def invalidate_cache_pattern(namespace: str) -> None:
    """
    Invalidate all cache keys under a namespace.

    Usage:
        invalidate_cache_pattern('policy_infos')

    Args:
        namespace: Cache namespace to invalidate
    """
    pattern = f"{namespace}:*"
    CacheManager.delete_pattern(pattern)
