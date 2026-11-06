from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.core.exceptions import ValidationError

from .models import Order, DeliverySettings
from .serializers import OrderDetailSerializer


from .serializers import (
    OrderCreateSerializer,
    OrderPublicStatementSerializer,
    OrderPriceCalculatorResponseSerializer,
    OrderListItemSerializer,
    OrderListQuerySerializer,
    OrderUpdateSerializer,
)
from .services import (
    calculate_order_preview,
    create_order,
    update_order_before_confirm,
    cancel_order,
    confirm_order,
    complete_order,
)
from .selectors import get_order_by_public_order_id, get_orders_list
from .pagination import OrderCursorPagination


class CursorPaginationMixin:
    pagination_class = OrderCursorPagination

    def get_cursor_ordering(self, filters):
        sort_by = filters.get("sort_by", "created_at")
        sort_dir = filters.get("sort_dir", "desc")

        if sort_by == "total_amount":
            return ("-total_amount", "-id") if sort_dir == "desc" else ("total_amount", "id")
        if sort_by == "status":
            return ("-status", "-id") if sort_dir == "desc" else ("status", "id")
        return ("-created_at", "-id") if sort_dir == "desc" else ("created_at", "id")

    def get_paginated_response(self, request, queryset, serializer_class, filters):
        paginator = self.pagination_class()
        paginator.ordering = self.get_cursor_ordering(filters)
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = serializer_class(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class CreateOrderAPIView(APIView):

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = create_order(serializer.validated_data)
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        data = OrderPublicStatementSerializer(order).data

        return Response({
            "message": "Order placed successfully.",
            "statement": data
        }, status=status.HTTP_201_CREATED)


class PriceCalculatorAPIView(APIView):

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            calculation = calculate_order_preview(serializer.validated_data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        data = OrderPriceCalculatorResponseSerializer(calculation).data
        return Response(
            {
                "message": "Price calculated successfully",
                "calculation": data,
            },
            status=status.HTTP_200_OK,
        )
    



class OrderListAPIView(CursorPaginationMixin, APIView):
    permission_classes = [IsAdminUser]
    '''
    API view to list orders with optional filtering by status and date range.
    Query Parameters:
        - status: Filter orders by their status (e.g., pending, confirmed, completed, cancelled)
        - start_date: Filter orders created on or after this date (YYYY-MM-DD)
        - end_date: Filter orders created on or before this date (YYYY-MM-DD)
        - search: Search orders by phone number,or public order ID
        - payment_method: Filter orders by payment method (e.g., cash, card, online
        - is_paid: Filter orders by payment status (true or false)
        - sort_by: Field to sort by (created_at, total_amount, status)
        - sort_dir: Sort direction (asc or desc)
    '''

    def get(self, request):
        query_serializer = OrderListQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        filters = query_serializer.validated_data
        orders = get_orders_list(filters)
        return self.get_paginated_response(request, orders, OrderListItemSerializer, filters)





class OrderDetailAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, public_order_id):
        order = get_order_by_public_order_id(public_order_id)

        serializer = OrderDetailSerializer(order)

        return Response(serializer.data)


class AdminOrderUpdateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):
        serializer = OrderUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = update_order_before_confirm(order_id, serializer.validated_data)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            if hasattr(e, "messages") and e.messages:
                message = e.messages[0]
            elif hasattr(e, "message"):
                message = e.message
            else:
                message = str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Order updated successfully.",
                "order_id": str(order.order_id),
                "public_order_id": order.public_order_id,
                "total_amount": order.total_amount,
                "total_amount_before_discount": order.total_amount_before_discount,
            },
            status=status.HTTP_200_OK,
        )


class AdminOrderCancelAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):
        try:
            order = cancel_order(order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            if hasattr(e, "messages") and e.messages:
                message = e.messages[0]
            elif hasattr(e, "message"):
                message = e.message
            else:
                message = str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Order cancelled successfully.",
                "order_id": str(order.order_id),
                "public_order_id": order.public_order_id,
                "status": order.status,
            },
            status=status.HTTP_200_OK,
        )


class AdminOrderConfirmAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):
        try:
            order = confirm_order(order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            if hasattr(e, "messages") and e.messages:
                message = e.messages[0]
            elif hasattr(e, "message"):
                message = e.message
            else:
                message = str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Order confirmed successfully.",
                "order_id": str(order.order_id),
                "public_order_id": order.public_order_id,
                "status": order.status,
            },
            status=status.HTTP_200_OK,
        )


class AdminOrderCompleteAPIView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id):
        try:
            order = complete_order(order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as e:
            if hasattr(e, "messages") and e.messages:
                message = e.messages[0]
            elif hasattr(e, "message"):
                message = e.message
            else:
                message = str(e)
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Order completed successfully.",
                "order_id": str(order.order_id),
                "public_order_id": order.public_order_id,
                "status": order.status,
            },
            status=status.HTTP_200_OK,
        )


class DeliverySettingsAPIView(APIView):
    """Get and update delivery charges and tax settings (admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get current delivery settings."""
        settings = DeliverySettings.get_settings()
        return Response({
            "inside_dhaka_charge": settings.inside_dhaka_charge,
            "outside_dhaka_charge": settings.outside_dhaka_charge,
            "vat_percentage": settings.vat_percentage,
            "tax_percentage": settings.tax_percentage,
            "updated_at": settings.updated_at,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        """Update delivery settings."""
        settings = DeliverySettings.get_settings()
        
        if "inside_dhaka_charge" in request.data:
            try:
                settings.inside_dhaka_charge = request.data["inside_dhaka_charge"]
            except (ValueError, TypeError):
                return Response(
                    {"error": "inside_dhaka_charge must be a valid decimal"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if "outside_dhaka_charge" in request.data:
            try:
                settings.outside_dhaka_charge = request.data["outside_dhaka_charge"]
            except (ValueError, TypeError):
                return Response(
                    {"error": "outside_dhaka_charge must be a valid decimal"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if "vat_percentage" in request.data:
            vat = request.data["vat_percentage"]
            if vat is not None:
                try:
                    vat = float(vat)
                    if vat < 0 or vat > 100:
                        return Response(
                            {"error": "vat_percentage must be between 0 and 100"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    settings.vat_percentage = vat
                except (ValueError, TypeError):
                    return Response(
                        {"error": "vat_percentage must be a valid decimal"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                settings.vat_percentage = None
        
        if "tax_percentage" in request.data:
            tax = request.data["tax_percentage"]
            if tax is not None:
                try:
                    tax = float(tax)
                    if tax < 0 or tax > 100:
                        return Response(
                            {"error": "tax_percentage must be between 0 and 100"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    settings.tax_percentage = tax
                except (ValueError, TypeError):
                    return Response(
                        {"error": "tax_percentage must be a valid decimal"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                settings.tax_percentage = None
        
        settings.save()
        
        return Response({
            "message": "Delivery settings updated successfully.",
            "inside_dhaka_charge": settings.inside_dhaka_charge,
            "outside_dhaka_charge": settings.outside_dhaka_charge,
            "vat_percentage": settings.vat_percentage,
            "tax_percentage": settings.tax_percentage,
            "updated_at": settings.updated_at,
        }, status=status.HTTP_200_OK)
