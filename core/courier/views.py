from __future__ import annotations

import logging

from django.conf import settings
from django.http import Http404
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from courier.models import CourierOrder, CourierStore
from courier.selectors.courier_selectors import get_courier_order_for_order
from courier.serializers import (
    AdminRestoreStockSerializer,
    CourierAreaSerializer,
    CourierBulkCreateDeliverySerializer,
    CourierCitySerializer,
    CourierMerchantStoreSerializer,
    CourierStoreCreateRequestSerializer,
    CourierOrderSerializer,
    CourierOrderStatusSerializer,
    CourierPriceRequestSerializer,
    CourierPriceResponseSerializer,
    CourierStoreSerializer,
    CourierZoneSerializer,
    PathaoWebhookSerializer,
)
from courier.services.order_service import courier_order_service
from courier.services.pricing_service import courier_pricing_service
from courier.services.signature_validator import PathaoSignatureValidator
from courier.services.status_mapper import normalize_event
from courier.services.stock_manager import courier_stock_manager
from courier.services.sync_service import create_merchant_store, get_areas, get_cities, get_zones, sync_merchant_stores
from courier.services.webhook_processor import create_webhook_log, pathao_webhook_processor
from courier.tasks.sync_orders import bulk_create_delivery_task
from courier.tasks.webhooks import process_pathao_webhook_task
from order import services as order_services
from order.models import Order
from order.pagination import OrderCursorPagination


class CourierCursorPagination(OrderCursorPagination):
    ordering = '-created_at'


class CourierPaginationMixin:
    pagination_class = CourierCursorPagination

    def get_paginated_response(self, request, queryset, serializer_class):
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = serializer_class(page, many=True)
        return paginator.get_paginated_response(serializer.data)


logger = logging.getLogger(__name__)


def _store_payload(store: CourierStore) -> dict:
    payload = dict(store.raw_response or {}) if isinstance(store.raw_response, dict) else {}
    payload.setdefault('store_id', int(store.store_id) if str(store.store_id).isdigit() else store.store_id)
    payload.setdefault('store_name', store.store_name)
    payload.setdefault('store_address', store.store_address)
    payload.setdefault('is_active', 1 if store.is_active else 0)
    payload.setdefault('city_id', int(store.city_id) if str(store.city_id).isdigit() else store.city_id)
    payload.setdefault('zone_id', int(store.zone_id) if str(store.zone_id).isdigit() else store.zone_id)
    payload.setdefault('hub_id', int(store.hub_id) if str(store.hub_id).isdigit() else store.hub_id or None)
    payload.setdefault('is_default_store', store.is_default_store)
    payload.setdefault('is_default_return_store', store.is_default_return_store)
    return payload


def _validation_error_response(exc: ValidationError):
    if hasattr(exc, 'message_dict'):
        return exc.message_dict
    if hasattr(exc, 'messages') and exc.messages:
        return exc.messages[0]
    return str(exc)


def _extract_order(order_id):
    return Order.objects.prefetch_related('items__variant').get(order_id=order_id)


class CourierCitiesAPIView(APIView):
    def get(self, request):
        data = get_cities()
        return Response(CourierCitySerializer(data, many=True).data, status=status.HTTP_200_OK)


class CourierZonesAPIView(APIView):
    def get(self, request, city_id):
        data = get_zones(city_id)
        return Response(CourierZoneSerializer(data, many=True).data, status=status.HTTP_200_OK)


class CourierAreasAPIView(APIView):
    def get(self, request, zone_id):
        data = get_areas(zone_id)
        return Response(CourierAreaSerializer(data, many=True).data, status=status.HTTP_200_OK)


class CourierMerchantStoresAPIView(APIView):
    def get(self, request):
        logger.info('CourierMerchantStoresAPIView GET hit')
        payload = [
            _store_payload(store)
            for store in CourierStore.objects.filter(provider='pathao').order_by('-updated_at')
        ]

        return Response(
            {
                'message': 'Store list fetched.',
                'type': 'success',
                'code': 200,
                'data': {
                    'data': payload,
                    'total': len(payload),
                    'current_page': 1,
                    'per_page': len(payload) or 1000,
                    'total_in_page': len(payload),
                    'last_page': 1,
                    'path': request.build_absolute_uri(request.path),
                    'to': len(payload),
                    'from': 1 if payload else 0,
                    'last_page_url': request.build_absolute_uri(request.path),
                    'first_page_url': request.build_absolute_uri(request.path),
                },
            },
            status=status.HTTP_200_OK,
        )


