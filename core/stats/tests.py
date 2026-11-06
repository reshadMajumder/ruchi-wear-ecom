import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from order.models import Order, OrderItem
from products.models import Category, Product, ProductType, ProductVariant


User = get_user_model()


class StatsAPITests(APITestCase):
	def setUp(self):
		self.category = Category.objects.create(name="Stats Category", slug="stats-category")
		self.product_type = ProductType.objects.create(name="Stats Type")
		self.product = Product.objects.create(
			name="Stats Product",
			slug="stats-product",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="150.00",
			is_active=True,
		)
		self.variant = ProductVariant.objects.create(
			product=self.product,
			sku="STATS-SKU",
			stock=20,
			combination_hash="stats-hash",
		)

		self.order = Order.objects.create(
			order_id=uuid.uuid4(),
			customer_name="Test Customer",
			customer_phone="01700000000",
			address="Dhaka",
			status="completed",
			total_amount=Decimal("280.00"),
			total_amount_before_discount=Decimal("300.00"),
			coupon_code="SAVE20",
			coupon_discount_amount=Decimal("20.00"),
		)
		OrderItem.objects.create(
			order=self.order,
			product=self.product,
			variant=self.variant,
			quantity=2,
			price_at_purchase=Decimal("140.00"),
			actual_selling_price=Decimal("150.00"),
			product_name=self.product.name,
		)

	def test_public_sales_stats_endpoint_is_not_available(self):
		response = self.client.get("/api/stats/public/sales/?period=monthly")
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

	def test_admin_dashboard_stats_requires_admin(self):
		response = self.client.get("/api/stats/admin/dashboard/")
		self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

		admin = User.objects.create_superuser(
			username="adminstats",
			email="admin@example.com",
			password="strong-pass-123",
		)
		self.client.force_authenticate(user=admin)

		response = self.client.get("/api/stats/admin/dashboard/?period=monthly")
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("daily", response.data)
		self.assertIn("monthly", response.data)
		self.assertIn("yearly", response.data)
		self.assertIn("stock", response.data)
