from django.urls import path

from courier.views import (
    AdminBulkCreateDeliveryAPIView,
    AdminOrderMarkDeliveredAPIView,
    AdminOrderMarkReturnedAPIView,
    AdminOrderRestoreStockAPIView,
    AdminCourierOrderListAPIView,
    AdminCourierStoreCreateAPIView,
    AdminCourierStoresSyncAPIView,
    AdminCreateDeliveryAPIView,
    AdminDeliveryStatusAPIView,
    CourierAreasAPIView,
    CourierCitiesAPIView,
    CourierMerchantStoresAPIView,
    PathaoWebhookAPIView,
    CourierPriceAPIView,
    CourierZonesAPIView,
)


urlpatterns = [
    path('courier/cities/', CourierCitiesAPIView.as_view()),
    path('courier/zones/<int:city_id>/', CourierZonesAPIView.as_view()),
    path('courier/areas/<int:zone_id>/', CourierAreasAPIView.as_view()),
    path('courier/calculate-price/', CourierPriceAPIView.as_view()),
    path('courier/stores/', CourierMerchantStoresAPIView.as_view()),
    path('courier/pathao/webhook/', PathaoWebhookAPIView.as_view()),
    path('admin/orders/<uuid:order_id>/create-delivery/', AdminCreateDeliveryAPIView.as_view()),
    path('admin/orders/<uuid:order_id>/delivery-status/', AdminDeliveryStatusAPIView.as_view()),
    path('admin/orders/<uuid:order_id>/restore-stock/', AdminOrderRestoreStockAPIView.as_view()),
    path('admin/orders/<uuid:order_id>/mark-returned/', AdminOrderMarkReturnedAPIView.as_view()),
    path('admin/orders/<uuid:order_id>/mark-delivered/', AdminOrderMarkDeliveredAPIView.as_view()),
    path('admin/orders/bulk-create-delivery/', AdminBulkCreateDeliveryAPIView.as_view()),
    path('admin/orders/courier-list/', AdminCourierOrderListAPIView.as_view()),
    path('admin/courier/stores/create/', AdminCourierStoreCreateAPIView.as_view()),
    path('admin/courier/stores/', AdminCourierStoresSyncAPIView.as_view()),
    path('admin/courier/stores/sync/', AdminCourierStoresSyncAPIView.as_view()),
]
