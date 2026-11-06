# products/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework import status
from django.db import IntegrityError
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.utils.text import slugify

from core.cache_utils import cache_response

from .cache import (
    DEFAULT_TTL,
    discounted_product_list_cache_identifier,
    product_detail_cache_identifier,
    product_list_cache_identifier,
    product_tag_cache_identifier,
    related_products_cache_identifier,
    sections_list_cache_identifier,
    section_detail_cache_identifier,
    section_products_cache_identifier,
)
from .models import Product, ProductTag, Section, SectionProduct
from discount.services import get_global_discount

from .selectors import (
    get_all_products,
    get_product_by_slug,
    get_all_products_admin,
    get_product_by_slug_admin,
)
from .pagination import ProductCursorPagination
from .serializers import *
from .services import *
from .services.product_service import create_product_with_variants,update_product,delete_product
from .models import ProductImage


def _section_products_prefetch():
    from discount.models import CategoryDiscount, ProductDiscount

    now = timezone.now()
    return Prefetch(
        "section_products",
        queryset=SectionProduct.objects.select_related(
            "product",
            "product__category",
        ).prefetch_related(
            Prefetch(
                "product__images",
                queryset=ProductImage.objects.filter(is_primary=True),
                to_attr="prefetched_primary_images",
            ),
            Prefetch(
                "product__product_discounts",
                queryset=ProductDiscount.objects.select_related("discount").filter(
                    discount__scope="product",
                    discount__is_active=True,
                    discount__start_date__lte=now,
                    discount__end_date__gte=now,
                ).order_by("-discount__id"),
                to_attr="prefetched_active_product_discounts",
            ),
            Prefetch(
                "product__category__category_discounts",
                queryset=CategoryDiscount.objects.select_related("discount").filter(
                    discount__scope="category",
                    discount__is_active=True,
                    discount__start_date__lte=now,
                    discount__end_date__gte=now,
                ).order_by("-discount__id"),
                to_attr="prefetched_active_category_discounts",
            ),
        ).filter(
            product__is_active=True,
            product__variants__stock__gt=0,
        ).distinct().order_by("-priority", "-id"),
        to_attr="prefetched_section_products",
    )



class CursorPaginationMixin:
    pagination_class = ProductCursorPagination

    def get_cursor_ordering(self, request):
        return "id"

    def get_paginated_product_response(self, request, queryset, serializer_class=ProductListSerializer):
        paginator = self.pagination_class()
        paginator.ordering = self.get_cursor_ordering(request)
        if hasattr(self, "cursor_page_size"):
            paginator.page_size = self.cursor_page_size
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = serializer_class(
            page,
            many=True,
            context={"global_discount": get_global_discount()},
        )
        return paginator.get_paginated_response(serializer.data)


class ProductListAPIView(CursorPaginationMixin, APIView):
    '''
    API view to list products with filtering and sorting capabilities.
    Supported query parameters:
    - sort: price_low_to_high, price_high_to_low, name_a_to_z, name_z_to_a, new, oldest
    - category: filter by category slug
    - subcategory: filter by subcategory slug or id
    - discounted_only: if true, only show products with active discounts
    - search: search term to filter products by name or description
    - min_price: minimum selling price
    - max_price: maximum selling price
    - product_type: filter by product type name or ID
    - in_stock: if true, only show products that have stock available
    
    '''
    permission_classes = [AllowAny]

    def get_cursor_ordering(self, request):
        sort = (request.query_params.get("sort") or "").strip().lower()
        if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
            return ("selling_price", "id")
        if sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
            return ("-selling_price", "id")
        if sort in {"new", "newest", "new_products"}:
            return ("-created_at", "-id")
        return "id"

    @cache_response("products", identifier_fn=product_list_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request):
        products = get_all_products(
            {
                "sort": request.query_params.get("sort"),
                "category": request.query_params.get("category"),
                "subcategory": request.query_params.get("subcategory"),
                "discounted_only": request.query_params.get("discounted_only"),
                "search": request.query_params.get("search"),
                "min_price": request.query_params.get("min_price"),
                "max_price": request.query_params.get("max_price"),
                "product_type": request.query_params.get("product_type"),
                "in_stock": request.query_params.get("in_stock"),
            }
        )
        return self.get_paginated_product_response(request, products)
    

