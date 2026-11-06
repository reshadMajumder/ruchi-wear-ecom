from django.urls import path
from .views import *

urlpatterns = [
    path("create/", CreateOrderAPIView.as_view()),
    path("price-calculator/", PriceCalculatorAPIView.as_view()),
    path("admin/list/", OrderListAPIView.as_view()),
    path("admin/delivery-settings/", DeliverySettingsAPIView.as_view()),
    path("<str:public_order_id>/details/", OrderDetailAPIView.as_view()),
    path("<uuid:order_id>/admin/update/", AdminOrderUpdateAPIView.as_view()),
    path("<uuid:order_id>/admin/confirm/", AdminOrderConfirmAPIView.as_view()),
    path("<uuid:order_id>/admin/complete/", AdminOrderCompleteAPIView.as_view()),
    path("<uuid:order_id>/admin/cancel/", AdminOrderCancelAPIView.as_view()),
]