class CourierPriceAPIView(APIView):
    def post(self, request):
        serializer = CourierPriceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            data = courier_pricing_service.calculate_price(**serializer.validated_data)
        except ValidationError as exc:
            return Response({'error': _validation_error_response(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'message': 'Courier price calculated successfully.',
                'calculation': CourierPriceResponseSerializer(data).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminCreateDeliveryAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, order_id):
        try:
            order = _extract_order(order_id)
            courier_order = courier_order_service.create_delivery(order, overrides=request.data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({'error': _validation_error_response(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'message': 'Courier delivery created successfully.',
                'courier_order': CourierOrderSerializer(courier_order).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminDeliveryStatusAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, order_id):
        try:
            order = _extract_order(order_id)
            courier_order = get_courier_order_for_order(order)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Http404:
            return Response({'error': 'Courier delivery has not been created for this order.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(CourierOrderStatusSerializer(courier_order).data, status=status.HTTP_200_OK)


class AdminBulkCreateDeliveryAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = CourierBulkCreateDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = bulk_create_delivery_task.delay([str(order_id) for order_id in serializer.validated_data['order_ids']])
        return Response(
            {
                'message': 'Courier delivery creation queued.',
                'task_id': task.id,
                'order_ids': serializer.validated_data['order_ids'],
            },
            status=status.HTTP_202_ACCEPTED,
        )


class AdminCourierStoresSyncAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Fetch all synced stores from database."""
        stores = CourierStore.objects.filter(provider='pathao').order_by('-updated_at')
        payload = [_store_payload(store) for store in stores]

        return Response(
            {
                'message': 'Store list fetched.',
                'type': 'success',
                'code': 200,
                'data': {
                    'data': payload,
                    'total': len(payload),
                    'current_page': 1,
                    'per_page': len(payload) or 1000,
                    'total_in_page': len(payload),
                    'last_page': 1,
                    'path': request.build_absolute_uri(request.path),
                    'to': len(payload),
                    'from': 1 if payload else 0,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        """Fetch stores from Pathao API and sync to database."""
        try:
            synced_stores = sync_merchant_stores()
        except ValidationError as exc:
            return Response({'error': _validation_error_response(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = [_store_payload(store) for store in synced_stores]
        return Response(
            {
                'message': f'Successfully synced {len(synced_stores)} store(s).',
                'type': 'success',
                'code': 200,
                'data': {
                    'data': payload,
                    'total': len(payload),
                },
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class PathaoWebhookAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        # Use request._request.body to avoid RawPostDataException after reading request.data
        raw_body = request._request.body
        logger.info('PathaoWebhookAPIView received request: %s', request.path, extra={'data': request.data, 'headers': dict(request.headers)})
        signature = (
            request.headers.get('X-PATHAO-Signature')
            or request.headers.get('X-Pathao-Signature')
            or request.META.get('HTTP_X_PATHAO_SIGNATURE')
            or request.META.get('HTTP_X_PATHAO_SIGNATURE'.upper())
            or ''
        )
        response_secret = str(getattr(settings, 'PATHAO_WEBHOOK_INTEGRATION_SECRET', '') or '')

        logger.debug('webhook_raw_body', extra={'body': raw_body[:500], 'content_type': request.content_type})

        serializer = PathaoWebhookSerializer(data=request.data)
        if serializer.is_valid():
            payload = serializer.validated_data
        else:
            logger.warning('webhook_serializer_invalid', extra={'errors': serializer.errors})
            payload = request.data if isinstance(request.data, dict) else {}

        logger.debug('webhook_payload_extracted', extra={'payload': payload})

        event_name = str(
            payload.get('event')
            or payload.get('type')
            or payload.get('event_name')
            or ''
        ).strip().lower()

        if event_name != 'webhook_integration':
            try:
                validator = PathaoSignatureValidator(str(getattr(settings, 'PATHAO_WEBHOOK_SECRET', '') or ''))
                if signature:
                    validator.validate_or_raise(raw_body, signature)
                else:
                    logger.info(
                        'pathao_webhook_missing_signature',
                        extra={'event': event_name, 'path': request.path},
                    )
            except ValidationError as exc:
                logger.warning('pathao_webhook_invalid_signature', extra={'reason': str(exc)})
                response = Response({'error': _validation_error_response(exc)}, status=status.HTTP_401_UNAUTHORIZED)
                response['X-Pathao-Merchant-Webhook-Integration-Secret'] = response_secret
                return response

        headers = dict(request.headers.items())

        if event_name == 'webhook_integration':
            response = Response(
                {
                    'message': 'Webhook integration verified.',
                    'event': event_name,
                },
                status=status.HTTP_202_ACCEPTED,
            )
            response['X-Pathao-Merchant-Webhook-Integration-Secret'] = response_secret
            return response

        webhook_log, created = create_webhook_log(payload, headers, signature)

        use_celery = bool(getattr(settings, 'PATHAO_WEBHOOK_USE_CELERY', True))
        if use_celery and (created or not webhook_log.processed):
            process_pathao_webhook_task.delay(webhook_log.id)
        elif created or not webhook_log.processed:
            try:
                pathao_webhook_processor.process_by_log_id(webhook_log.id)
            except Exception as exc:
                logger.exception('webhook_processor_sync_failed', extra={'webhook_log_id': webhook_log.id})
                # Don't re-raise: webhook endpoint should always return 202
        else:
            logger.debug('webhook_already_processed', extra={'webhook_log_id': webhook_log.id, 'duplicate': not created})

        response = Response(
            {
                'message': 'Webhook accepted.',
                'webhook_log_id': webhook_log.id,
                'queued': bool(use_celery),
                'duplicate': not created,
            },
            status=status.HTTP_202_ACCEPTED,
        )
        response['X-Pathao-Merchant-Webhook-Integration-Secret'] = response_secret
        return response


class AdminOrderRestoreStockAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, order_id):
        serializer = AdminRestoreStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            order = _extract_order(order_id)
            courier_order = get_courier_order_for_order(order)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Http404:
            return Response({'error': 'Courier delivery has not been created for this order.'}, status=status.HTTP_404_NOT_FOUND)

        restored = courier_stock_manager.restore_reserved_stock_once(
            courier_order,
            reason=serializer.validated_data.get('reason', 'admin_manual_restore'),
        )
        if not restored:
            return Response({'error': 'Stock has already been restored for this courier order.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Stock restored successfully.'}, status=status.HTTP_200_OK)


class AdminOrderMarkReturnedAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, order_id):
        try:
            order = _extract_order(order_id)
            courier_order = get_courier_order_for_order(order)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Http404:
            return Response({'error': 'Courier delivery has not been created for this order.'}, status=status.HTTP_404_NOT_FOUND)

        courier_order.is_returned = True
        courier_order.current_status = 'order.returned'
        courier_order.status = 'order.returned'
        courier_order.current_status_slug = normalize_event('order.returned').replace('.', '_').replace('-', '_')
        courier_order.save(update_fields=['is_returned', 'current_status', 'status', 'current_status_slug', 'updated_at'])
        return Response({'message': 'Order marked as returned.'}, status=status.HTTP_200_OK)


class AdminOrderMarkDeliveredAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, order_id):
        try:
            order = _extract_order(order_id)
            courier_order = get_courier_order_for_order(order)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Http404:
            return Response({'error': 'Courier delivery has not been created for this order.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            if order.status == 'pending':
                order_services.confirm_order(order.order_id)
                order.refresh_from_db(fields=['status'])
            if order.status == 'confirmed':
                order_services.complete_order(order.order_id)
        except ValidationError as exc:
            return Response({'error': _validation_error_response(exc)}, status=status.HTTP_400_BAD_REQUEST)

        courier_order.is_delivered = True
        courier_order.current_status = 'order.delivered'
        courier_order.status = 'order.delivered'
        courier_order.current_status_slug = normalize_event('order.delivered').replace('.', '_').replace('-', '_')
        courier_order.save(update_fields=['is_delivered', 'current_status', 'status', 'current_status_slug', 'updated_at'])
        return Response({'message': 'Order marked as delivered.'}, status=status.HTTP_200_OK)


class AdminCourierStoreCreateAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = CourierStoreCreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            store, response = create_merchant_store(serializer.validated_data)
        except ValidationError as exc:
            return Response({'error': _validation_error_response(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'message': response.get('message', 'Store created successfully.'),
                'store': _store_payload(store),
                'raw_response': response,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminCourierOrderListAPIView(CourierPaginationMixin, APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = CourierOrder.objects.select_related('order').all()

        # Search support
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(consignment_id__icontains=search) | 
                Q(merchant_order_id__icontains=search) |
                Q(order__public_order_id__icontains=search) |
                Q(order__customer_name__icontains=search) |
                Q(order__customer_phone__icontains=search)
            )

        # Simple status filtering
        status_slug = request.query_params.get('status')
        if status_slug:
            queryset = queryset.filter(current_status_slug=status_slug)

        return self.get_paginated_response(request, queryset, CourierOrderSerializer)
