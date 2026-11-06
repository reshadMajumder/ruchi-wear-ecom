from django.contrib import admin

from courier.models import CourierCredential, CourierOrder, CourierStore, CourierWebhookLog


@admin.register(CourierCredential)
class CourierCredentialAdmin(admin.ModelAdmin):
    list_display = ['provider', 'username', 'is_active', 'expires_at', 'updated_at']
    list_filter = ['provider', 'is_active']
    search_fields = ['provider', 'username', 'client_id']
    readonly_fields = ['access_token', 'refresh_token', 'expires_at', 'created_at', 'updated_at']


@admin.register(CourierStore)
class CourierStoreAdmin(admin.ModelAdmin):
    list_display = ['provider', 'store_id', 'store_name', 'city_id', 'zone_id', 'area_id', 'is_active', 'updated_at']
    list_filter = ['provider', 'is_active']
    search_fields = ['store_id', 'store_name']


@admin.register(CourierOrder)
class CourierOrderAdmin(admin.ModelAdmin):
    list_display = ['merchant_order_id', 'consignment_id', 'provider', 'current_status', 'delivery_fee', 'amount_to_collect', 'is_delivered', 'is_returned', 'is_stock_restored', 'last_synced_at', 'updated_at']
    list_filter = ['provider', 'current_status', 'current_status_slug']
    search_fields = ['merchant_order_id', 'consignment_id', 'order__public_order_id']
    readonly_fields = ['raw_response', 'created_at', 'updated_at', 'last_synced_at']


@admin.register(CourierWebhookLog)
class CourierWebhookLogAdmin(admin.ModelAdmin):
    list_display = ['event', 'consignment_id', 'processed', 'received_at']
    list_filter = ['event', 'processed', 'received_at']
    search_fields = ['event', 'consignment_id', 'payload_hash']
    readonly_fields = ['payload', 'headers', 'signature', 'payload_hash', 'processing_error', 'received_at']
