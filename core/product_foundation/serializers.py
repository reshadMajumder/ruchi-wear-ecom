from rest_framework import serializers

from products.models import Attribute, AttributeValue, Category, ProductType, ProductTypeAttribute


class CategoryCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    image_url = serializers.URLField(required=False, allow_null=True)
    parent_id = serializers.IntegerField(required=False, allow_null=True)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "image_url"]

class AdminCategoryListSerializer(CategorySerializer):
    subcategories_count = serializers.IntegerField(read_only=True)
    product_count = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ["subcategories_count", "product_count", "is_active"]


class PublicCategorySerializer(serializers.ModelSerializer):
    subcategories_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image_url", "subcategories_count"]


class PublicSubCategorySerializer(serializers.ModelSerializer):
    parent_slug = serializers.CharField(source="parent.slug", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image_url", "parent", "parent_slug"]

class ProductTypeCreateSerializer(serializers.Serializer):
    name = serializers.CharField()


class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ["id", "name"]



class AttributeCreateSerializer(serializers.Serializer):
    name = serializers.CharField()


class AttributeDetailsUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    values = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=False,
    )
    product_type_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=False,
    )

    def validate_values(self, values):
        normalized = []
        seen = set()
        for value in values:
            cleaned = value.strip()
            if not cleaned:
                raise serializers.ValidationError("Values cannot be empty.")
            lowered = cleaned.lower()
            if lowered in seen:
                raise serializers.ValidationError("Duplicate values are not allowed.")
            seen.add(lowered)
            normalized.append(cleaned)
        return normalized

    def validate_product_type_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate product type IDs are not allowed.")
        return value

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ["id", "name"]



class AttributeValueCreateSerializer(serializers.Serializer):
    attribute_id = serializers.IntegerField()
    value = serializers.CharField()

class AttributeValueSerializer(serializers.ModelSerializer):
    attribute = serializers.StringRelatedField()

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute", "value"]


        

class ProductTypeAttributeCreateSerializer(serializers.Serializer):
    product_type_id = serializers.IntegerField()
    attribute_id = serializers.IntegerField()

class ProductTypeAttributeSerializer(serializers.ModelSerializer):
    product_type = serializers.StringRelatedField()
    attribute = serializers.StringRelatedField()
    class Meta:
        model = ProductTypeAttribute
        fields = ["id", "product_type", "attribute"]


class ProductTypeAttributeCreateByNameSerializer(serializers.Serializer):
    name = serializers.CharField()


class AttributeValueOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeValue
        fields = ["id", "value"]


class AttributeProductTypeMappingSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="pk")
    name = serializers.CharField(source="product_type.name")

    class Meta:
        model = ProductTypeAttribute
        fields = ["id", "name"]


class AttributeAdminSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()
    connected_type_names = serializers.SerializerMethodField()

    class Meta:
        model = Attribute
        fields = ["id","name", "values", "connected_type_names"]

    def get_values(self, obj):
        values_qs = obj.values.all().order_by("value")
        return AttributeValueOptionSerializer(values_qs, many=True).data

    def get_connected_type_names(self, obj):
        mappings = getattr(obj, "prefetched_product_type_mappings", None)
        if mappings is None:
            mappings = obj.producttypeattribute_set.select_related("product_type").all()
        return sorted({mapping.product_type.name for mapping in mappings})


class ProductTypeAttributeValueOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeValue
        fields = ["id", "value"]


class ProductTypeAttributeFilterSerializer(serializers.ModelSerializer):
    values = serializers.SerializerMethodField()

    class Meta:
        model = Attribute
        fields = ["id", "name", "values"]

    def get_values(self, obj):
        values_qs = obj.values.all().order_by("value")
        return ProductTypeAttributeValueOptionSerializer(values_qs, many=True).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("include_values", True):
            data.pop("values", None)
        return data