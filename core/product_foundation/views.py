from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework import status
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .serializers import *
from .services.admin_core_service import *


def _is_truthy(value):
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _validation_error_payload(exc):
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return {"error": exc.messages[0] if exc.messages else str(exc)}
    return {"error": str(exc)}


class PublicCategoryListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        include_empty = _is_truthy(request.query_params.get("include_empty", "true"))

        categories = Category.objects.filter(parent__isnull=True).annotate(
            subcategories_count=Count("children", distinct=True)
        )

        if not include_empty:
            categories = categories.filter(
                Q(products__is_active=True) |
                Q(children__products__is_active=True)
            ).distinct()

        categories = categories.order_by("name")
        return Response(PublicCategorySerializer(categories, many=True).data)


class PublicSubCategoryListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, category_slug):
        parent_category = get_object_or_404(Category, slug=category_slug, parent__isnull=True)
        include_empty = _is_truthy(request.query_params.get("include_empty", "true"))

        subcategories = Category.objects.filter(parent=parent_category)
        if not include_empty:
            subcategories = subcategories.filter(products__is_active=True).distinct()

        subcategories = subcategories.order_by("name")
        return Response(PublicSubCategorySerializer(subcategories, many=True).data)


class PublicSubCategoryByCategoryIdAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, category_id):
        parent_category = get_object_or_404(Category, id=category_id, parent__isnull=True)
        include_empty = _is_truthy(request.query_params.get("include_empty", "true"))

        subcategories = Category.objects.filter(parent=parent_category)
        if not include_empty:
            subcategories = subcategories.filter(products__is_active=True).distinct()

        subcategories = subcategories.order_by("name")
        return Response(PublicSubCategorySerializer(subcategories, many=True).data)


class PublicSubCategoryQueryListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        include_empty = _is_truthy(request.query_params.get("include_empty", "true"))
        category = request.query_params.get("category")
        subcategories = Category.objects.filter(parent__isnull=False)

        if category:
            if str(category).isdigit():
                subcategories = subcategories.filter(parent_id=int(category), parent__parent__isnull=True)
            else:
                subcategories = subcategories.filter(parent__slug=category, parent__parent__isnull=True)

        if not include_empty:
            subcategories = subcategories.filter(products__is_active=True).distinct()

        subcategories = subcategories.order_by("name")
        return Response(PublicSubCategorySerializer(subcategories, many=True).data)


class CreateCategoryAPIView(APIView):
    '''
    Admin-only endpoint to create a category. Categories can be nested by providing a parent_id.
    '''
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = CategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category = create_category(serializer.validated_data)

        return Response({"id": category.id, "name": category.name})

    def get(self, request):
        from django.db.models import Count, Exists, OuterRef, Case, When, BooleanField
        from products.models import Product
        
        try:
            active_products = Product.objects.filter(
                category=OuterRef('pk'),
                is_active=True
            )
            
            active_child_products = Product.objects.filter(
                category__parent=OuterRef('pk'),
                is_active=True
            )
            
            categories = Category.objects.annotate(
                subcategories_count=Count('children', distinct=True),
                product_count=Count('products', distinct=True),
                is_active=Case(
                    When(Exists(active_products) | Exists(active_child_products), then=True),
                    default=False,
                    output_field=BooleanField()
                )
            ).order_by('name')
        except Category.DoesNotExist:
            return Response({"error": "Categories not found"}, status=404)

        return Response(AdminCategoryListSerializer(categories, many=True).data)





