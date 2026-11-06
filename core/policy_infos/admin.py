from django.contrib import admin

from .models import FAQ, PolicyTerms


@admin.register(PolicyTerms)
class PolicyTermsAdmin(admin.ModelAdmin):
	list_display = ("id", "updated_at")


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
	list_display = ("id", "question", "is_active", "position", "updated_at")
	list_filter = ("is_active",)
	search_fields = ("question", "answer")
