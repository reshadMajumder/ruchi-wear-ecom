from rest_framework import serializers

from .models import FAQ, PolicyTerms


class PolicyTermsSerializer(serializers.ModelSerializer):
	class Meta:
		model = PolicyTerms
		fields = ["id", "policy_html", "terms_html", "created_at", "updated_at"]
		read_only_fields = ["id", "created_at", "updated_at"]


class FAQSerializer(serializers.ModelSerializer):
	class Meta:
		model = FAQ
		fields = [
			"id",
			"question",
			"answer",
			"is_active",
			"position",
			"created_at",
			"updated_at",
		]
		read_only_fields = ["id", "created_at", "updated_at"]


class PublicFAQSerializer(serializers.ModelSerializer):
	class Meta:
		model = FAQ
		fields = ["id", "question", "answer", "position"]
