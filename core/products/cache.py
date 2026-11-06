from __future__ import annotations

from typing import Any, Mapping

from core.cache_utils import CacheKeyBuilder, invalidate_cache_pattern


NAMESPACE = "products"
DEFAULT_TTL = 300


def _normalize_value(value: Any) -> Any:
    if isinstance(value, (list, tuple, set)):
        return sorted(_normalize_value(item) for item in value)
    if value is None:
        return None
    return str(value).strip()


def _normalize_mapping(mapping: Mapping[str, Any] | None) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    if not mapping:
        return normalized

    for key in sorted(mapping.keys()):
        normalized[key] = _normalize_value(mapping[key])
    return normalized


def build_cache_identifier(
    endpoint: str,
    *,
    query_params: Mapping[str, Any] | None = None,
    path_params: Mapping[str, Any] | None = None,
    positional_args: tuple[Any, ...] | None = None,
) -> str:
    payload = {
        "endpoint": endpoint,
        "query_params": _normalize_mapping(query_params),
        "path_params": _normalize_mapping(path_params),
        "positional_args": [_normalize_value(value) for value in (positional_args or ())],
    }
    signature = CacheKeyBuilder.hash_params(payload)
    return f"{endpoint}:{signature}"


def build_cache_key(
    endpoint: str,
    *,
    query_params: Mapping[str, Any] | None = None,
    path_params: Mapping[str, Any] | None = None,
    positional_args: tuple[Any, ...] | None = None,
) -> str:
    return CacheKeyBuilder.build(
        NAMESPACE,
        build_cache_identifier(
            endpoint,
            query_params=query_params,
            path_params=path_params,
            positional_args=positional_args,
        ),
    )


def build_request_cache_identifier(endpoint: str, request, *args, **kwargs) -> str:
    query_params = {}
    if hasattr(request, "query_params"):
        for key in request.query_params.keys():
            values = request.query_params.getlist(key)
            if len(values) == 1:
                query_params[key] = values[0]
            else:
                query_params[key] = values

    return build_cache_identifier(
        endpoint,
        query_params=query_params,
        path_params=kwargs,
        positional_args=args,
    )


def invalidate_products_cache() -> None:
    invalidate_cache_pattern(NAMESPACE)


def product_list_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("product_list", request, *args, **kwargs)


def discounted_product_list_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("discounted_product_list", request, *args, **kwargs)


def sections_list_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("sections_list", request, *args, **kwargs)


def section_detail_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("section_detail", request, *args, **kwargs)


def section_products_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("section_products", request, *args, **kwargs)


def product_detail_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("product_detail", request, *args, **kwargs)


def related_products_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("related_products", request, *args, **kwargs)


def product_tag_cache_identifier(request, *args, **kwargs) -> str:
    return build_request_cache_identifier("product_tags", request, *args, **kwargs)