class CategoryDetailAPIView(APIView):
    '''
    Admin-only endpoint to retrieve, update, or delete a category.
    '''
    permission_classes = [IsAdminUser]

    def get_object(self, pk):
        return Category.objects.get(id=pk)

    def get(self, request, pk):
        try:
            category = self.get_object(pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        return Response(CategorySerializer(category).data)

    def patch(self, request, pk):
        try:
            category = self.get_object(pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        serializer = CategoryCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "name" in data:
            category.name = data["name"]
        if "image_url" in data:
            category.image_url = data["image_url"]
        if "parent_id" in data:
            parent_id = data["parent_id"]
            if parent_id is None:
                category.parent = None
            else:
                try:
                    parent = Category.objects.get(id=parent_id, parent__isnull=True)
                    if parent.id == category.id:
                        return Response({"error": "A category cannot be its own parent."}, status=400)
                    category.parent = parent
                except Category.DoesNotExist:
                    return Response({"error": "Parent category not found or is not a root category."}, status=400)

        category.save()
        return Response(CategorySerializer(category).data)

    def delete(self, request, pk):
        '''
        Only allow deletion if category has no products and no subcategories.
        '''
        try:
            category = self.get_object(pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        if category.products.exists():
            return Response({"error": "Cannot delete: Category has active products"}, status=400)
            
        if category.children.exists():
            return Response({"error": "Cannot delete: Category has subcategories"}, status=400)

        category.delete()
        return Response({"message": "Deleted"})
    

    

class CreateProductTypeAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ProductTypeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj = create_product_type(serializer.validated_data)

        return Response({"id": obj.id, "name": obj.name})
    
    def get(self, request):
        try:
            product_types = ProductType.objects.all()
        except ProductType.DoesNotExist:
            return Response({"error": "Product types not found"}, status=404)

        return Response(ProductTypeSerializer(product_types, many=True).data)


class ProductTypeDetailsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            obj = ProductType.objects.get(id=pk)
        except ProductType.DoesNotExist:
            return Response({"error": "Product type not found"}, status=404)

        return Response(ProductTypeSerializer(obj).data)
    
    
    def patch(self, request, pk):
        try:
            obj = ProductType.objects.get(id=pk)
        except ProductType.DoesNotExist:
            return Response({"error": "Product type not found"}, status=404)

        serializer = ProductTypeSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            obj = ProductType.objects.get(id=pk)
        except ProductType.DoesNotExist:
            return Response({"error": "Product type not found"}, status=404)

        if Product.objects.filter(product_type=obj).exists():
            return Response({"error": "Used in products"}, status=400)

        obj.delete()
        return Response({"message": "Deleted"})
    

    

class CreateAttributeAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AttributeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj = create_attribute(serializer.validated_data)

        return Response({"id": obj.id, "name": obj.name})
    
    def get(self, request):
        try:            
            attributes = get_attributes_for_admin()
        except Attribute.DoesNotExist:
            return Response({"error": "Attributes not found"}, status=404)
        return Response(AttributeAdminSerializer(attributes, many=True).data)

    
class AttributeDetailsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            attribute = get_attribute_for_admin(pk)
        except Attribute.DoesNotExist:
            return Response({"error": "Attribute not found"}, status=404)
        
        return Response(AttributeAdminSerializer(attribute).data)

    def patch(self, request, pk):
        serializer = AttributeDetailsUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            refreshed_obj = update_attribute_details(pk, serializer.validated_data)
        except Attribute.DoesNotExist:
            return Response({"error": "Attribute not found"}, status=404)
        except ValidationError as exc:
            return Response(_validation_error_payload(exc), status=status.HTTP_400_BAD_REQUEST)

        return Response(AttributeAdminSerializer(refreshed_obj).data)

    def delete(self, request, pk):
        try:
            obj = Attribute.objects.get(id=pk)
        except Attribute.DoesNotExist:
            return Response({"error": "Attribute not found"}, status=404)

        if obj.values.exists():
            return Response({"error": "Attribute has values"}, status=400)

        obj.delete()
        return Response({"message": "Deleted"})
    



class CreateAttributeValueAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AttributeValueCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj = create_attribute_value(serializer.validated_data)

        return Response({
            "id": obj.id,
            "attribute": obj.attribute.name,
            "value": obj.value
        })
    
    def get(self, request):
        try:
            attribute_values = AttributeValue.objects.all()
        except AttributeValue.DoesNotExist:
            return Response({"error": "Attribute values not found"}, status=404)

        return Response(AttributeValueSerializer(attribute_values, many=True).data)
    
class AttributeValueDetailsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            obj = AttributeValue.objects.get(id=pk)
        except AttributeValue.DoesNotExist:
            return Response({"error": "Attribute value not found"}, status=404)

        return Response(AttributeValueSerializer(obj).data)

   
    def patch(self, request, pk):
        try:
            obj = AttributeValue.objects.get(id=pk)
        except AttributeValue.DoesNotExist:
            return Response({"error": "Attribute value not found"}, status=404)

        serializer = AttributeValueSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            obj = AttributeValue.objects.get(id=pk)
        except AttributeValue.DoesNotExist:
            return Response({"error": "Attribute value not found"}, status=404)

        if VariantAttributeValue.objects.filter(attribute_value=obj).exists():
            return Response({"error": "Used in variants"}, status=400)

        obj.delete()
        return Response({"message": "Deleted"})





    

class AssignAttributeAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ProductTypeAttributeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj = assign_attribute_to_product_type(serializer.validated_data)

        return Response({
            "product_type": obj.product_type.name,
            "attribute": obj.attribute.name
        })
    
    def get(self, request):
        try:
            assignments = ProductTypeAttribute.objects.all()
        except ProductTypeAttribute.DoesNotExist:
            return Response({"error": "Assignments not found"}, status=404)

        return Response(ProductTypeAttributeSerializer(assignments, many=True).data)
    

class ProductTypeAttributeAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            obj = ProductTypeAttribute.objects.get(id=pk)
        except ProductTypeAttribute.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=404)

        return Response(ProductTypeAttributeSerializer(obj).data)

    def delete(self, request, pk):
        try:
            obj = ProductTypeAttribute.objects.get(id=pk)
        except ProductTypeAttribute.DoesNotExist:
            return Response({"error": "Assignment not found"}, status=404)

        # Dangerous: breaks validation logic
        if Product.objects.filter(product_type=obj.product_type).exists():
            return Response({"error": "Used by products"}, status=400)

        obj.delete()
        return Response({"message": "Deleted"})


class ProductTypeAttributesByProductTypeAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, product_type_id):
        serializer = ProductTypeAttributeCreateByNameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            attribute, mapping, created = create_or_assign_attribute_to_product_type(
                product_type_id,
                serializer.validated_data["name"],
            )
        except ValidationError as exc:
            message = exc.message if hasattr(exc, "message") else str(exc)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Attribute created and linked to product type" if created else "Attribute linked to product type",
                "attribute": {
                    "id": attribute.id,
                    "name": attribute.name,
                },
                "mapping": {
                    "id": mapping.id,
                    "product_type_id": product_type_id,
                },
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def get(self, request, product_type_id):
        include_values = _is_truthy(request.query_params.get("include_values", "true"))

        try:
            product_type = ProductType.objects.get(id=product_type_id)
        except ProductType.DoesNotExist:
            return Response({"error": "Product type not found"}, status=404)

        attribute_ids = ProductTypeAttribute.objects.filter(
            product_type_id=product_type_id
        ).values_list("attribute_id", flat=True)

        attributes = Attribute.objects.filter(id__in=attribute_ids).prefetch_related("values").order_by("name")
        attributes_data = ProductTypeAttributeFilterSerializer(
            attributes,
            many=True,
            context={"include_values": include_values},
        ).data

        return Response(
            {
                "product_type": {
                    "id": product_type.id,
                    "name": product_type.name,
                },
                "attributes": attributes_data,
            }
        )