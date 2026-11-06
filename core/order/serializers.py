from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(error_messages={"required": "customer_name is required."})
    customer_phone = serializers.CharField(error_messages={"required": "customer_phone is required."})
    division = serializers.CharField(error_messages={"required": "division is required."})
    city = serializers.CharField(error_messages={"required": "city is required."})
    detailed_address = serializers.CharField(error_messages={"required": "detailed_address is required."})
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False)
    items = OrderItemInputSerializer(many=True, error_messages={"required": "items is required."})
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    is_inside_dhaka = serializers.BooleanField(default=True, required=False)

    def validate(self, attrs):
        if not attrs.get("items"):
            raise serializers.ValidationError({"items": "At least one item is required."})
        return attrs


class OrderUpdateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(required=False)
    customer_phone = serializers.CharField(required=False)
    division = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    detailed_address = serializers.CharField(required=False)
    address = serializers.CharField(required=False)
    payment_method = serializers.ChoiceField(
        choices=[choice[0] for choice in Order.PAYMENT_METHOD_CHOICES],
        required=False,
    )
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False)
    items = OrderItemInputSerializer(many=True, required=False)

    def validate(self, data):
        if "items" in data and not data["items"]:
            raise serializers.ValidationError("At least one item is required.")
        return data



class OrderItemResponseSerializer(serializers.Serializer):
    attribute_values = serializers.SerializerMethodField()
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    variant_id = serializers.IntegerField(source="variant.id")
    variant_sku = serializers.CharField(source="variant.sku")
    actual_selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)

    def get_attribute_values(self, obj):
        return [
            {
                "attribute": attr.attribute_value.attribute.name,
                "value": attr.attribute_value.value,
            }
            for attr in obj.variant.attributes.select_related("attribute_value__attribute").all()
        ]


class OrderResponseSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    public_order_id = serializers.CharField()
    customer_name = serializers.CharField()
    customer_phone = serializers.CharField()
    division = serializers.CharField()
    city = serializers.CharField()
    detailed_address = serializers.CharField()
    address = serializers.CharField()
    weight = serializers.DecimalField(max_digits=10, decimal_places=3)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount_before_discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    coupon_code = serializers.CharField(allow_null=True)
    coupon_discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    delivery_charge = serializers.DecimalField(max_digits=10, decimal_places=2)
    vat_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    items = OrderItemResponseSerializer(many=True)
    payment_method = serializers.CharField()
    is_paid = serializers.BooleanField()


class OrderPriceCalculatorResponseSerializer(serializers.Serializer):
    total_amount_before_discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    discounted_subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    coupon_code = serializers.CharField(allow_null=True)
    coupon_discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    delivery_charge = serializers.DecimalField(max_digits=10, decimal_places=2)
    vat_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_inside_dhaka = serializers.BooleanField()


class OrderStatementItemSerializer(serializers.ModelSerializer):
    attribute_values = serializers.SerializerMethodField()
    variant_id = serializers.IntegerField(source="variant.id", read_only=True)
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    unit_price = serializers.DecimalField(source="price_at_purchase", max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "product_name",
            "variant_id",
            "variant_sku",
            "attribute_values",
            "quantity",
            "unit_price",
            "line_total",
        ]

    def get_line_total(self, obj):
        return obj.price_at_purchase * obj.quantity

    def get_attribute_values(self, obj):
        return [
            {
                "attribute": attr.attribute_value.attribute.name,
                "value": attr.attribute_value.value,
            }
            for attr in obj.variant.attributes.select_related("attribute_value__attribute").all()
        ]


class OrderPublicStatementSerializer(serializers.ModelSerializer):
    items = OrderStatementItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "public_order_id",
            "customer_name",
            "customer_phone",
            "division",
            "city",
            "detailed_address",
            "items",
            "total_amount_before_discount",
            "coupon_code",
            "coupon_discount_amount",
            "delivery_charge",
            "vat_amount",
            "tax_amount",
            "total_amount",
            "created_at",
        ]


class OrderListItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = Order
        fields = [
            "order_id",
            "public_order_id",
            "customer_name",
            "customer_phone",
            "division",
            "city",
            "detailed_address",
            "address",
            "weight",
            "status",
            "payment_method",
            "is_paid",
            "total_amount",
            "total_amount_before_discount",
            "coupon_code",
            "coupon_discount_amount",
            "delivery_charge",
            "vat_amount",
            "tax_amount",
            "created_at",
        ]


class OrderListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in Order.STATUS_CHOICES], required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    payment_method = serializers.ChoiceField(
        choices=[choice[0] for choice in Order.PAYMENT_METHOD_CHOICES], required=False
    )
    is_paid = serializers.BooleanField(required=False)
    search = serializers.CharField(required=False, allow_blank=False)
    sort_by = serializers.ChoiceField(
        choices=["created_at", "total_amount", "status"],
        required=False,
        default="created_at",
    )
    sort_dir = serializers.ChoiceField(
        choices=["asc", "desc"], required=False, default="desc"
    )

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "end_date must be greater than or equal to start_date."}
            )

        return attrs






class OrderItemSerializer(serializers.ModelSerializer):
    attribute_values = serializers.SerializerMethodField()
    variant_id = serializers.IntegerField(source="variant.id", read_only=True)
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "product_name",
            "variant_id",
            "variant_sku",
            "attribute_values",
            "quantity",
            "price_at_purchase",
            "actual_selling_price",
        ]

    def get_attribute_values(self, obj):
        return [
            {
                "attribute": attr.attribute_value.attribute.name,
                "value": attr.attribute_value.value,
            }
            for attr in obj.variant.attributes.select_related("attribute_value__attribute").all()
        ]

class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            "order_id",
            "public_order_id",
                "customer_name",
                "customer_phone",
                "division",
                "city",
                "detailed_address",
                "address",
            "weight",
            "status",
            "total_amount",
            "total_amount_before_discount",
            "coupon_code",
            "coupon_discount_amount",
            "delivery_charge",
            "vat_amount",
            "tax_amount",
            "items",
            "payment_method",
            "is_paid"

        ]