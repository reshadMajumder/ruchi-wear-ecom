from rest_framework import serializers


class VariantCreateSerializer(serializers.Serializer):
    sku = serializers.CharField()
    stock = serializers.IntegerField(min_value=0)
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, default=0)
    attributes = serializers.ListField(
        child=serializers.IntegerField()
    )


class VariantUpdateSerializer(serializers.Serializer):
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    attributes = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )


class StockUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField()
    operation = serializers.ChoiceField(choices=["increase", "decrease"])