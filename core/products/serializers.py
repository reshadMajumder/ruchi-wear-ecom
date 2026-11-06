# products/serializers.py

from rest_framework import serializers
from .models import *


class AttributeValueSerializer(serializers.ModelSerializer):
    attribute = serializers.CharField(source="attribute.name")

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute", "value"]

class VariantSerializer(serializers.ModelSerializer):
    attributes = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "stock", "weight", "attributes"]

    def get_attributes(self, obj):
        return [
            {
                "attribute": v.attribute_value.attribute.name,
                "value": v.attribute_value.value
            }
            for v in obj.attributes.all()
        ]

    
    


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "is_primary"]

class ProductImageCreateSerializer(serializers.Serializer):
    image_url = serializers.URLField()
    is_primary = serializers.BooleanField(default=False)

class ProductListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    price_data = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "slug", "primary_image", "price_data"]

    def get_primary_image(self, obj):
        prefetched_primary_images = getattr(obj, "prefetched_primary_images", None)
        if prefetched_primary_images is not None:
            image = prefetched_primary_images[0] if prefetched_primary_images else None
        else:
            image = obj.images.filter(is_primary=True).first()
        return image.image_url if image else None

    def get_price_data(self, obj):
        from discount.services import get_price_data
        return get_price_data(
            obj,
            global_discount=self.context.get("global_discount"),
            forced_discount=self.context.get("forced_discount"),
        )

class ProductAdminListSerializer(ProductListSerializer):
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["is_active", "created_at"]

class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True)
    variants = VariantSerializer(many=True)
    price_data = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "selling_price",
            "images",
            "variants",
            "price_data"

        ]

    def get_price_data(self, obj):
        from discount.services import get_price_data
        return get_price_data(
            obj,
            global_discount=self.context.get("global_discount"),
            forced_discount=self.context.get("forced_discount"),
        )


"""
admin serializer
"""


class ProductVariantCreatePayloadSerializer(serializers.Serializer):
    sku = serializers.CharField(allow_blank=True, required=False, default='')
    stock = serializers.IntegerField(min_value=0)
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, default=0, min_value=0)
    attributes = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=True,
    )


class ProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    category_id = serializers.IntegerField()
    subcategory_id = serializers.IntegerField(required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
    product_type_id = serializers.IntegerField()
    buying_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)

    variants = ProductVariantCreatePayloadSerializer(many=True, allow_empty=False)
    images = ProductImageCreateSerializer(many=True, required=False)

    def validate(self, data):
        if data["selling_price"] < data["buying_price"]:
            raise serializers.ValidationError("Selling price cannot be less than buying price")

        if not data["variants"]:
            raise serializers.ValidationError("At least one variant required")

        images = data.get("images", [])

        # 🔥 only one primary
        primary_count = sum(1 for img in images if img.get("is_primary"))
        if primary_count > 1:
            raise serializers.ValidationError("Only one primary image allowed")

        return data

    def validate_tag_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate tag IDs are not allowed.")
        existing_ids = set(ProductTag.objects.filter(id__in=value).values_list("id", flat=True))
        missing_ids = sorted(set(value) - existing_ids)
        if missing_ids:
            raise serializers.ValidationError(f"Invalid tag id(s): {missing_ids}")
        return value
    

class ProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    category_id = serializers.IntegerField(required=False)
    subcategory_id = serializers.IntegerField(required=False, allow_null=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
    tags_action = serializers.ChoiceField(choices=["add", "remove", "set"], required=False, default="set")
    product_type_id = serializers.IntegerField(required=False)
    buying_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    is_active = serializers.BooleanField(required=False)

    images = ProductImageCreateSerializer(many=True, required=False)

    def validate(self, data):
        buying = data.get("buying_price")
        selling = data.get("selling_price")

        if buying is not None and selling is not None:
            if selling < buying:
                raise serializers.ValidationError("Selling price cannot be less than buying price")

        images = data.get("images", [])
        primary_count = sum(1 for img in images if img.get("is_primary"))
        if primary_count > 1:
            raise serializers.ValidationError("Only one primary image allowed")

        tags_action = data.get("tags_action")
        if tags_action and "tag_ids" not in data:
            raise serializers.ValidationError({"tag_ids": "tag_ids is required when tags_action is provided."})

        return data

    def validate_tag_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate tag IDs are not allowed.")
        existing_ids = set(ProductTag.objects.filter(id__in=value).values_list("id", flat=True))
        missing_ids = sorted(set(value) - existing_ids)
        if missing_ids:
            raise serializers.ValidationError(f"Invalid tag id(s): {missing_ids}")
        return value
    


# =========varients==========


class VariantCreateSerializer(serializers.Serializer):
    sku = serializers.CharField()
    stock = serializers.IntegerField()
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, default=0, min_value=0)
    attributes = serializers.ListField(child=serializers.IntegerField())


class VariantUpdateSerializer(serializers.Serializer):
    attributes = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    weight = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, min_value=0)




class VariantStockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
    operation = serializers.ChoiceField(choices=["increase", "decrease"])

    def validate(self, data):
        # Optional: extra guard (already covered by min_value)
        if data["quantity"] <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")

        return data
    
class ProductTagCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)


class ProductTagAssignSerializer(serializers.Serializer):
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    action = serializers.ChoiceField(choices=["add", "remove", "set"], default="add")


class ProductTagSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductTag
        fields = ["id", "name", "slug", "description", "is_active", "created_at", "updated_at"]


class VariantAttributeValueAdminSerializer(serializers.ModelSerializer):
    attribute_id = serializers.IntegerField(source="attribute_value.attribute_id", read_only=True)
    attribute = serializers.CharField(source="attribute_value.attribute.name", read_only=True)
    attribute_value_id = serializers.IntegerField(read_only=True)
    value = serializers.CharField(source="attribute_value.value", read_only=True)

    class Meta:
        model = VariantAttributeValue
        fields = ["attribute_id", "attribute", "attribute_value_id", "value"]


class ProductVariantAdminSerializer(serializers.ModelSerializer):
    attributes = VariantAttributeValueAdminSerializer(many=True, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "stock", "weight", "attributes"]


class ProductAdminDetailSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(source="category.id", read_only=True)
    subcategory_id = serializers.IntegerField(source="subcategory.id", read_only=True, allow_null=True)
    product_type_id = serializers.IntegerField(source="product_type.id", read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantAdminSerializer(many=True, read_only=True)
    tags = ProductTagSerializer(many=True, read_only=True)
    price_data = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category_id",
            "subcategory_id",
            "product_type_id",
            "buying_price",
            "selling_price",
            "is_active",
            "images",
            "variants",
            "tags",
            "created_at",
            "updated_at",
            "price_data",
        ]

    def get_price_data(self, obj):
        from discount.services import get_price_data
        return get_price_data(
            obj,
            global_discount=self.context.get("global_discount"),
            forced_discount=self.context.get("forced_discount"),
        )


class SubCategoryListSerializer(serializers.ModelSerializer):
    parent_slug = serializers.CharField(source="parent.slug", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image_url", "parent", "parent_slug"]


class SectionListSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ["id", "title", "priority", "created_at", "updated_at", "products"]

    def get_products(self, obj):
        section_products = getattr(obj, "prefetched_section_products", None)
        if section_products is None:
            section_products = obj.section_products.select_related("product").all()

        max_products = self.context.get("max_products")
        if max_products is not None:
            section_products = section_products[:max_products]

        products = [entry.product for entry in section_products]
        return ProductListSerializer(products, many=True, context=self.context).data


class SectionDetailSerializer(SectionListSerializer):
    class Meta:
        model = Section
        fields = ["id", "title", "priority", "created_at", "updated_at", "products"]


class SectionCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    priority = serializers.IntegerField(required=False, default=0)
    product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )


class SectionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    priority = serializers.IntegerField(required=False)


class SectionProductsPatchSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["add", "remove", "set"])
    product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
