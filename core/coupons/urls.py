from django.urls import path

from .views import (
	AdminCouponCreateAPIView,
	AdminCouponListAPIView,
	AdminCouponUpdateDeleteAPIView,
	AdminCouponPhoneUsageUpdateAPIView,
)


urlpatterns = [
	path("admin/create/", AdminCouponCreateAPIView.as_view()),
	path("admin/list/", AdminCouponListAPIView.as_view()),
	path("admin/<int:coupon_id>/update-delete/", AdminCouponUpdateDeleteAPIView.as_view()),
	path("admin/phone-usage/<int:usage_id>/update/", AdminCouponPhoneUsageUpdateAPIView.as_view()),
]
