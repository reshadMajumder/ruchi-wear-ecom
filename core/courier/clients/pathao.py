from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings

from courier.utils import load_pathao_env_config


class PathaoAPIError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class PathaoAPIConfig:
    base_url: str
    timeout: int = 15


class PathaoClient:
    def __init__(self, access_token: str | None = None, base_url: str | None = None, timeout: int | None = None):
        env_config = load_pathao_env_config()
        self.config = PathaoAPIConfig(
            base_url=(base_url or env_config['base_url']).rstrip('/'),
            timeout=timeout or int(getattr(settings, 'PATHAO_TIMEOUT', 15)),
        )
        self.access_token = access_token
        self.session = requests.Session()

    def _headers(self, authenticated: bool = True) -> dict[str, str]:
        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}
        if authenticated and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers

    def request(self, method: str, path: str, *, json_data: dict[str, Any] | None = None, authenticated: bool = True) -> dict[str, Any]:
        url = f'{self.config.base_url}{path}'
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=json_data,
                headers=self._headers(authenticated=authenticated),
                timeout=self.config.timeout,
            )
        except requests.RequestException as exc:
            raise PathaoAPIError(str(exc)) from exc

        try:
            payload = response.json()
        except ValueError:
            payload = {'raw': response.text}

        if response.status_code >= 400:
            if isinstance(payload, dict):
                message = (
                    payload.get('message')
                    or payload.get('error')
                    or payload.get('detail')
                    or payload.get('raw')
                    or payload.get('errors')
                    or payload
                )
            else:
                message = payload
            # If unauthorized and the request was authenticated, try to refresh
            # the token once and retry the request.
            if response.status_code == 401 and authenticated:
                try:
                    # Import here to avoid circular imports at module load time
                    from courier.services.token_service import token_service

                    # Obtain a fresh token (this will refresh or issue as needed)
                    _, new_token = token_service.get_valid_access_token()
                    # Update our session token and retry once
                    self.access_token = new_token
                    try:
                        response = self.session.request(
                            method=method,
                            url=url,
                            json=json_data,
                            headers=self._headers(authenticated=authenticated),
                            timeout=self.config.timeout,
                        )
                    except requests.RequestException as exc:
                        raise PathaoAPIError(str(exc)) from exc

                    try:
                        payload = response.json()
                    except ValueError:
                        payload = {'raw': response.text}

                    if response.status_code >= 400:
                        # still an error after retry
                        if isinstance(payload, dict):
                            message = (
                                payload.get('message')
                                or payload.get('error')
                                or payload.get('detail')
                                or payload.get('raw')
                                or payload.get('errors')
                                or payload
                            )
                        else:
                            message = payload
                        raise PathaoAPIError(message, status_code=response.status_code)
                    return payload
                except Exception:
                    # If refresh or retry failed, fall through to raise original error
                    raise PathaoAPIError(message, status_code=response.status_code)

            raise PathaoAPIError(message, status_code=response.status_code)

        return payload

    def issue_token(self, client_id: str, client_secret: str, username: str, password: str, *, refresh_token: str | None = None) -> dict[str, Any]:
        payload = {
            'client_id': client_id,
            'client_secret': client_secret,
        }
        if refresh_token:
            payload['grant_type'] = 'refresh_token'
            payload['refresh_token'] = refresh_token
        else:
            payload['grant_type'] = 'password'
            payload['username'] = username
            payload['password'] = password
        return self.request('POST', '/aladdin/api/v1/issue-token', json_data=payload, authenticated=False)

    def get_cities(self) -> dict[str, Any]:
        return self.request('GET', '/aladdin/api/v1/city-list')

    def get_zones(self, city_id: str | int) -> dict[str, Any]:
        return self.request('GET', f'/aladdin/api/v1/cities/{city_id}/zone-list')

    def get_areas(self, zone_id: str | int) -> dict[str, Any]:
        return self.request('GET', f'/aladdin/api/v1/zones/{zone_id}/area-list')

    def calculate_price(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.request('POST', '/aladdin/api/v1/merchant/price-plan', json_data=payload)

    def create_order(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.request('POST', '/aladdin/api/v1/orders', json_data=payload)

    def bulk_create_orders(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.request('POST', '/aladdin/api/v1/orders/bulk', json_data=payload)

    def get_order_info(self, consignment_id: str) -> dict[str, Any]:
        return self.request('GET', f'/aladdin/api/v1/orders/{consignment_id}/info')

    def get_stores(self) -> dict[str, Any]:
        return self.request('GET', '/aladdin/api/v1/stores')

    def create_store(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.request('POST', '/aladdin/api/v1/stores', json_data=payload)
