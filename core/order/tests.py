from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework.test import APIRequestFactory

from order.models import Order, OrderItem, DeliverySettings
from order.serializers import OrderCreateSerializer, OrderDetailSerializer, OrderPublicStatementSerializer
from order.views import PriceCalculatorAPIView
from order.services import (
	create_order,
	update_order_before_confirm,
	cancel_order,
	confirm_order,
	complete_order,
)
from coupons.models import Coupon, CouponPhoneUsage
from products.models import Category, Product, ProductType, ProductVariant, Attribute, AttributeValue, VariantAttributeValue


class OrderStockReconciliationTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(name="Electronics", slug="electronics")
		self.product_type = ProductType.objects.create(name="Phone")

		self.product_a = Product.objects.create(
			name="Phone A",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="500.00",
			selling_price="700.00",
		)
		self.product_b = Product.objects.create(
			name="Phone B",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="400.00",
			selling_price="600.00",
		)

		self.variant_a = ProductVariant.objects.create(
			product=self.product_a,
			sku="SKU-A",
			stock=10,
			combination_hash="hash-a",
		)
		self.variant_b = ProductVariant.objects.create(
			product=self.product_b,
			sku="SKU-B",
			stock=6,
			combination_hash="hash-b",
		)

	def _create_pending_order(self, variant_id, quantity):
		return create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": variant_id, "quantity": quantity}],
			}
		)

	def _create_coupon(self, code, discount_type="fixed", value="50.00", scope="global"):
		now = timezone.now()
		return Coupon.objects.create(
			code=code,
			discount_type=discount_type,
			scope=scope,
			value=value,
			is_active=True,
			start_date=now - timedelta(days=1),
			end_date=now + timedelta(days=1),
		)
	def test_update_order_same_variant_quantity_reconciles_stock(self):
		order = self._create_pending_order(self.variant_a.id, 2)
		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 8)

		update_order_before_confirm(
			order.order_id,
			{
				"items": [
					{"variant_id": self.variant_a.id, "quantity": 5},
				]
			},
		)

		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 5)

		updated_item = OrderItem.objects.get(order=order)
		self.assertEqual(updated_item.variant_id, self.variant_a.id)
		self.assertEqual(updated_item.quantity, 5)

	def test_create_order_aggregates_duplicate_variant_line_items(self):
		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [
					{"variant_id": self.variant_a.id, "quantity": 3},
					{"variant_id": self.variant_a.id, "quantity": 4},
				],
			}
		)

		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 3)

		items = list(OrderItem.objects.filter(order=order))
		self.assertEqual(len(items), 1)
		self.assertEqual(items[0].variant_id, self.variant_a.id)
		self.assertEqual(items[0].quantity, 7)

	def test_update_order_variant_replacement_reconciles_both_stocks(self):
		order = self._create_pending_order(self.variant_a.id, 3)

		self.variant_a.refresh_from_db()
		self.variant_b.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 7)
		self.assertEqual(self.variant_b.stock, 6)

		update_order_before_confirm(
			order.order_id,
			{
				"items": [
					{"variant_id": self.variant_b.id, "quantity": 4},
				]
			},
		)

		self.variant_a.refresh_from_db()
		self.variant_b.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 10)
		self.assertEqual(self.variant_b.stock, 2)

		updated_item = OrderItem.objects.get(order=order)
		self.assertEqual(updated_item.variant_id, self.variant_b.id)
		self.assertEqual(updated_item.quantity, 4)

	def test_update_order_insufficient_stock_rolls_back_to_previous_state(self):
		order = self._create_pending_order(self.variant_a.id, 2)

		self.variant_a.refresh_from_db()
		self.variant_b.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 8)
		self.assertEqual(self.variant_b.stock, 6)

		with self.assertRaises(ValidationError):
			update_order_before_confirm(
				order.order_id,
				{
					"items": [
						{"variant_id": self.variant_a.id, "quantity": 11},
					]
				},
			)

		self.variant_a.refresh_from_db()
		self.variant_b.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 8)
		self.assertEqual(self.variant_b.stock, 6)

		original_item = OrderItem.objects.get(order=order)
		self.assertEqual(original_item.variant_id, self.variant_a.id)
		self.assertEqual(original_item.quantity, 2)

	def test_cancel_order_restores_stock_for_reserved_items(self):
		order = self._create_pending_order(self.variant_a.id, 4)
		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 6)

		confirm_order(order.order_id)
		cancel_order(order.order_id)

		order.refresh_from_db()
		self.variant_a.refresh_from_db()
		self.assertEqual(order.status, "cancelled")
		self.assertEqual(self.variant_a.stock, 10)

	def test_cancel_order_cannot_be_applied_twice(self):
		order = self._create_pending_order(self.variant_a.id, 3)
		confirm_order(order.order_id)

		cancel_order(order.order_id)
		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 10)

		with self.assertRaises(ValidationError):
			cancel_order(order.order_id)

		self.variant_a.refresh_from_db()
		self.assertEqual(self.variant_a.stock, 10)

	def test_can_cancel_pending_order(self):
		order = self._create_pending_order(self.variant_a.id, 2)

		cancel_order(order.order_id)

		order.refresh_from_db()
		self.variant_a.refresh_from_db()
		self.assertEqual(order.status, "cancelled")
		self.assertEqual(self.variant_a.stock, 10)

	def test_confirm_order_only_from_pending(self):
		order = self._create_pending_order(self.variant_a.id, 1)

		confirm_order(order.order_id)
		order.refresh_from_db()
		self.assertEqual(order.status, "confirmed")

		with self.assertRaises(ValidationError):
			confirm_order(order.order_id)

	def test_edit_is_blocked_after_confirm(self):
		order = self._create_pending_order(self.variant_a.id, 2)
		confirm_order(order.order_id)

		with self.assertRaises(ValidationError):
			update_order_before_confirm(
				order.order_id,
				{"items": [{"variant_id": self.variant_a.id, "quantity": 3}]},
			)

	def test_complete_order_only_from_confirmed(self):
		pending_order = self._create_pending_order(self.variant_a.id, 1)

		with self.assertRaises(ValidationError):
			complete_order(pending_order.order_id)

		confirm_order(pending_order.order_id)
		complete_order(pending_order.order_id)

		pending_order.refresh_from_db()
		self.assertEqual(pending_order.status, "completed")
		self.assertTrue(pending_order.is_paid)

		with self.assertRaises(ValidationError):
			complete_order(pending_order.order_id)

	def test_create_order_with_percentage_coupon_applies_discount(self):
		coupon = self._create_coupon("SAVE10", discount_type="percentage", value="10.00")

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 2}],
				"coupon_code": coupon.code,
			}
		)

		order.refresh_from_db()
		self.assertEqual(order.total_amount_before_discount, Decimal("1400.00"))
		self.assertEqual(order.coupon_code, "SAVE10")
		self.assertEqual(order.coupon_discount_amount, Decimal("140.00"))
		self.assertEqual(order.total_amount, Decimal("1320.00"))

	def test_phone_specific_coupon_respects_usage_limit(self):
		coupon = self._create_coupon("VIP100", discount_type="fixed", value="100.00", scope="specific")
		CouponPhoneUsage.objects.create(
			coupon=coupon,
			holder_name="VIP User",
			phone_number="01700000000",
			usable_count=1,
		)

		create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 1}],
				"coupon_code": "VIP100",
			}
		)

		with self.assertRaises(ValidationError):
			create_order(
				{
					"customer_name": "John Doe",
					"customer_phone": "01700000000",
					"address": "Dhaka",
					"items": [{"variant_id": self.variant_a.id, "quantity": 1}],
					"coupon_code": "VIP100",
				}
			)

		usage = CouponPhoneUsage.objects.get(coupon=coupon, phone_number="01700000000")
		self.assertEqual(usage.used_count, 1)

	def test_cancel_order_rolls_back_phone_coupon_usage(self):
		coupon = self._create_coupon("PHONE50", discount_type="fixed", value="50.00", scope="specific")
		CouponPhoneUsage.objects.create(
			coupon=coupon,
			holder_name="Special User",
			phone_number="01700000000",
			usable_count=1,
		)

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 1}],
				"coupon_code": "PHONE50",
			}
		)

		usage = CouponPhoneUsage.objects.get(coupon=coupon, phone_number="01700000000")
		self.assertEqual(usage.used_count, 1)

		cancel_order(order.order_id)

		usage.refresh_from_db()
		self.assertEqual(usage.used_count, 0)

	def test_update_order_recalculates_percentage_coupon_discount(self):
		coupon = self._create_coupon("P10", discount_type="percentage", value="10.00")
		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 2}],
				"coupon_code": coupon.code,
			}
		)

		self.assertEqual(order.total_amount_before_discount, Decimal("1400.00"))
		self.assertEqual(order.coupon_discount_amount, Decimal("140.00"))
		self.assertEqual(order.total_amount, Decimal("1320.00"))

		update_order_before_confirm(
			order.order_id,
			{"items": [{"variant_id": self.variant_a.id, "quantity": 1}]},
		)

		order.refresh_from_db()
		self.assertEqual(order.total_amount_before_discount, Decimal("700.00"))
		self.assertEqual(order.coupon_discount_amount, Decimal("70.00"))
		self.assertEqual(order.total_amount, Decimal("690.00"))

	def test_update_order_with_phone_coupon_does_not_consume_extra_usage(self):
		coupon = self._create_coupon("VIP10", discount_type="percentage", value="10.00", scope="specific")
		CouponPhoneUsage.objects.create(
			coupon=coupon,
			holder_name="Named Holder",
			phone_number="01700000000",
			usable_count=1,
		)

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 1}],
				"coupon_code": "VIP10",
			}
		)

		update_order_before_confirm(
			order.order_id,
			{"items": [{"variant_id": self.variant_b.id, "quantity": 1}]},
		)

		usage = CouponPhoneUsage.objects.get(coupon=coupon, phone_number="01700000000")
		self.assertEqual(usage.used_count, 1)

	def test_global_coupon_available_for_any_phone(self):
		coupon = self._create_coupon("GLOBAL20", discount_type="fixed", value="20.00", scope="global")

		order = create_order(
			{
				"customer_name": "Jane Doe",
				"customer_phone": "01811111111",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant_a.id, "quantity": 1}],
				"coupon_code": coupon.code,
			}
		)

		order.refresh_from_db()
		self.assertEqual(order.coupon_code, "GLOBAL20")
		self.assertEqual(order.coupon_discount_amount, Decimal("20.00"))


