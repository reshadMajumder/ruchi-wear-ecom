from django.urls import path
from .views import *

urlpatterns = [
    path("admin/create/", CreateDiscountAPIView.as_view()),
    path("admin/update/<int:discount_id>/", DiscountDetailAPIView.as_view()),
    path("admin/delete/<int:discount_id>/", DiscountDetailAPIView.as_view()),
    path("admin/detail/<int:discount_id>/", DiscountDetailAPIView.as_view()),
    path("list/", CreateDiscountAPIView.as_view()),
    path("admin/assign/", AssignDiscountAPIView.as_view()),
    path("admin/assign/list/", AssignDiscountAPIView.as_view()),
    path("admin/unassign/", DetachDiscountAPIView.as_view()),
    path("cards/", DiscountCardsAPIView.as_view()),
    path("cards/<int:discount_id>/products/", DiscountProductsAPIView.as_view()),
]