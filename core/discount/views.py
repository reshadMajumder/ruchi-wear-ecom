from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework import status
from django.db.models import Prefetch

from core.cache_utils import cache_response

from .cache import (
    DEFAULT_TTL,
    discount_cards_cache_identifier,
    discount_products_cache_identifier,
)
from .models import CategoryDiscount, Discount, ProductDiscount
from .serializers import *
from products.models import Category, Product, ProductImage


class CreateDiscountAPIView(APIView):
    '''
    Admin-only endpoint to create  a new discount.
    get: List all discounts
    '''
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = DiscountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        discount = serializer.save()

        return Response({"message": "Discount created successfully", "data": DiscountSerializer(discount).data})
    

    def get(self, request):
        try:
            if "active" in request.query_params:
                active = request.query_params.get("active").lower() == "true"
                discounts = Discount.objects.filter(is_active=active)

            elif "start_date" in request.query_params and "end_date" in request.query_params:
                start_date = request.query_params.get("start_date")
                end_date = request.query_params.get("end_date")
                discounts = Discount.objects.filter(start_date__lte=end_date, end_date__gte=start_date)

            else:
                discounts = Discount.objects.all()
            
            # Optimize with prefetch_related to avoid N+1 queries
            discounts = discounts.prefetch_related(
                Prefetch("productdiscount_set__product")
            )
        except Discount.DoesNotExist:
            return Response({"message": "No discounts found"}, status=404)

        serializer = DiscountSerializer(discounts, many=True)
        return Response(serializer.data)


