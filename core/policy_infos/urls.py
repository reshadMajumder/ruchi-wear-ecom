from django.urls import path

from .views import (
	AdminFAQCreateListAPIView,
	AdminFAQDetailAPIView,
	AdminPolicyTermsAPIView,
	PublicFAQDetailAPIView,
	PublicFAQListAPIView,
	PublicPolicyTermsAPIView,
)

urlpatterns = [
	path("admin/policy-terms/", AdminPolicyTermsAPIView.as_view()),
	path("admin/faqs/", AdminFAQCreateListAPIView.as_view()),
	path("admin/faqs/<int:faq_id>/", AdminFAQDetailAPIView.as_view()),
	path("policy-terms/", PublicPolicyTermsAPIView.as_view()),
	path("faqs/", PublicFAQListAPIView.as_view()),
	path("faqs/<int:faq_id>/", PublicFAQDetailAPIView.as_view()),
]
