from rest_framework import serializers
from decimal import Decimal

from .models import Coupon, CouponPhoneUsage


class CouponPhoneUsageSerializer(serializers.ModelSerializer):
	class Meta:
		model = CouponPhoneUsage
		fields = ["id", "holder_name", "phone_number", "usable_count", "used_count"]
		read_only_fields = ["id", "used_count"]


class CouponCreateSerializer(serializers.ModelSerializer):
	phone_usages = CouponPhoneUsageSerializer(many=True, required=False)

	class Meta:
		model = Coupon
		fields = [
			"code",
			"discount_type",
			"scope",
			"value",
			"min_order_amount",
			"max_discount_amount",
			"is_active",
			"start_date",
			"end_date",
			"phone_usages",
		]

	def validate(self, attrs):
		phone_usages = attrs.get("phone_usages", [])
 
		value = Decimal(str(attrs["value"]))

		if attrs["end_date"] <= attrs["start_date"]:
			raise serializers.ValidationError("End date must be after start date.")

		if value <= 0:
			raise serializers.ValidationError("Coupon value must be greater than 0.")

		if attrs["discount_type"] == "percentage" and value > 100:
			raise serializers.ValidationError("Percentage discount cannot exceed 100.")

		if attrs["scope"] == "specific" and not phone_usages:
			raise serializers.ValidationError(
				"Specific coupons require at least one recipient with phone and usage limit."
			)

		if attrs["scope"] == "global" and phone_usages:
			raise serializers.ValidationError(
				"Global coupons are available for everyone and should not include specific phone entries."
			)

		return attrs

	def create(self, validated_data):
		phone_usages_data = validated_data.pop("phone_usages", [])

		coupon = Coupon.objects.create(**validated_data)
		for usage_data in phone_usages_data:
			CouponPhoneUsage.objects.create(coupon=coupon, **usage_data)

		return coupon


class CouponUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Coupon
		fields = [
			"code",
			"discount_type",
			"scope",
			"value",
			"min_order_amount",
			"max_discount_amount",
			"is_active",
			"start_date",
			"end_date",
		]

	def validate(self, attrs):
		instance = self.instance

		start_date = attrs.get("start_date", instance.start_date)
		end_date = attrs.get("end_date", instance.end_date)
		discount_type = attrs.get("discount_type", instance.discount_type)
		value = Decimal(str(attrs.get("value", instance.value)))
		scope = attrs.get("scope", instance.scope)

		if end_date <= start_date:
			raise serializers.ValidationError("End date must be after start date.")

		if value <= 0:
			raise serializers.ValidationError("Coupon value must be greater than 0.")

		if discount_type == "percentage" and value > 100:
			raise serializers.ValidationError("Percentage discount cannot exceed 100.")

		if scope == "specific" and not instance.phone_usages.exists():
			raise serializers.ValidationError(
				"Specific coupons require at least one recipient with phone and usage limit."
			)

		if scope == "global" and instance.phone_usages.exists():
			raise serializers.ValidationError(
				"Global coupons cannot keep specific phone recipients. Update or remove recipients first."
			)

		return attrs


class CouponPhoneUsageUpdateSerializer(serializers.ModelSerializer):
	class Meta:
		model = CouponPhoneUsage
		fields = ["holder_name", "phone_number", "usable_count"]


class CouponListSerializer(serializers.ModelSerializer):
	phone_usages = CouponPhoneUsageSerializer(many=True)

	class Meta:
		model = Coupon
		fields = [
			"id",
			"code",
			"discount_type",
			"scope",
			"value",
			"min_order_amount",
			"max_discount_amount",
			"is_active",
			"start_date",
			"end_date",
			"phone_usages",
		]