class DeliveryChargesAndTaxTests(TestCase):
	"""Test delivery charges, VAT, and tax calculations."""

	def setUp(self):
		self.category = Category.objects.create(name="Electronics", slug="electronics")
		self.product_type = ProductType.objects.create(name="Phone")

		self.product = Product.objects.create(
			name="Test Phone",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="500.00",
			selling_price="1000.00",
		)

		self.variant = ProductVariant.objects.create(
			product=self.product,
			sku="SKU-TEST",
			stock=100,
			combination_hash="hash-test",
		)

		# Set default delivery settings
		self.settings = DeliverySettings.get_settings()
		self.settings.inside_dhaka_charge = Decimal("60.00")
		self.settings.outside_dhaka_charge = Decimal("120.00")
		self.settings.vat_percentage = None
		self.settings.tax_percentage = None
		self.settings.save()

	def test_delivery_charge_applied_for_inside_dhaka(self):
		"""Test that delivery charge is correctly applied for inside Dhaka."""
		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		order.refresh_from_db()
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.total_amount, Decimal("1060.00"))

	def test_delivery_charge_applied_for_outside_dhaka(self):
		"""Test that higher delivery charge is applied for outside Dhaka."""
		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Chittagong",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": False,
			}
		)

		order.refresh_from_db()
		self.assertEqual(order.delivery_charge, Decimal("120.00"))
		self.assertEqual(order.total_amount, Decimal("1120.00"))

	def test_vat_applied_when_configured(self):
		"""Test VAT calculation when configured."""
		self.settings.vat_percentage = Decimal("5.00")
		self.settings.save()

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		order.refresh_from_db()
		# Products: 1000
		# VAT: 1000 * 5% = 50
		# Delivery: 60
		# Total: 1000 + 50 + 60 = 1110
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.vat_amount, Decimal("50.00"))
		self.assertEqual(order.total_amount, Decimal("1110.00"))

	def test_tax_applied_when_configured(self):
		"""Test tax calculation when configured."""
		self.settings.tax_percentage = Decimal("10.00")
		self.settings.save()

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		order.refresh_from_db()
		# Products: 1000
		# Tax: 1000 * 10% = 100
		# Delivery: 60
		# Total: 1000 + 100 + 60 = 1160
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.tax_amount, Decimal("100.00"))
		self.assertEqual(order.total_amount, Decimal("1160.00"))

	def test_vat_and_tax_both_applied(self):
		"""Test that both VAT and tax are applied correctly."""
		self.settings.vat_percentage = Decimal("5.00")
		self.settings.tax_percentage = Decimal("10.00")
		self.settings.save()

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		order.refresh_from_db()
		# Products: 1000
		# VAT: 1000 * 5% = 50
		# Tax: 1000 * 10% = 100
		# Delivery: 60
		# Total: 1000 + 50 + 100 + 60 = 1210
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.vat_amount, Decimal("50.00"))
		self.assertEqual(order.tax_amount, Decimal("100.00"))
		self.assertEqual(order.total_amount, Decimal("1210.00"))

	def test_charges_applied_after_coupon_discount(self):
		"""Test that delivery charges and tax are applied after coupon discount."""
		coupon = Coupon.objects.create(
			code="SAVE100",
			discount_type="fixed",
			scope="global",
			value=Decimal("100.00"),
			is_active=True,
			start_date=timezone.now() - timedelta(days=1),
			end_date=timezone.now() + timedelta(days=1),
		)

		self.settings.vat_percentage = Decimal("5.00")
		self.settings.save()

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"coupon_code": "SAVE100",
				"is_inside_dhaka": True,
			}
		)

		order.refresh_from_db()
		# Product price: 1000
		# After coupon: 1000 - 100 = 900
		# VAT: 1000 * 5% = 50
		# Delivery: 60
		# Total: 900 + 50 + 60 = 1010
		self.assertEqual(order.total_amount_before_discount, Decimal("1000.00"))
		self.assertEqual(order.coupon_discount_amount, Decimal("100.00"))
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.vat_amount, Decimal("50.00"))
		self.assertEqual(order.total_amount, Decimal("1010.00"))

	def test_delivery_settings_update_affects_new_orders(self):
		"""Test that updating delivery settings affects new orders."""
		order1 = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		self.assertEqual(order1.delivery_charge, Decimal("60.00"))

		# Update delivery charge
		self.settings.inside_dhaka_charge = Decimal("100.00")
		self.settings.save()

		order2 = create_order(
			{
				"customer_name": "Jane Doe",
				"customer_phone": "01811111111",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		self.assertEqual(order2.delivery_charge, Decimal("100.00"))

	def test_update_order_recalculates_charges(self):
		"""Test that updating order items recalculates delivery charges and tax."""
		self.settings.vat_percentage = Decimal("5.00")
		self.settings.save()

		order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"address": "Dhaka",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
				"is_inside_dhaka": True,
			}
		)

		# Initial: 1000 + 50 + 60 = 1110
		self.assertEqual(order.total_amount, Decimal("1110.00"))

		update_order_before_confirm(
			order.order_id,
			{"items": [{"variant_id": self.variant.id, "quantity": 2}]},
		)

		order.refresh_from_db()
		# Updated products: 2000
		# VAT: 2000 * 5% = 100
		# Delivery: 60
		# Total: 2000 + 100 + 60 = 2160
		self.assertEqual(order.total_amount_before_discount, Decimal("2000.00"))
		self.assertEqual(order.delivery_charge, Decimal("60.00"))
		self.assertEqual(order.vat_amount, Decimal("100.00"))
		self.assertEqual(order.total_amount, Decimal("2160.00"))


