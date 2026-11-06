from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from courier.models import CourierCredential, CourierOrder, CourierStore


class CourierCitySerializer(serializers.Serializer):
    city_id = serializers.CharField()
    city_name = serializers.CharField()


class CourierZoneSerializer(serializers.Serializer):
    zone_id = serializers.CharField()
    zone_name = serializers.CharField()


class CourierAreaSerializer(serializers.Serializer):
    area_id = serializers.CharField()
    area_name = serializers.CharField()
    home_delivery_available = serializers.BooleanField(required=False)
    pickup_available = serializers.BooleanField(required=False)


class CourierMerchantStoreSerializer(serializers.Serializer):
    store_id = serializers.IntegerField()
    store_name = serializers.CharField(allow_blank=True, required=False)
    store_address = serializers.CharField()
    is_active = serializers.IntegerField()
    city_id = serializers.IntegerField()
    zone_id = serializers.IntegerField()
    hub_id = serializers.IntegerField(required=False, allow_null=True)
    is_default_store = serializers.BooleanField(required=False)
    is_default_return_store = serializers.BooleanField(required=False)


class CourierStoreCreateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    contact_name = serializers.CharField(max_length=50)
    contact_number = serializers.CharField(max_length=11)
    secondary_contact = serializers.CharField(max_length=11, required=False, allow_blank=True)
    otp_number = serializers.CharField(max_length=11, required=False, allow_blank=True)
    address = serializers.CharField(max_length=120)
    city_id = serializers.IntegerField()
    zone_id = serializers.IntegerField()
    area_id = serializers.IntegerField()


class CourierPriceRequestSerializer(serializers.Serializer):
    recipient_city = serializers.IntegerField()
    recipient_zone = serializers.IntegerField()
    item_weight = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal('0.001'))
    delivery_type = serializers.IntegerField(required=False, default=48)
    item_type = serializers.IntegerField(required=False, default=2)
    store_id = serializers.IntegerField(required=False, allow_null=True)


class CourierPriceResponseSerializer(serializers.Serializer):
    request = serializers.DictField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    cod_percentage = serializers.DecimalField(max_digits=10, decimal_places=2)
    additional_charge = serializers.DecimalField(max_digits=10, decimal_places=2)
    raw_response = serializers.DictField()


class CourierBulkCreateDeliverySerializer(serializers.Serializer):
    order_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)


class CourierStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierStore
        fields = ['id', 'provider', 'store_id', 'store_name', 'city_id', 'zone_id', 'area_id', 'is_active', 'created_at', 'updated_at']


class CourierOrderSerializer(serializers.ModelSerializer):
    order_public_id = serializers.CharField(source='order.public_order_id', read_only=True)
    order_status = serializers.CharField(source='current_status', read_only=True)

    class Meta:
        model = CourierOrder
        fields = [
            'id',
            'provider',
            'order_public_id',
            'consignment_id',
            'merchant_order_id',
            'delivery_fee',
            'amount_to_collect',
            'delivery_type',
            'order_status',
            'current_status_slug',
            'last_synced_at',
            'raw_response',
            'created_at',
            'updated_at',
        ]


class CourierOrderStatusSerializer(serializers.ModelSerializer):
    order_public_id = serializers.CharField(source='order.public_order_id', read_only=True)

    class Meta:
        model = CourierOrder
        fields = [
            'order_public_id',
            'consignment_id',
            'merchant_order_id',
            'current_status',
            'current_status_slug',
            'delivery_fee',
            'amount_to_collect',
            'last_synced_at',
            'raw_response',
        ]


class PathaoWebhookSerializer(serializers.Serializer):
    """Flexible webhook serializer that captures all Pathao webhook fields."""
    event = serializers.CharField(required=False, allow_blank=True)
    type = serializers.CharField(required=False, allow_blank=True)
    event_name = serializers.CharField(required=False, allow_blank=True)
    consignment_id = serializers.CharField(required=False, allow_blank=True)
    consignmentId = serializers.CharField(required=False, allow_blank=True)
    merchant_order_id = serializers.CharField(required=False, allow_blank=True)
    merchantOrderId = serializers.CharField(required=False, allow_blank=True)
    store_id = serializers.CharField(required=False, allow_blank=True)
    collected_amount = serializers.CharField(required=False, allow_blank=True)
    amount_collected = serializers.CharField(required=False, allow_blank=True)
    order_status = serializers.CharField(required=False, allow_blank=True)
    delivery_fee = serializers.CharField(required=False, allow_blank=True)
    return_consignment_id = serializers.CharField(required=False, allow_blank=True)
    returnConsignmentId = serializers.CharField(required=False, allow_blank=True)
    updated_at = serializers.CharField(required=False, allow_blank=True)
    timestamp = serializers.CharField(required=False, allow_blank=True)
    data = serializers.DictField(required=False)

    def to_representation(self, instance):
        """Pass through all validated fields to preserve original structure."""
        return self.validated_data


class AdminRestoreStockSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class CourierCredentialAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierCredential
        fields = ['id', 'provider', 'client_id', 'username', 'expires_at', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['expires_at', 'created_at', 'updated_at']
