from django.urls import path
from .views import *

urlpatterns = [
    # Public category endpoints
    path("categories/", PublicCategoryListAPIView.as_view(), name="public-categories-list"),
    path("subcategories/", PublicSubCategoryQueryListAPIView.as_view(), name="public-subcategories-query-list"),
    path("category/<int:category_id>/subcategory/", PublicSubCategoryByCategoryIdAPIView.as_view(), name="public-subcategories-by-category-id"),
    path("categories/<slug:category_slug>/subcategories/", PublicSubCategoryListAPIView.as_view(), name="public-subcategories-list"),

    # Category endpoints
    path("admin/categories/", CreateCategoryAPIView.as_view(), name="admin-categories-list-create"),
    path("admin/categories/<int:pk>/", CategoryDetailAPIView.as_view(), name="admin-categories-detail"),

    # Product type endpoints
    path("admin/product-types/", CreateProductTypeAPIView.as_view(), name="admin-product-types-list-create"),
    path("admin/product-types/<int:pk>/", ProductTypeDetailsAPIView.as_view(), name="admin-product-types-detail"),

    # Attribute endpoints
    path("admin/attributes/", CreateAttributeAPIView.as_view(), name="admin-attributes-list-create"),
    path("admin/attributes/<int:pk>/", AttributeDetailsAPIView.as_view(), name="admin-attributes-detail"),

    # Attribute value endpoints
    path("admin/attribute-values/", CreateAttributeValueAPIView.as_view(), name="admin-attribute-values-list-create"),
    path("admin/attribute-values/<int:pk>/", AttributeValueDetailsAPIView.as_view(), name="admin-attribute-values-detail"),

    # Assign attributes to product type
    path("admin/product-type-attributes/", AssignAttributeAPIView.as_view(), name="admin-product-type-attributes-list-create"),
    path("admin/product-type-attributes/<int:pk>/", ProductTypeAttributeAPIView.as_view(), name="admin-product-type-attributes-detail"),
    path("admin/product-types/<int:product_type_id>/attributes/",ProductTypeAttributesByProductTypeAPIView.as_view(),name="admin-product-type-attributes-by-product-type",),
    
]