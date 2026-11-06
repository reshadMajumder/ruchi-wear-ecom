from __future__ import annotations

import hashlib
import hmac

from django.core.exceptions import ValidationError


class PathaoSignatureValidator:
    def __init__(self, secret: str):
        self.secret = str(secret or '')

    def validate_or_raise(self, raw_body: bytes, provided_signature: str | None) -> None:
        if not self.secret:
            raise ValidationError('Pathao webhook secret is not configured.')

        signature = str(provided_signature or '').strip()
        if not signature:
            raise ValidationError('Missing X-PATHAO-Signature header.')

        # Pathao's webhook setup provides a shared secret. Accept the raw secret
        # directly, and also allow HMAC-style values for compatibility.
        expected = hmac.new(self.secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
        accepted = {self.secret, expected, f'sha256={expected}'}
        if not any(hmac.compare_digest(signature, value) for value in accepted):
            raise ValidationError('Invalid webhook signature.')
