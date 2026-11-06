from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from .models import Coupon, CouponPhoneUsage
from .serializers import (
	CouponCreateSerializer,
	CouponListSerializer,
	CouponUpdateSerializer,
	CouponPhoneUsageUpdateSerializer,
)
from .pagination import CouponCursorPagination


class CursorPaginationMixin:
	pagination_class = CouponCursorPagination

	def get_paginated_response(self, request, queryset, serializer_class):
		paginator = self.pagination_class()
		page = paginator.paginate_queryset(queryset, request, view=self)
		serializer = serializer_class(page, many=True)
		return paginator.get_paginated_response(serializer.data)


class AdminCouponCreateAPIView(APIView):
	permission_classes = [IsAdminUser]

	def post(self, request):
		serializer = CouponCreateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		coupon = serializer.save()

		return Response(
			{
				"message": "Coupon created successfully.",
				"coupon_id": coupon.id,
				"code": coupon.code,
			},
			status=status.HTTP_201_CREATED,
		)


class AdminCouponListAPIView(CursorPaginationMixin, APIView):
	permission_classes = [IsAdminUser]

	def get(self, request):
		coupons = Coupon.objects.prefetch_related("phone_usages").all().order_by("-id")
		return self.get_paginated_response(request, coupons, CouponListSerializer)


class AdminCouponUpdateDeleteAPIView(APIView):
	permission_classes = [IsAdminUser]

	def patch(self, request, coupon_id):
		coupon = get_object_or_404(Coupon, id=coupon_id)
		serializer = CouponUpdateSerializer(coupon, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		updated_coupon = serializer.save()

		return Response(
			{
				"message": "Coupon updated successfully.",
				"coupon_id": updated_coupon.id,
				"code": updated_coupon.code,
			},
			status=status.HTTP_200_OK,
		)

	def delete(self, request, coupon_id):
		coupon = get_object_or_404(Coupon, id=coupon_id)
		coupon.delete()
		return Response({"message": "Coupon deleted successfully."}, status=status.HTTP_200_OK)


class AdminCouponPhoneUsageUpdateAPIView(APIView):
	permission_classes = [IsAdminUser]

	def patch(self, request, usage_id):
		usage = get_object_or_404(CouponPhoneUsage, id=usage_id)
		serializer = CouponPhoneUsageUpdateSerializer(usage, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		updated_usage = serializer.save()

		return Response(
			{
				"message": "Coupon phone usage updated successfully.",
				"usage_id": updated_usage.id,
				"phone_number": updated_usage.phone_number,
			},
			status=status.HTTP_200_OK,
		)
