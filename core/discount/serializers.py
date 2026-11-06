from rest_framework import serializers
from .models import CategoryDiscount, Discount, ProductDiscount
from products.serializers import ProductListSerializer

class DiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discount
        fields = "__all__"


class DiscountCardSerializer(serializers.ModelSerializer):
    """Serializer for discount card display with image and product count"""
    
    class Meta:
        model = Discount
        fields = ["id", "name", "image_url", "discount_type", "value", "scope", "is_active", "start_date", "end_date", "priority"]
    
    def get_product_count(self, obj):
        return obj.productdiscount_set.count()
    
    def get_products(self, obj):
        product_discounts = obj.productdiscount_set.all()
        return ProductDiscountSerializer(product_discounts, many=True).data


class ProductDiscountSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    discount_id = serializers.IntegerField()

    product = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()

    def get_product(self, obj):
        return ProductListSerializer(obj.product).data

    def get_discount(self, obj):
        return DiscountSerializer(obj.discount).data


class CategoryDiscountSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False)
    discount_id = serializers.IntegerField()

    category = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()

    def get_category(self, obj):
        return {
            "id": obj.category.id,
            "name": obj.category.name,
            "slug": obj.category.slug,
        }

    def get_discount(self, obj):
        return DiscountSerializer(obj.discount).data


class DiscountAssignmentSerializer(serializers.Serializer):
    discount_id = serializers.IntegerField()
    product_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)

    def validate(self, attrs):
        product_id = attrs.get("product_id")
        category_id = attrs.get("category_id")

        if product_id and category_id:
            raise serializers.ValidationError(
                "Provide either product_id or category_id, not both."
            )

        if not product_id and not category_id:
            raise serializers.ValidationError(
                "Either product_id or category_id is required."
            )

        return attrs