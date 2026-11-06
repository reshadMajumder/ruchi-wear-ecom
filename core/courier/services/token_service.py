from __future__ import annotations

from datetime import timedelta
from typing import Tuple

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from courier.clients.pathao import PathaoClient, PathaoAPIError
from courier.models import CourierCredential
from courier.selectors.courier_selectors import get_active_courier_credential
from courier.utils import PATHAO_PROVIDER, load_pathao_env_config


class TokenService:
    TOKEN_BUFFER_SECONDS = 60

    def _seed_from_env(self, provider: str) -> CourierCredential:
        if provider != PATHAO_PROVIDER:
            raise ValidationError(f'{provider} is not supported yet.')

        env = load_pathao_env_config()
        missing = [key for key, value in env.items() if not value]
        if missing:
            raise ValidationError(
                'Pathao credentials are missing in the environment: ' + ', '.join(sorted(missing))
            )

        credential, _ = CourierCredential.objects.update_or_create(
            provider=provider,
            defaults={
                'client_id': env['client_id'],
                'client_secret': env['client_secret'],
                'username': env['username'],
                'password': env['password'],
                'is_active': True,
            },
        )
        return credential

    def get_credential(self, provider: str = PATHAO_PROVIDER) -> CourierCredential:
        credential = get_active_courier_credential(provider)
        if credential:
            return credential
        return self._seed_from_env(provider)

    def _is_token_valid(self, credential: CourierCredential) -> bool:
        if not credential.access_token or not credential.expires_at:
            return False
        return credential.expires_at > timezone.now() + timedelta(seconds=self.TOKEN_BUFFER_SECONDS)

    def issue_access_token(self, credential: CourierCredential) -> CourierCredential:
        client = PathaoClient()
        payload = client.issue_token(
            credential.client_id,
            credential.client_secret,
            credential.username,
            credential.password,
        )

        expires_in = int(payload.get('expires_in', 0) or 0)
        credential.access_token = payload.get('access_token', '')
        credential.refresh_token = payload.get('refresh_token', '')
        credential.expires_at = timezone.now() + timedelta(seconds=expires_in)
        credential.save(update_fields=['access_token', 'refresh_token', 'expires_at', 'updated_at'])
        return credential

    def refresh_access_token(self, credential: CourierCredential) -> CourierCredential:
        if not credential.refresh_token:
            return self.issue_access_token(credential)

        client = PathaoClient()
        try:
            payload = client.issue_token(
                credential.client_id,
                credential.client_secret,
                credential.username,
                credential.password,
                refresh_token=credential.refresh_token,
            )
        except PathaoAPIError:
            return self.issue_access_token(credential)

        expires_in = int(payload.get('expires_in', 0) or 0)
        credential.access_token = payload.get('access_token', '')
        credential.refresh_token = payload.get('refresh_token', credential.refresh_token)
        credential.expires_at = timezone.now() + timedelta(seconds=expires_in)
        credential.save(update_fields=['access_token', 'refresh_token', 'expires_at', 'updated_at'])
        return credential

    @transaction.atomic
    def get_valid_access_token(self, provider: str = PATHAO_PROVIDER) -> Tuple[CourierCredential, str]:
        credential = CourierCredential.objects.select_for_update().filter(provider=provider, is_active=True).order_by('-updated_at').first()
        if credential is None:
            credential = self._seed_from_env(provider)

        # If environment credentials changed, update stored credential and
        # clear existing tokens so a fresh token will be issued.
        try:
            env = load_pathao_env_config()
        except Exception:
            env = {}

        env_keys = ('client_id', 'client_secret', 'username', 'password')
        need_update = False
        for key in env_keys:
            env_val = env.get(key)
            if env_val and getattr(credential, key, None) != env_val:
                setattr(credential, key, env_val)
                need_update = True

        if need_update:
            credential.access_token = ''
            credential.refresh_token = ''
            credential.expires_at = None
            credential.save(update_fields=['client_id', 'client_secret', 'username', 'password', 'access_token', 'refresh_token', 'expires_at', 'updated_at'])

        if self._is_token_valid(credential):
            return credential, credential.access_token

        if credential.refresh_token:
            credential = self.refresh_access_token(credential)
        else:
            credential = self.issue_access_token(credential)

        if not credential.access_token:
            raise ValidationError('Unable to obtain Pathao access token.')

        return credential, credential.access_token


token_service = TokenService()
