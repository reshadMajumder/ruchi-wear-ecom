from django.urls import path
from .views import *

urlpatterns = [
    path("admin/products/<int:product_id>/", CreateVariantAPIView.as_view()),
    path("admin/products/<int:product_id>/list/", ProductVariantListAPIView.as_view()),
    path("admin/<int:variant_id>/details/", VariantDetailAPIView.as_view()),
    path("admin/<int:variant_id>/update/", UpdateVariantAPIView.as_view()),
    path("admin/<int:variant_id>/stock/", UpdateStockAPIView.as_view()),
    path("admin/<int:variant_id>/delete/", DeleteVariantAPIView.as_view()),
]