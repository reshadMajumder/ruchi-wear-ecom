from __future__ import annotations

from django.core.exceptions import ValidationError

from courier.clients.pathao import PathaoClient, PathaoAPIError
from courier.selectors.courier_selectors import get_active_courier_store, get_courier_store_by_store_id
from courier.services.token_service import token_service
from courier.utils import DEFAULT_DELIVERY_TYPE, DEFAULT_ITEM_TYPE, PATHAO_PROVIDER, decimalize, quantize_weight


class CourierPricingService:
    def calculate_price(self, *, item_weight, recipient_city, recipient_zone, delivery_type=DEFAULT_DELIVERY_TYPE, item_type=DEFAULT_ITEM_TYPE, store_id=None, provider: str = PATHAO_PROVIDER):
        _, access_token = token_service.get_valid_access_token(provider)
        client = PathaoClient(access_token=access_token)

        store = get_courier_store_by_store_id(provider, store_id) if store_id is not None else get_active_courier_store(provider)
        if store is None:
            raise ValidationError('No active courier store found.')

        payload = {
            'store_id': int(store.store_id),
            'item_type': int(item_type),
            'delivery_type': int(delivery_type),
            'item_weight': float(quantize_weight(item_weight)),
            'recipient_city': int(recipient_city),
            'recipient_zone': int(recipient_zone),
        }

        try:
            response = client.calculate_price(payload)
        except PathaoAPIError as exc:
            raise ValidationError(str(exc)) from exc

        data = response.get('data', response)
        return {
            'request': payload,
            'price': decimalize(data.get('price')),
            'final_price': decimalize(data.get('final_price', data.get('price'))),
            'cod_percentage': decimalize(data.get('cod_percentage')),
            'additional_charge': decimalize(data.get('additional_charge')),
            'raw_response': response,
        }


courier_pricing_service = CourierPricingService()
