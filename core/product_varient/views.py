from django.shortcuts import render
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from products.models import ProductVariant

from products.services.variant_service import (
    add_variant_to_product,
    update_variant,
    update_variant_stock,
  
)

from .selectors.variant_selector import (
    get_product_variants,
    get_variant_by_id
)

from .serializers import (
    VariantCreateSerializer,
    VariantUpdateSerializer,
    StockUpdateSerializer
)



class CreateVariantAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, product_id):
        serializer = VariantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variant = add_variant_to_product(product_id, serializer.validated_data)

        return Response({
            "message": "Variant created",
            "variant_id": variant.id
        })
    

class ProductVariantListAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, product_id):
        variants = get_product_variants(product_id)

        data = [
            {
                "id": v.id,
                "sku": v.sku,
                "stock": v.stock,
                "attributes": [
                    {
                        "attribute": a.attribute_value.attribute.name,
                        "value": a.attribute_value.value
                    }
                    for a in v.attributes.all()
                ]
            }
            for v in variants
        ]

        return Response(data)
    

class VariantDetailAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, variant_id):
        v = get_variant_by_id(variant_id)

        data = {
            "id": v.id,
            "sku": v.sku,
            "stock": v.stock,
            "attributes": [
                {
                    "attribute": a.attribute_value.attribute.name,
                    "value": a.attribute_value.value
                }
                for a in v.attributes.all()
            ]
        }

        return Response(data)
    

class UpdateVariantAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, variant_id):
        serializer = VariantUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            variant = update_variant(variant_id, serializer.validated_data)
            return Response({
                "message": "Variant updated",
                "variant_id": variant.id
            })
        except ProductVariant.DoesNotExist:
            return Response(
                {"error": "Variant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except DjangoValidationError as e:
            message = e.message if hasattr(e, "message") else str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {
                    "error": "Invalid attribute data. Ensure all attribute value IDs exist and belong to this product type."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    

class UpdateStockAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, variant_id):
        serializer = StockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            update_variant_stock(
                variant_id,
                serializer.validated_data["quantity"],
                serializer.validated_data["operation"]
            )
            return Response({"message": "Stock updated"})
        except ProductVariant.DoesNotExist:
            return Response(
                {"error": "Variant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except DjangoValidationError as e:
            if hasattr(e, "messages") and e.messages:
                message = e.messages[0]
            elif hasattr(e, "message"):
                message = e.message
            else:
                message = str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
    


class DeleteVariantAPIView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, variant_id):
        variant = get_variant_by_id(variant_id)

        # better than hard delete
        variant.stock = 0
        variant.save()

        return Response({"message": "Variant disabled"})