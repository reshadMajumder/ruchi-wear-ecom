from __future__ import annotations

from django.db import models

from order.models import Order

from .utils import PATHAO_PROVIDER


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CourierCredential(TimeStampedModel):
    provider = models.CharField(max_length=50, default=PATHAO_PROVIDER, db_index=True)
    client_id = models.CharField(max_length=255)
    client_secret = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    access_token = models.TextField(blank=True, default='')
    refresh_token = models.TextField(blank=True, default='')
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['provider', 'is_active'], name='courier_cred_provider_idx')]

    def __str__(self) -> str:
        return f'{self.provider} credential'


class CourierStore(TimeStampedModel):
    provider = models.CharField(max_length=50, default=PATHAO_PROVIDER, db_index=True)
    store_id = models.CharField(max_length=50)
    store_name = models.CharField(max_length=255)
    store_address = models.TextField(blank=True, default='')
    contact_name = models.CharField(max_length=255, blank=True, default='')
    contact_number = models.CharField(max_length=20, blank=True, default='')
    secondary_contact = models.CharField(max_length=20, blank=True, default='')
    otp_number = models.CharField(max_length=20, blank=True, default='')
    city_id = models.CharField(max_length=50, blank=True, default='')
    zone_id = models.CharField(max_length=50, blank=True, default='')
    area_id = models.CharField(max_length=50, blank=True, default='')
    hub_id = models.CharField(max_length=50, blank=True, default='')
    is_default_store = models.BooleanField(default=False)
    is_default_return_store = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    raw_response = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider', 'store_id'], name='unique_courier_store_per_provider'),
        ]
        indexes = [models.Index(fields=['provider', 'is_active'], name='courier_store_provider_idx')]

    def __str__(self) -> str:
        return self.store_name


class CourierOrder(TimeStampedModel):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='courier_order')
    courier_name = models.CharField(max_length=50, default=PATHAO_PROVIDER, db_index=True)
    provider = models.CharField(max_length=50, default=PATHAO_PROVIDER, db_index=True)
    consignment_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    return_consignment_id = models.CharField(max_length=100, null=True, blank=True)
    merchant_order_id = models.CharField(max_length=100, unique=True)
    store_id = models.CharField(max_length=50, blank=True, default='')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    collected_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_to_collect = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_type = models.IntegerField(default=48)
    current_status = models.CharField(max_length=100, blank=True, default='')
    current_status_slug = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=100, blank=True, default='')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    courier_payload = models.JSONField(default=dict, blank=True)
    is_returned = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)
    is_stock_restored = models.BooleanField(default=False)
    raw_response = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['provider', 'current_status'], name='courier_order_status_idx'),
            models.Index(fields=['merchant_order_id'], name='courier_order_merchant_idx'),
        ]

    def __str__(self) -> str:
        return self.consignment_id or self.merchant_order_id


class CourierWebhookLog(models.Model):
    event = models.CharField(max_length=120, db_index=True)
    consignment_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    signature = models.CharField(max_length=255, blank=True, default='')
    payload_hash = models.CharField(max_length=64, unique=True, db_index=True)
    processed = models.BooleanField(default=False, db_index=True)
    processing_error = models.TextField(blank=True, default='')
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', 'received_at'], name='courier_webhook_evt_idx'),
            models.Index(fields=['consignment_id', 'received_at'], name='courier_webhook_cons_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.event}:{self.consignment_id or "unknown"}'