class OrderCreateValidationTests(TestCase):
	def test_create_order_serializer_requires_address_fields(self):
		serializer = OrderCreateSerializer(
			data={
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
			}
		)

		self.assertFalse(serializer.is_valid())
		self.assertEqual(serializer.errors["division"][0], "division is required.")
		self.assertEqual(serializer.errors["city"][0], "city is required.")
		self.assertEqual(serializer.errors["detailed_address"][0], "detailed_address is required.")
		self.assertEqual(serializer.errors["items"][0], "items is required.")


class OrderPriceCalculatorAPITests(TestCase):
	def setUp(self):
		self.factory = APIRequestFactory()
		self.view = PriceCalculatorAPIView.as_view()
		self.category = Category.objects.create(name="Electronics", slug="electronics-calc")
		self.product_type = ProductType.objects.create(name="Phone")

		self.product = Product.objects.create(
			name="Calculator Phone",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="500.00",
			selling_price="1000.00",
		)

		self.variant = ProductVariant.objects.create(
			product=self.product,
			sku="SKU-CALC",
			stock=10,
			combination_hash="hash-calc",
		)

		self.settings = DeliverySettings.get_settings()
		self.settings.inside_dhaka_charge = Decimal("60.00")
		self.settings.outside_dhaka_charge = Decimal("120.00")
		self.settings.vat_percentage = Decimal("5.00")
		self.settings.tax_percentage = Decimal("10.00")
		self.settings.save()

		self.coupon = Coupon.objects.create(
			code="CALC100",
			discount_type="fixed",
			scope="specific",
			value=Decimal("100.00"),
			is_active=True,
			start_date=timezone.now() - timedelta(days=1),
			end_date=timezone.now() + timedelta(days=1),
		)
		CouponPhoneUsage.objects.create(
			coupon=self.coupon,
			holder_name="Calc User",
			phone_number="01700000000",
			usable_count=2,
		)

	def test_price_calculator_returns_expected_totals_without_creating_order(self):
		payload = {
			"customer_name": "John Doe",
			"customer_phone": "01700000000",
			"division": "Dhaka",
			"city": "Dhaka",
			"detailed_address": "House 1, Road 2",
			"is_inside_dhaka": True,
			"items": [{"variant_id": self.variant.id, "quantity": 1}],
			"coupon_code": "CALC100",
		}

		request = self.factory.post("/api/order/price-calculator/", payload, format="json")
		response = self.view(request)

		self.assertEqual(response.status_code, 200)
		calc = response.data["calculation"]
		self.assertEqual(Decimal(str(calc["total_amount_before_discount"])), Decimal("1000.00"))
		self.assertEqual(Decimal(str(calc["discounted_subtotal"])), Decimal("900.00"))
		self.assertEqual(Decimal(str(calc["coupon_discount_amount"])), Decimal("100.00"))
		self.assertEqual(Decimal(str(calc["vat_amount"])), Decimal("50.00"))
		self.assertEqual(Decimal(str(calc["tax_amount"])), Decimal("100.00"))
		self.assertEqual(Decimal(str(calc["delivery_charge"])), Decimal("60.00"))
		self.assertEqual(Decimal(str(calc["total_amount"])), Decimal("1110.00"))

		self.assertEqual(Order.objects.count(), 0)
		self.variant.refresh_from_db()
		self.assertEqual(self.variant.stock, 10)

		usage = CouponPhoneUsage.objects.get(coupon=self.coupon, phone_number="01700000000")
		self.assertEqual(usage.used_count, 0)

	def test_price_calculator_returns_field_errors_for_missing_required_fields(self):
		request = self.factory.post(
			"/api/order/price-calculator/",
			{"customer_name": "John Doe"},
			format="json",
		)
		response = self.view(request)

		self.assertEqual(response.status_code, 400)
		error = response.data["error"]
		self.assertIn("customer_phone", error)
		self.assertIn("division", error)
		self.assertIn("city", error)
		self.assertIn("detailed_address", error)
		self.assertIn("items", error)


