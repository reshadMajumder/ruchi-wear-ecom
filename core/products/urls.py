# products/urls.py

from django.urls import path

from .views import (
    GetsectionsListView,
    ProductAssignTagsAPIView,
    ProductAdminDetailAPIView,
    ProductAdminListAPIView,
    ProductAdminDetailBySlugAPIView,
    ProductCreateAPIView,
    ProductDeleteAPIView,
    ProductDetailAPIView,
    ProductFetchByTagsAPIView,
    ProductListAPIView,
    ProductListByDiscountAPIView,
    ProductTagCreateAPIView,
    ProductUpdateAPIView,
    RelatedProductsAPIView,
    SectionCreateAPIView,
    SectionDetailAPIView,
    SectionManageAPIView,
    SectionProductsListAPIView,
)

urlpatterns = [
    path("", ProductListAPIView.as_view(), name="products-list"),
    path("sections/", GetsectionsListView.as_view(), name="products-sections-list"),
    path("sections/<int:section_id>/", SectionDetailAPIView.as_view(), name="products-sections-detail"),
    path("sections/<int:section_id>/products/", SectionProductsListAPIView.as_view(), name="products-sections-products"),
    path("discounted/", ProductListByDiscountAPIView.as_view(), name="products-discounted"),
    path("by-tags/", ProductFetchByTagsAPIView.as_view(), name="products-by-tags"),
    path("<slug:slug>/", ProductDetailAPIView.as_view(), name="products-detail"),
    path("related/<slug:slug>/", RelatedProductsAPIView.as_view(), name="products-related"),
    path("admin/tags/", ProductTagCreateAPIView.as_view(), name="products-tags"),
    path("admin/<int:product_id>/tags/", ProductAssignTagsAPIView.as_view(), name="products-assign-tags"),
    path("admin/list/", ProductAdminListAPIView.as_view(), name="products-admin-list"),
    path("admin/slug/<slug:slug>/details/", ProductAdminDetailBySlugAPIView.as_view(), name="products-admin-detail-slug"),
    path("admin/<int:product_id>/details/", ProductAdminDetailAPIView.as_view(), name="products-admin-detail"),
    path("admin/sections/create/", SectionCreateAPIView.as_view(), name="products-sections-create"),
    path("admin/sections/<int:section_id>/", SectionManageAPIView.as_view(), name="products-sections-manage"),
    path("admin/create/", ProductCreateAPIView.as_view(), name="products-create"),
    path("admin/<int:product_id>/update/", ProductUpdateAPIView.as_view(), name="products-update"),
    path("admin/<int:product_id>/delete/", ProductDeleteAPIView.as_view(), name="products-delete"),  

]