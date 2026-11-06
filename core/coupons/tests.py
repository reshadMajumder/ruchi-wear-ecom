from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from coupons.models import Coupon, CouponPhoneUsage
from coupons.serializers import (
	CouponCreateSerializer,
	CouponPhoneUsageUpdateSerializer,
	CouponUpdateSerializer,
)


class CouponSerializerTests(TestCase):
	def _base_payload(self):
		now = timezone.now()
		return {
			"code": "TEST10",
			"discount_type": "fixed",
			"value": "10.00",
			"min_order_amount": "0.00",
			"max_discount_amount": None,
			"is_active": True,
			"start_date": (now - timedelta(days=1)).isoformat(),
			"end_date": (now + timedelta(days=1)).isoformat(),
		}

	def test_specific_coupon_requires_phone_entries(self):
		payload = self._base_payload()
		payload["scope"] = "specific"

		serializer = CouponCreateSerializer(data=payload)
		self.assertFalse(serializer.is_valid())

	def test_global_coupon_disallows_phone_entries(self):
		payload = self._base_payload()
		payload["scope"] = "global"
		payload["phone_usages"] = [
			{
				"holder_name": "Special User",
				"phone_number": "01700000000",
				"usable_count": 1,
			}
		]

		serializer = CouponCreateSerializer(data=payload)
		self.assertFalse(serializer.is_valid())

	def test_specific_coupon_with_phone_entries_is_valid(self):
		payload = self._base_payload()
		payload["scope"] = "specific"
		payload["phone_usages"] = [
			{
				"holder_name": "Special User",
				"phone_number": "01700000000",
				"usable_count": 2,
			}
		]

		serializer = CouponCreateSerializer(data=payload)
		self.assertTrue(serializer.is_valid(), serializer.errors)

	def test_update_coupon_to_global_fails_when_phone_usages_exist(self):
		now = timezone.now()
		coupon = Coupon.objects.create(
			code="SPECIFIC1",
			discount_type="fixed",
			scope="specific",
			value="20.00",
			is_active=True,
			start_date=now - timedelta(days=1),
			end_date=now + timedelta(days=1),
		)
		CouponPhoneUsage.objects.create(
			coupon=coupon,
			holder_name="VIP",
			phone_number="01700000000",
			usable_count=2,
		)

		serializer = CouponUpdateSerializer(coupon, data={"scope": "global"}, partial=True)
		self.assertFalse(serializer.is_valid())

	def test_update_phone_usage_serializer_is_valid(self):
		now = timezone.now()
		coupon = Coupon.objects.create(
			code="SPECIFIC2",
			discount_type="fixed",
			scope="specific",
			value="20.00",
			is_active=True,
			start_date=now - timedelta(days=1),
			end_date=now + timedelta(days=1),
		)
		usage = CouponPhoneUsage.objects.create(
			coupon=coupon,
			holder_name="VIP",
			phone_number="01700000000",
			usable_count=2,
		)

		serializer = CouponPhoneUsageUpdateSerializer(
			usage,
			data={"holder_name": "Updated VIP", "usable_count": 5},
			partial=True,
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