class OrderItemAttributeValuesTests(TestCase):
	def setUp(self):
		category = Category.objects.create(name="Fashion", slug="fashion")
		product_type = ProductType.objects.create(name="Shirt")
		product = Product.objects.create(
			name="Cotton Shirt",
			description="",
			category=category,
			product_type=product_type,
			buying_price="300.00",
			selling_price="500.00",
		)

		self.variant = ProductVariant.objects.create(
			product=product,
			sku="SHIRT-BLUE-L",
			stock=10,
			combination_hash="shirt-blue-l",
		)

		color = Attribute.objects.create(name="Color")
		size = Attribute.objects.create(name="Size")
		blue = AttributeValue.objects.create(attribute=color, value="Blue")
		large = AttributeValue.objects.create(attribute=size, value="L")
		VariantAttributeValue.objects.create(variant=self.variant, attribute_value=blue)
		VariantAttributeValue.objects.create(variant=self.variant, attribute_value=large)

		self.order = create_order(
			{
				"customer_name": "John Doe",
				"customer_phone": "01700000000",
				"division": "Dhaka",
				"city": "Mirpur",
				"detailed_address": "House 1, Road 2",
				"items": [{"variant_id": self.variant.id, "quantity": 1}],
			}
		)

	def test_order_detail_serializer_includes_attribute_values(self):
		data = OrderDetailSerializer(self.order).data
		item = data["items"][0]
		self.assertIn("attribute_values", item)
		self.assertEqual(Decimal(str(item["actual_selling_price"])), Decimal("500.00"))
		self.assertEqual(
			item["attribute_values"],
			[
				{"attribute": "Color", "value": "Blue"},
				{"attribute": "Size", "value": "L"},
			],
		)

	def test_public_statement_serializer_includes_attribute_values(self):
		data = OrderPublicStatementSerializer(self.order).data
		item = data["items"][0]
		self.assertIn("attribute_values", item)
		self.assertEqual(
			item["attribute_values"],
			[
				{"attribute": "Color", "value": "Blue"},
				{"attribute": "Size", "value": "L"},
			],
		)
