from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.cache_utils import (
    CacheKeyBuilder,
    CacheManager,
    cache_response,
    invalidate_cache,
)

from .models import FAQ, PolicyTerms
from .serializers import FAQSerializer, PolicyTermsSerializer, PublicFAQSerializer

NAMESPACE = "policy_infos"


class AdminPolicyTermsAPIView(APIView):
	permission_classes = [IsAdminUser]

	def get(self, request):
		obj = PolicyTerms.objects.first()
		if not obj:
			return Response({"error": "Policy & terms not found."}, status=status.HTTP_404_NOT_FOUND)
		return Response(PolicyTermsSerializer(obj).data)

	def post(self, request):
		if PolicyTerms.objects.exists():
			return Response(
				{"error": "Policy & terms already exist. Use PATCH to update."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		serializer = PolicyTermsSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		obj = serializer.save()

		return Response(
			{
				"message": "Policy & terms created successfully.",
				"data": PolicyTermsSerializer(obj).data,
			},
			status=status.HTTP_201_CREATED,
		)

	def patch(self, request):
		obj = PolicyTerms.objects.first()
		if not obj:
			return Response({"error": "Policy & terms not found."}, status=status.HTTP_404_NOT_FOUND)

		serializer = PolicyTermsSerializer(obj, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response(
			{
				"message": "Policy & terms updated successfully.",
				"data": serializer.data,
			},
			status=status.HTTP_200_OK,
		)

	def delete(self, request):
		obj = PolicyTerms.objects.first()
		if not obj:
			return Response({"error": "Policy & terms not found."}, status=status.HTTP_404_NOT_FOUND)

		obj.delete()
		return Response({"message": "Policy & terms deleted successfully."}, status=status.HTTP_200_OK)


class PublicPolicyTermsAPIView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		cache_key = CacheKeyBuilder.build(NAMESPACE, "policy_terms")
		
		# Try cache first
		cached_data = CacheManager.get(cache_key)
		if cached_data is not None:
			return Response(cached_data, status=status.HTTP_200_OK)
		
		obj = PolicyTerms.objects.first()
		if not obj:
			return Response({"error": "Policy & terms not found."}, status=status.HTTP_404_NOT_FOUND)
		
		response_data = PolicyTermsSerializer(obj).data
		# Cache for 1 hour
		CacheManager.set(cache_key, response_data, ttl=3600)
		
		return Response(response_data, status=status.HTTP_200_OK)


class AdminFAQCreateListAPIView(APIView):
	permission_classes = [IsAdminUser]

	def post(self, request):
		serializer = FAQSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		faq = serializer.save()

		return Response(
			{
				"message": "FAQ created successfully.",
				"data": FAQSerializer(faq).data,
			},
			status=status.HTTP_201_CREATED,
		)

	def get(self, request):
		cache_key = CacheKeyBuilder.build(NAMESPACE, "faq_list")
		
		# Try cache first
		cached_data = CacheManager.get(cache_key)
		if cached_data is not None:
			return Response(cached_data, status=status.HTTP_200_OK)
		
		faqs = FAQ.objects.all().defer("created_at", "updated_at")
		response_data = FAQSerializer(faqs, many=True).data
		
		# Cache for 1 hour
		CacheManager.set(cache_key, response_data, ttl=3600)
		
		return Response(response_data, status=status.HTTP_200_OK)


class AdminFAQDetailAPIView(APIView):
	permission_classes = [IsAdminUser]

	def get(self, request, faq_id):
		cache_key = CacheKeyBuilder.build(NAMESPACE, f"faq_detail_{faq_id}")
		
		# Try cache first
		cached_data = CacheManager.get(cache_key)
		if cached_data is not None:
			return Response(cached_data, status=status.HTTP_200_OK)
		
		faq = get_object_or_404(FAQ, id=faq_id)
		response_data = FAQSerializer(faq).data
		
		# Cache for 1 hour
		CacheManager.set(cache_key, response_data, ttl=3600)
		
		return Response(response_data, status=status.HTTP_200_OK)

	def patch(self, request, faq_id):
		faq = get_object_or_404(FAQ, id=faq_id)
		serializer = FAQSerializer(faq, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(
			{
				"message": "FAQ updated successfully.",
				"data": serializer.data,
			},
			status=status.HTTP_200_OK,
		)

	def delete(self, request, faq_id):
		faq = get_object_or_404(FAQ, id=faq_id)
		faq.delete()
		return Response({"message": "FAQ deleted successfully."}, status=status.HTTP_200_OK)


class PublicFAQListAPIView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		cache_key = CacheKeyBuilder.build(NAMESPACE, "faq_public_list")
		
		# Try cache first
		cached_data = CacheManager.get(cache_key)
		if cached_data is not None:
			return Response(cached_data, status=status.HTTP_200_OK)
		
		faqs = FAQ.objects.filter(is_active=True).only("id", "question", "answer", "position")
		response_data = PublicFAQSerializer(faqs, many=True).data
		
		# Cache for 1 hour
		CacheManager.set(cache_key, response_data, ttl=3600)
		
		return Response(response_data, status=status.HTTP_200_OK)


class PublicFAQDetailAPIView(APIView):
	permission_classes = [AllowAny]

	def get(self, request, faq_id):
		cache_key = CacheKeyBuilder.build(NAMESPACE, f"faq_public_detail_{faq_id}")
		
		# Try cache first
		cached_data = CacheManager.get(cache_key)
		if cached_data is not None:
			return Response(cached_data, status=status.HTTP_200_OK)
		
		faq = get_object_or_404(FAQ.objects.only("id", "question", "answer", "position"), id=faq_id, is_active=True)
		response_data = PublicFAQSerializer(faq).data
		
		# Cache for 1 hour
		CacheManager.set(cache_key, response_data, ttl=3600)
		
		return Response(response_data, status=status.HTTP_200_OK)

