from __future__ import annotations

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone

from courier.clients.pathao import PathaoClient, PathaoAPIError
from courier.models import CourierOrder, CourierStore
from courier.services.token_service import token_service
from courier.selectors.courier_selectors import get_pending_courier_orders
from courier.utils import CACHE_TTL_24_HOURS, PATHAO_PROVIDER, PATHAO_STATUS_MAP
import logging
from django.db import DatabaseError

logger = logging.getLogger(__name__)


def _extract_list(payload):
    if isinstance(payload, dict):
        for key in ('data', 'result', 'results'):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        if isinstance(payload.get('data'), dict):
            inner = payload['data']
            for key in ('data', 'result', 'results'):
                value = inner.get(key)
                if isinstance(value, list):
                    return value
    if isinstance(payload, list):
        return payload
    return []


def _cache_fetch(cache_key, loader):
    try:
        cached = cache.get(cache_key)
    except Exception:
        cached = None

    if cached is not None:
        return cached

    data = loader()
    try:
        cache.set(cache_key, data, CACHE_TTL_24_HOURS)
    except Exception:
        pass
    return data


def _normalize_location_rows(payload, item_key: str, name_key: str):
    rows = _extract_list(payload)
    normalized = []
    for row in rows:
        normalized.append(
            {
                item_key: row.get(item_key) or row.get('id') or row.get('city_id') or row.get('zone_id') or row.get('area_id'),
                name_key: row.get(name_key) or row.get('name') or row.get('city_name') or row.get('zone_name') or row.get('area_name'),
                'home_delivery_available': bool(row.get('home_delivery_available', True)),
                'pickup_available': bool(row.get('pickup_available', True)),
            }
        )
    return normalized


def get_cities(provider: str = PATHAO_PROVIDER):
    def loader():
        _, access_token = token_service.get_valid_access_token(provider)
        client = PathaoClient(access_token=access_token)
        payload = client.get_cities()
        return _normalize_location_rows(payload, 'city_id', 'city_name')

    return _cache_fetch(f'courier:{provider}:cities', loader)


def get_zones(city_id, provider: str = PATHAO_PROVIDER):
    def loader():
        _, access_token = token_service.get_valid_access_token(provider)
        client = PathaoClient(access_token=access_token)
        payload = client.get_zones(city_id)
        return _normalize_location_rows(payload, 'zone_id', 'zone_name')

    return _cache_fetch(f'courier:{provider}:zones:{city_id}', loader)


def get_areas(zone_id, provider: str = PATHAO_PROVIDER):
    def loader():
        _, access_token = token_service.get_valid_access_token(provider)
        client = PathaoClient(access_token=access_token)
        payload = client.get_areas(zone_id)
        return _normalize_location_rows(payload, 'area_id', 'area_name')

    return _cache_fetch(f'courier:{provider}:areas:{zone_id}', loader)


def sync_merchant_stores(provider: str = PATHAO_PROVIDER):
    """Fetch stores from Pathao API, clear old stores, and save fresh data."""
    _, access_token = token_service.get_valid_access_token(provider)
    client = PathaoClient(access_token=access_token)

    try:
        payload = client.get_stores()
    except PathaoAPIError as exc:
        raise ValidationError(str(exc)) from exc

    stores = _extract_list(payload)
    
    # Delete all existing stores for this provider and create fresh ones
    CourierStore.objects.filter(provider=provider).delete()
    
    synced = []
    for store_data in stores:
        store_id = store_data.get('store_id') or store_data.get('id')
        if store_id is None:
            continue
        try:
            store = CourierStore.objects.create(
                provider=provider,
                store_id=str(store_id),
                store_name=store_data.get('store_name') or store_data.get('name') or f'Store {store_id}',
                store_address=store_data.get('store_address') or store_data.get('address') or '',
                contact_name=store_data.get('contact_name') or '',
                contact_number=str(store_data.get('contact_number') or ''),
                secondary_contact=str(store_data.get('secondary_contact') or ''),
                otp_number=str(store_data.get('otp_number') or ''),
                city_id=str(store_data.get('city_id') or ''),
                zone_id=str(store_data.get('zone_id') or ''),
                area_id=str(store_data.get('area_id') or ''),
                hub_id=str(store_data.get('hub_id') or ''),
                is_default_store=bool(store_data.get('is_default_store', False)),
                is_default_return_store=bool(store_data.get('is_default_return_store', False)),
                is_active=bool(store_data.get('is_active', True)),
                raw_response=store_data,
            )
            synced.append(store)
        except DatabaseError as exc:
            logger.exception('Database error when syncing store %s: %s', store_id, exc)
            continue
        except Exception as exc:
            logger.exception('Unexpected error when syncing store %s: %s', store_id, exc)
            continue

    return synced


def create_merchant_store(payload: dict, provider: str = PATHAO_PROVIDER):
    _, access_token = token_service.get_valid_access_token(provider)
    client = PathaoClient(access_token=access_token)

    try:
        response = client.create_store(payload)
    except PathaoAPIError as exc:
        raise ValidationError(str(exc)) from exc

    data = response.get('data', response)
    store_name = data.get('store_name') or payload.get('name') or payload.get('store_name') or ''
    store_id = data.get('store_id') or data.get('id') or payload.get('store_id') or payload.get('id') or f'pending:{store_name}'

    store, _ = CourierStore.objects.update_or_create(
        provider=provider,
        store_id=str(store_id),
        defaults={
            'store_name': store_name,
            'store_address': payload.get('address', ''),
            'contact_name': payload.get('contact_name', ''),
            'contact_number': str(payload.get('contact_number', '')),
            'secondary_contact': str(payload.get('secondary_contact', '')),
            'otp_number': str(payload.get('otp_number', '')),
            'city_id': str(payload.get('city_id', '')),
            'zone_id': str(payload.get('zone_id', '')),
            'area_id': str(payload.get('area_id', '')),
            'hub_id': str(data.get('hub_id') or payload.get('hub_id') or ''),
            'is_default_store': bool(data.get('is_default_store', False)),
            'is_default_return_store': bool(data.get('is_default_return_store', False)),
            'is_active': bool(data.get('is_active', True)),
            'raw_response': response,
        },
    )
    return store, response


def sync_courier_order(courier_order: CourierOrder):
    if not courier_order.consignment_id:
        raise ValidationError('Courier order has no consignment id yet.')

    _, access_token = token_service.get_valid_access_token(courier_order.provider)
    client = PathaoClient(access_token=access_token)

    try:
        payload = client.get_order_info(courier_order.consignment_id)
    except PathaoAPIError as exc:
        raise ValidationError(str(exc)) from exc

    data = payload.get('data', payload)
    status_text = data.get('order_status') or data.get('status') or ''
    courier_order.current_status = status_text
    courier_order.current_status_slug = PATHAO_STATUS_MAP.get(status_text, status_text.lower().replace(' ', '_')) if status_text else ''
    courier_order.last_synced_at = timezone.now()
    courier_order.raw_response = payload
    courier_order.save(update_fields=['current_status', 'current_status_slug', 'last_synced_at', 'raw_response', 'updated_at'])
    return courier_order


def sync_all_courier_orders(provider: str = PATHAO_PROVIDER, limit: int | None = None):
    queryset = get_pending_courier_orders(provider)
    if limit:
        queryset = queryset[:limit]

    results = []
    for courier_order in queryset.iterator(chunk_size=50):
        try:
            results.append(sync_courier_order(courier_order))
        except ValidationError:
            continue
    return results