class ProductListByDiscountAPIView(CursorPaginationMixin, APIView):

    '''
    fech discounted products with active discounts
    
    '''
    permission_classes = [AllowAny]

    def get_cursor_ordering(self, request):
        sort = (request.query_params.get("sort") or "").strip().lower()
        if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
            return ("selling_price", "id")
        if sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
            return ("-selling_price", "id")
        if sort in {"new", "newest", "new_products"}:
            return ("-created_at", "-id")
        return "id"

    @cache_response("products", identifier_fn=discounted_product_list_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request):
        products = get_all_products(
            {
                "sort": request.query_params.get("sort"),
                "category": request.query_params.get("category"),
                "subcategory": request.query_params.get("subcategory"),
                "discounted_only": True,
                "search": request.query_params.get("search"),
                "min_price": request.query_params.get("min_price"),
                "max_price": request.query_params.get("max_price"),
                "product_type": request.query_params.get("product_type"),
                "in_stock": request.query_params.get("in_stock"),
            }
        )
        return self.get_paginated_product_response(request, products)


class GetsectionsListView(APIView):
    permission_classes = [AllowAny]

    @cache_response("products", identifier_fn=sections_list_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request):
        sections = Section.objects.prefetch_related(
            _section_products_prefetch(),
        ).only(
            "id",
            "title",
            "priority",
            "created_at",
            "updated_at",
        ).all()

        serializer = SectionListSerializer(
            sections,
            many=True,
            context={"global_discount": get_global_discount(), "max_products": 4},
        )
        return Response(serializer.data)


class SectionDetailAPIView(APIView):
    permission_classes = [AllowAny]

    @cache_response("products", identifier_fn=section_detail_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request, section_id):
        try:
            section = Section.objects.only(
                "id",
                "title",
                "priority",
                "created_at",
                "updated_at",
            ).prefetch_related(_section_products_prefetch()).get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SectionDetailSerializer(
            section,
            context={"global_discount": get_global_discount()},
        )
        return Response(serializer.data)


class SectionProductsListAPIView(CursorPaginationMixin, APIView):
    permission_classes = [AllowAny]

    def get_cursor_ordering(self, request):
        sort = (request.query_params.get("sort") or "").strip().lower()
        if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
            return ("selling_price", "id")
        if sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
            return ("-selling_price", "id")
        if sort in {"new", "newest", "new_products"}:
            return ("-created_at", "-id")
        return "id"

    @cache_response("products", identifier_fn=section_products_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request, section_id):
        try:
            Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        products = get_all_products(
            {
                "sort": request.query_params.get("sort"),
                "subcategory": request.query_params.get("subcategory"),
                "discounted_only": request.query_params.get("discounted_only"),
                "search": request.query_params.get("search"),
                "min_price": request.query_params.get("min_price"),
                "max_price": request.query_params.get("max_price"),
                "product_type": request.query_params.get("product_type"),
                "in_stock": request.query_params.get("in_stock"),
            }
        ).filter(product_sections__section_id=section_id).distinct()

        return self.get_paginated_product_response(request, products)


class SectionCreateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = SectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data["title"]
        priority = serializer.validated_data.get("priority", 0)
        product_ids = serializer.validated_data.get("product_ids", [])

        section = Section.objects.create(title=title, priority=priority)

        if product_ids:
            products = Product.objects.filter(id__in=product_ids)
            if products.count() != len(set(product_ids)):
                section.delete()
                return Response(
                    {"error": "One or more product ids are invalid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            for product in products:
                SectionProduct.objects.create(section=section, product=product)

        return Response(
            {
                "message": "Section created successfully",
                "section": SectionDetailSerializer(
                    section,
                    context={"global_discount": get_global_discount()},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SectionManageAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, section_id):
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        section_update_serializer = SectionUpdateSerializer(data=request.data, partial=True)
        section_update_serializer.is_valid(raise_exception=True)

        for field, value in section_update_serializer.validated_data.items():
            setattr(section, field, value)
        section.save()

        if "action" in request.data or "product_ids" in request.data:
            products_patch_serializer = SectionProductsPatchSerializer(data=request.data)
            products_patch_serializer.is_valid(raise_exception=True)

            action = products_patch_serializer.validated_data["action"]
            product_ids = products_patch_serializer.validated_data["product_ids"]

            products = Product.objects.filter(id__in=product_ids)
            if products.count() != len(set(product_ids)):
                return Response(
                    {"error": "One or more product ids are invalid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if action == "add":
                existing_product_ids = set(
                    SectionProduct.objects.filter(section=section, product_id__in=product_ids)
                    .values_list("product_id", flat=True)
                )
                for product in products:
                    if product.id not in existing_product_ids:
                        SectionProduct.objects.create(section=section, product=product)
            elif action == "remove":
                SectionProduct.objects.filter(section=section, product_id__in=product_ids).delete()
            else:
                SectionProduct.objects.filter(section=section).exclude(product_id__in=product_ids).delete()
                existing_product_ids = set(
                    SectionProduct.objects.filter(section=section, product_id__in=product_ids)
                    .values_list("product_id", flat=True)
                )
                for product in products:
                    if product.id not in existing_product_ids:
                        SectionProduct.objects.create(section=section, product=product)

        return Response(
            {
                "message": "Section updated successfully",
                "section": SectionDetailSerializer(
                    section,
                    context={"global_discount": get_global_discount()},
                ).data,
            }
        )

    def delete(self, request, section_id):
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response({"error": "Section not found."}, status=status.HTTP_404_NOT_FOUND)

        section.delete()
        return Response({"message": "Section deleted successfully"})


class ProductDetailAPIView(APIView):
    '''
    API view to retrieve detailed information about a single product by its slug.
        - If the product exists and is active, returns detailed product information.
        - If the product exists but is not active, returns a 404 with a message indicating it's unavailable.
        - If the product does not exist, returns a 404 with a message indicating it's not found.
    '''
    permission_classes = [AllowAny]

    @cache_response("products", identifier_fn=product_detail_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request, slug):
        try:
            product = get_product_by_slug(slug)
            serializer = ProductDetailSerializer(
                product,
                context={"global_discount": get_global_discount()},
            )
            return Response(serializer.data)
        except Product.DoesNotExist:
            if Product.objects.filter(slug=slug, is_active=True).exists():
                return Response(
                    {"error": "Product is currently unavailable."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
    
class RelatedProductsAPIView(CursorPaginationMixin, APIView):
    '''
    fetch related products based on category and product type of the given product slug
    fetch related products that are active and in stock, excluding the current product
    
    '''
    permission_classes = [AllowAny]

    @cache_response("products", identifier_fn=related_products_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request, slug):
        try:
            product = get_product_by_slug(slug)
            related_products = Product.objects.filter(
                is_active=True,
                variants__stock__gt=0,
            ).filter(
                Q(category=product.category) | Q(product_type=product.product_type)
            ).exclude(id=product.id).distinct().order_by("id")

            return self.get_paginated_product_response(request, related_products)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,


            )

class ProductCreateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            product = create_product_with_variants(serializer.validated_data)
            return Response({
                "message": "Product created successfully",
                "product_id": product.id
            }, status=status.HTTP_201_CREATED)
        except IntegrityError as e:
            error_message = str(e)
            if "UNIQUE constraint failed" in error_message and "slug" in error_message:
                return Response({
                    "error": "Product with this name already exists. Please use a different name."
                }, status=status.HTTP_400_BAD_REQUEST)
            elif "UNIQUE constraint failed" in error_message and "sku" in error_message:
                return Response({
                    "error": "One or more SKUs already exist. Please use unique SKU values."
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": f"Database integrity error: {error_message}"
                }, status=status.HTTP_400_BAD_REQUEST)
    
class ProductUpdateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, product_id):
        serializer = ProductUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = update_product(product_id, serializer.validated_data)

        return Response({
            "message": "Product updated successfully",
            "product_id": product.id
        })


class ProductAdminListAPIView(CursorPaginationMixin, APIView):
    permission_classes = [IsAdminUser]

    def get_cursor_ordering(self, request):
        sort = (request.query_params.get("sort") or "").strip().lower()
        if sort in {"price_low_to_high", "low_to_high", "asc_price"}:
            return ("selling_price", "id")
        if sort in {"price_high_to_low", "high_to_low", "hgh_to_low", "desc_price"}:
            return ("-selling_price", "id")
        if sort in {"new", "newest", "new_products"}:
            return ("-created_at", "-id")
        return "-id"

    def get(self, request):
        products = get_all_products_admin(
            {
                "sort": request.query_params.get("sort"),
                "category": request.query_params.get("category"),
                "subcategory": request.query_params.get("subcategory"),
                "discounted_only": request.query_params.get("discounted_only"),
                "search": request.query_params.get("search"),
                "min_price": request.query_params.get("min_price"),
                "max_price": request.query_params.get("max_price"),
                "product_type": request.query_params.get("product_type"),
                "in_stock": request.query_params.get("in_stock"),
                "is_active": request.query_params.get("is_active"),
            }
        )
        return self.get_paginated_product_response(request, products, serializer_class=ProductAdminListSerializer)


class ProductAdminDetailBySlugAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, slug):
        try:
            product = get_product_by_slug_admin(slug)
            serializer = ProductAdminDetailSerializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )


class ProductAdminDetailAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, product_id):
        try:
            product = Product.objects.select_related(
                "category",
                "subcategory",
                "product_type",
            ).prefetch_related(
                "images",
                "tags",
                "variants__attributes__attribute_value__attribute",
            ).get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductAdminDetailSerializer(product)
        return Response(serializer.data)
    


class ProductDeleteAPIView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, product_id):
        delete_product(product_id)

        return Response({
            "message": "Product deleted (soft)"
        })
    



class ProductFetchByTagsAPIView(CursorPaginationMixin, APIView):
    permission_classes = [AllowAny]

    @cache_response("products", identifier_fn=product_tag_cache_identifier, ttl=DEFAULT_TTL)
    def get(self, request):
        # Prefer slug-based filtering; keep `tags` as a backward-compatible fallback.
        tag_slugs = request.query_params.getlist("tag_slugs") or request.query_params.getlist("tags")
        if not tag_slugs:
            return Response(
                {"error": "No tag slugs provided. Use `tag_slugs` query param."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_slugs = []
        for value in tag_slugs:
            normalized_slugs.extend(
                [part.strip().lower() for part in value.split(",") if part.strip()]
            )

        if not normalized_slugs:
            return Response(
                {"error": "No valid tag slugs provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        products = Product.objects.filter(
            is_active=True,
            variants__stock__gt=0,
            tags__slug__in=normalized_slugs,
            tags__is_active=True,
        ).distinct().order_by("id")

        return self.get_paginated_product_response(request, products)
    

class ProductTagCreateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ProductTagCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tag_name = serializer.validated_data["name"]
        description = serializer.validated_data.get("description", "")
        is_active = serializer.validated_data.get("is_active", True)
        slug = slugify(tag_name)

        tag, created = ProductTag.objects.get_or_create(
            slug=slug,
            defaults={
                "name": tag_name,
                "description": description,
                "is_active": is_active,
            },
        )

        if not created:
            updated = False
            if tag.name != tag_name:
                tag.name = tag_name
                updated = True
            if description != "" and tag.description != description:
                tag.description = description
                updated = True
            if tag.is_active != is_active:
                tag.is_active = is_active
                updated = True
            if updated:
                tag.save()

        if created:
            return Response({
                "message": "Product tag created successfully",
                "tag": ProductTagSerializer(tag).data,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "message": "Product tag already exists",
                "tag": ProductTagSerializer(tag).data,
            }, status=status.HTTP_200_OK)
        
    def get(self, request):
        tags = ProductTag.objects.all()
        serializer = ProductTagSerializer(tags, many=True)
        return Response(serializer.data)


class ProductAssignTagsAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "product_id": product.id,
                "tags": ProductTagSerializer(product.tags.all(), many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, product_id):
        serializer = ProductTagAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        tag_ids = serializer.validated_data["tag_ids"]
        action = serializer.validated_data["action"]

        tags = ProductTag.objects.filter(id__in=tag_ids)
        if tags.count() != len(set(tag_ids)):
            return Response(
                {"error": "One or more tag ids are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "add":
            product.tags.add(*tags)
        elif action == "remove":
            product.tags.remove(*tags)
        else:
            product.tags.set(tags)

        product.refresh_from_db()

        return Response(
            {
                "message": "Product tags updated successfully.",
                "product_id": product.id,
                "tags": ProductTagSerializer(product.tags.all(), many=True).data,
            },
            status=status.HTTP_200_OK,
        )