class DiscountDetailAPIView(APIView):
    '''
    Admin-only endpoint to retrieve, update, or delete a discount by ID.
    '''
    permission_classes = [IsAdminUser]

    def get(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response({"message": "Discount not found"}, status=404)

        serializer = DiscountSerializer(discount)
        return Response(serializer.data)
    
    def put(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response({"message": "Discount not found"}, status=404)

        serializer = DiscountSerializer(discount, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Discount updated successfully", "data": serializer.data})
    

    def delete(self, request, discount_id):
        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response({"message": "Discount not found"}, status=404)

        discount.delete()
        return Response({"message": "Discount deleted successfully"})
    


class AssignDiscountAPIView(APIView):
    '''
    Admin-only endpoint to assign a discount to a product or category.
    '''
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = DiscountAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        discount_id = serializer.validated_data["discount_id"]
        product_id = serializer.validated_data.get("product_id")
        category_id = serializer.validated_data.get("category_id")

        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response({"message": "Discount not found"}, status=status.HTTP_404_NOT_FOUND)

        if discount.scope == "global":
            return Response(
                {"message": "Global discounts do not require assignment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if discount.scope == "product":
            if not product_id:
                return Response(
                    {"message": "product_id is required for product scope discounts."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({"message": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

            existing_mapping = ProductDiscount.objects.filter(product=product).select_related("discount").first()
            replaced_discount = existing_mapping.discount if existing_mapping else None
            if existing_mapping:
                existing_mapping.delete()

            product_discount = ProductDiscount.objects.create(
                product=product,
                discount=discount,
            )

            response_data = {
                "message": "Discount assigned successfully",
                "data": ProductDiscountSerializer(product_discount).data,
            }
            if replaced_discount:
                response_data["replaced_discount"] = DiscountSerializer(replaced_discount).data

            return Response(response_data)

        if discount.scope == "category":
            if not category_id:
                return Response(
                    {"message": "category_id is required for category scope discounts."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                category = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                return Response({"message": "Category not found"}, status=status.HTTP_404_NOT_FOUND)

            existing_mapping = CategoryDiscount.objects.filter(category=category).select_related("discount").first()
            replaced_discount = existing_mapping.discount if existing_mapping else None
            if existing_mapping:
                existing_mapping.delete()

            category_discount = CategoryDiscount.objects.create(
                category=category,
                discount=discount,
            )

            response_data = {
                "message": "Discount assigned successfully",
                "data": CategoryDiscountSerializer(category_discount).data,
            }
            if replaced_discount:
                response_data["replaced_discount"] = DiscountSerializer(replaced_discount).data

            return Response(response_data)

        return Response(
            {"message": "Invalid discount scope."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    def get(self, request):
        product_discounts = ProductDiscount.objects.select_related(
            "product",
            "discount",
        ).all()
        category_discounts = CategoryDiscount.objects.select_related(
            "category",
            "discount",
        ).all()

        return Response(
            {
                "product_discounts": ProductDiscountSerializer(product_discounts, many=True).data,
                "category_discounts": CategoryDiscountSerializer(category_discounts, many=True).data,
            }
        )
    

class DetachDiscountAPIView(APIView):
    '''
    Admin-only endpoint to detach a discount from a product or category.
    '''
    permission_classes = [IsAdminUser]

    def delete(self, request):
        serializer = DiscountAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        discount_id = serializer.validated_data["discount_id"]
        product_id = serializer.validated_data.get("product_id")
        category_id = serializer.validated_data.get("category_id")

        try:
            discount = Discount.objects.get(id=discount_id)
        except Discount.DoesNotExist:
            return Response({"message": "Discount not found"}, status=status.HTTP_404_NOT_FOUND)

        if discount.scope == "product":
            try:
                product_discount = ProductDiscount.objects.get(
                    product_id=product_id,
                    discount_id=discount_id,
                )
            except ProductDiscount.DoesNotExist:
                return Response({"message": "Product discount association not found"}, status=404)

            product_discount.delete()
            return Response({"message": "Discount detached successfully"})

        if discount.scope == "category":
            try:
                category_discount = CategoryDiscount.objects.get(
                    category_id=category_id,
                    discount_id=discount_id,
                )
            except CategoryDiscount.DoesNotExist:
                return Response({"message": "Category discount association not found"}, status=404)

            category_discount.delete()
            return Response({"message": "Discount detached successfully"})

        if discount.scope == "global":
            return Response(
                {"message": "Global discounts do not require unassignment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": "Discount detached successfully"})


class DiscountCardsAPIView(APIView):
    '''
    Public endpoint to fetch all active discount cards with their associated products.
    Supports filtering by discount_id.
    
    Query parameters:
    - discount_id: Filter by specific discount ID
    '''
    permission_classes = [AllowAny]

    @cache_response("discounts", identifier_fn=discount_cards_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request):
        try:
            
            discounts = Discount.objects.filter(
                is_active=True,
                make_card=True,
            ).only(
                "id",
                "name",
                "image_url",
                "discount_type",
                "value",
                "scope",
                "is_active",
                "start_date",
                "end_date",
                "priority",
            ).order_by("-priority", "-id")
            serializer = DiscountCardSerializer(discounts, many=True)
            return Response(serializer.data)
                
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount not found or inactive"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DiscountProductsAPIView(APIView):
    '''
    Public endpoint to fetch all products associated with a specific discount.
    
    URL parameter:
    - discount_id: The ID of the discount
    
    Query parameters:
    - sort: Sorting option for products (price_low_to_high, price_high_to_low, name_a_to_z, name_z_to_a, new, oldest)
    - search: Search term to filter products by name
    '''
    permission_classes = [AllowAny]

    @cache_response("discounts", identifier_fn=discount_products_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request, discount_id):
        try:
            discount = Discount.objects.only(
                "id",
                "name",
                "image_url",
                "discount_type",
                "value",
                "scope",
                "is_active",
                "start_date",
                "end_date",
                "priority",
                "make_card",
            ).get(id=discount_id, is_active=True)
        except Discount.DoesNotExist:
            return Response(
                {"error": "Discount not found or inactive"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if discount.scope == "global":
            products = Product.objects.filter(is_active=True)
        elif discount.scope == "category":
            products = Product.objects.filter(
                category__category_discounts__discount_id=discount_id,
                is_active=True,
            ).distinct()
        else:
            products = Product.objects.filter(
                product_discounts__discount_id=discount_id,
                is_active=True,
            ).distinct()

        products = products.select_related(
            "category",
            "subcategory",
            "product_type",
        ).prefetch_related(
            Prefetch(
                "images",
                queryset=ProductImage.objects.filter(is_primary=True),
                to_attr="prefetched_primary_images",
            ),
        )
        
        # Materialize once so we don't execute the queryset twice.
        products = list(products)

        if not products:
            return Response({
                "discount": DiscountSerializer(discount).data,
                "products": []
            })
        
        # Apply search filter if provided
        search_term = request.query_params.get("search")
        if search_term:
            products = list(filter(lambda product: search_term.lower() in product.name.lower(), products))
        
        # Apply sorting if provided
        sort_option = request.query_params.get("sort")
        if sort_option == "price_low_to_high":
            products = sorted(products, key=lambda product: product.selling_price)
        elif sort_option == "price_high_to_low":
            products = sorted(products, key=lambda product: product.selling_price, reverse=True)
        elif sort_option == "name_a_to_z":
            products = sorted(products, key=lambda product: product.name.lower())
        elif sort_option == "name_z_to_a":
            products = sorted(products, key=lambda product: product.name.lower(), reverse=True)
        elif sort_option == "oldest":
            products = sorted(products, key=lambda product: product.created_at)
        else:  # default: newest first
            products = sorted(products, key=lambda product: product.created_at, reverse=True)
        
        from products.serializers import ProductListSerializer
        serializer = ProductListSerializer(
            products,
            many=True,
            context={"forced_discount": discount}
        )
        
        return Response({
            "discount": DiscountCardSerializer(discount).data,
            "products": serializer.data
        })