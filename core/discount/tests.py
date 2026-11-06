from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product, ProductType, ProductVariant

from .models import CategoryDiscount, Discount, ProductDiscount
from .cache import build_cache_key
from .services import get_price_data


User = get_user_model()


class DiscountCategoryScopeTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(
			username="discountadmin",
			email="discountadmin@example.com",
			password="strong-pass-123",
		)
		self.client.force_authenticate(user=self.admin)

		self.category = Category.objects.create(name="Shirts", slug="shirts")
		self.other_category = Category.objects.create(name="Pants", slug="pants")
		self.product_type = ProductType.objects.create(name="Clothing")
		self.product = Product.objects.create(
			name="Blue Shirt",
			slug="blue-shirt",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="500.00",
			selling_price="1000.00",
			is_active=True,
		)
		self.other_product = Product.objects.create(
			name="Black Pant",
			slug="black-pant",
			description="",
			category=self.other_category,
			product_type=self.product_type,
			buying_price="600.00",
			selling_price="1200.00",
			is_active=True,
		)
		self.inactive_product = Product.objects.create(
			name="Inactive Product",
			slug="inactive-product",
			description="",
			category=self.other_category,
			product_type=self.product_type,
			buying_price="300.00",
			selling_price="700.00",
			is_active=False,
		)

		self.now = timezone.now()

	def _create_discount(self, name, scope, value):
		return Discount.objects.create(
			name=name,
			discount_type="percentage",
			value=value,
			scope=scope,
			is_active=True,
			start_date=self.now - timezone.timedelta(days=1),
			end_date=self.now + timezone.timedelta(days=1),
			priority=10,
		)

	def _discount_payload(self, name, scope, value):
		return {
			"name": name,
			"discount_type": "percentage",
			"value": value,
			"scope": scope,
			"is_active": True,
			"start_date": (self.now - timezone.timedelta(days=1)).isoformat(),
			"end_date": (self.now + timezone.timedelta(days=1)).isoformat(),
			"priority": 10,
			"make_card": True,
		}

	def test_assign_category_scope_discount_successfully(self):
		discount = self._create_discount("Category Promo", "category", 15)

		response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": discount.id,
				"category_id": self.category.id,
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["message"], "Discount assigned successfully")
		self.assertEqual(response.data["data"]["category_id"], self.category.id)
		self.assertTrue(CategoryDiscount.objects.filter(category=self.category, discount=discount).exists())

	def test_latest_product_discount_replaces_old_one(self):
		first_discount = self._create_discount("First Product Promo", "product", 10)
		second_discount = self._create_discount("Second Product Promo", "product", 20)

		first_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": first_discount.id,
				"product_id": self.product.id,
			},
			format="json",
		)
		self.assertEqual(first_response.status_code, status.HTTP_200_OK)

		second_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": second_discount.id,
				"product_id": self.product.id,
			},
			format="json",
		)
		self.assertEqual(second_response.status_code, status.HTTP_200_OK)
		self.assertIn("replaced_discount", second_response.data)
		self.assertEqual(second_response.data["data"]["discount_id"], second_discount.id)
		self.assertFalse(ProductDiscount.objects.filter(product=self.product, discount=first_discount).exists())
		self.assertTrue(ProductDiscount.objects.filter(product=self.product, discount=second_discount).exists())

	def test_latest_category_discount_replaces_old_one(self):
		first_discount = self._create_discount("First Category Promo", "category", 10)
		second_discount = self._create_discount("Second Category Promo", "category", 20)

		first_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": first_discount.id,
				"category_id": self.category.id,
			},
			format="json",
		)
		self.assertEqual(first_response.status_code, status.HTTP_200_OK)

		second_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": second_discount.id,
				"category_id": self.category.id,
			},
			format="json",
		)
		self.assertEqual(second_response.status_code, status.HTTP_200_OK)
		self.assertIn("replaced_discount", second_response.data)
		self.assertEqual(second_response.data["data"]["discount_id"], second_discount.id)
		self.assertFalse(CategoryDiscount.objects.filter(category=self.category, discount=first_discount).exists())
		self.assertTrue(CategoryDiscount.objects.filter(category=self.category, discount=second_discount).exists())

	def test_price_data_uses_product_then_category_then_global(self):
		global_discount = self._create_discount("Global Promo", "global", 5)
		category_discount = self._create_discount("Category Promo", "category", 10)
		product_discount = self._create_discount("Product Promo", "product", 20)

		CategoryDiscount.objects.create(category=self.category, discount=category_discount)

		# Category discount beats global when no product discount exists.
		category_price_data = get_price_data(self.product)
		self.assertEqual(Decimal(category_price_data["final_price"]), Decimal("900.00"))

		ProductDiscount.objects.create(product=self.product, discount=product_discount)

		# Product discount beats category/global.
		product_price_data = get_price_data(self.product)
		self.assertEqual(Decimal(product_price_data["final_price"]), Decimal("800.00"))

		# Ensure global is still available but lower-priority for this product.
		self.assertEqual(global_discount.scope, "global")

	def test_newest_discount_wins_within_same_scope(self):
		old_discount = self._create_discount("Old Product Promo", "product", 10)
		new_discount = self._create_discount("New Product Promo", "product", 25)
		old_discount.priority = 100
		old_discount.save(update_fields=["priority"])
		new_discount.priority = 1
		new_discount.save(update_fields=["priority"])

		old_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": old_discount.id,
				"product_id": self.product.id,
			},
			format="json",
		)
		self.assertEqual(old_response.status_code, status.HTTP_200_OK)

		new_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": new_discount.id,
				"product_id": self.product.id,
			},
			format="json",
		)
		self.assertEqual(new_response.status_code, status.HTTP_200_OK)

		price_data = get_price_data(self.product)
		self.assertEqual(Decimal(price_data["discount_percent"]), Decimal("25.00"))
		self.assertEqual(Decimal(price_data["final_price"]), Decimal("750.00"))

	def test_admin_can_create_global_product_and_category_discounts(self):
		for scope in ["global", "product", "category"]:
			response = self.client.post(
				"/api/discount/admin/create/",
				self._discount_payload(f"{scope.title()} Promo", scope, 10),
				format="json",
			)

			self.assertEqual(response.status_code, status.HTTP_200_OK)
			self.assertEqual(response.data["message"], "Discount created successfully")
			self.assertEqual(response.data["data"]["scope"], scope)

	def test_discount_products_endpoint_returns_products_per_scope(self):
		product_scope_discount = self._create_discount("Product Promo", "product", 20)
		category_scope_discount = self._create_discount("Category Promo", "category", 15)
		global_scope_discount = self._create_discount("Global Promo", "global", 5)

		ProductDiscount.objects.create(product=self.product, discount=product_scope_discount)
		CategoryDiscount.objects.create(category=self.other_category, discount=category_scope_discount)

		product_response = self.client.get(
			f"/api/discount/cards/{product_scope_discount.id}/products/"
		)
		self.assertEqual(product_response.status_code, status.HTTP_200_OK)
		product_ids = {item["id"] for item in product_response.data["products"]}
		self.assertEqual(product_ids, {self.product.id})

		category_response = self.client.get(
			f"/api/discount/cards/{category_scope_discount.id}/products/"
		)
		self.assertEqual(category_response.status_code, status.HTTP_200_OK)
		category_ids = {item["id"] for item in category_response.data["products"]}
		self.assertEqual(category_ids, {self.other_product.id})

		global_response = self.client.get(
			f"/api/discount/cards/{global_scope_discount.id}/products/"
		)
		self.assertEqual(global_response.status_code, status.HTTP_200_OK)
		global_ids = {item["id"] for item in global_response.data["products"]}
		self.assertEqual(global_ids, {self.product.id, self.other_product.id})
		self.assertNotIn(self.inactive_product.id, global_ids)

	def test_discount_products_endpoint_applies_requested_discount_in_price_data(self):
		high_priority_global = self._create_discount("Global High", "global", 30)
		high_priority_global.priority = 50
		high_priority_global.save(update_fields=["priority"])

		requested_global = self._create_discount("Global Requested", "global", 10)
		requested_global.priority = 5
		requested_global.save(update_fields=["priority"])

		response = self.client.get(
			f"/api/discount/cards/{requested_global.id}/products/"
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(len(response.data["products"]), 1)

		first_product = response.data["products"][0]
		price_data = first_product["price_data"]

		# Product selling prices are 1000 and 1200 in setup;
		# with requested 10% global discount, final prices should be 900 or 1080.
		self.assertIn(Decimal(price_data["final_price"]), {Decimal("900.00"), Decimal("1080.00")})
		self.assertEqual(Decimal(price_data["discount_percent"]), Decimal("10.00"))
		self.assertTrue(price_data["is_discounted"])

	def test_category_discount_is_applied_in_products_category_listing(self):
		category_discount = self._create_discount("Category List Promo", "category", 15)
		ProductVariant.objects.create(
			product=self.product,
			sku=f"CAT-LIST-SKU-{self.product.id}",
			stock=10,
			combination_hash=f"cat-list-hash-{self.product.id}",
		)

		assign_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": category_discount.id,
				"category_id": self.category.id,
			},
			format="json",
		)
		self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

		public_client = self.client_class()
		response = public_client.get(f"/api/products/?category={self.category.slug}&sort=new")
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		results = response.data.get("results", [])
		self.assertGreaterEqual(len(results), 1)

		matching_products = [p for p in results if p.get("id") == self.product.id]
		self.assertEqual(len(matching_products), 1)

		price_data = matching_products[0]["price_data"]
		self.assertTrue(price_data["is_discounted"])
		self.assertEqual(Decimal(price_data["discount_percent"]), Decimal("15.00"))
		self.assertEqual(Decimal(price_data["final_price"]), Decimal("850.00"))

	def test_category_discount_is_applied_in_products_unfiltered_listing(self):
		category_discount = self._create_discount("Category Unfiltered Promo", "category", 12)
		ProductVariant.objects.create(
			product=self.product,
			sku=f"CAT-ALL-SKU-{self.product.id}",
			stock=8,
			combination_hash=f"cat-all-hash-{self.product.id}",
		)

		assign_response = self.client.post(
			"/api/discount/admin/assign/",
			{
				"discount_id": category_discount.id,
				"category_id": self.category.id,
			},
			format="json",
		)
		self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

		public_client = self.client_class()
		response = public_client.get("/api/products/")
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		results = response.data.get("results", [])
		self.assertGreaterEqual(len(results), 1)

		matching_products = [p for p in results if p.get("id") == self.product.id]
		self.assertEqual(len(matching_products), 1)

		price_data = matching_products[0]["price_data"]
		self.assertTrue(price_data["is_discounted"])
		self.assertEqual(Decimal(price_data["discount_percent"]), Decimal("12.00"))
		self.assertEqual(Decimal(price_data["final_price"]), Decimal("880.00"))


class DiscountRedisCacheTests(APITestCase):
	def setUp(self):
		cache.clear()
		self.now = timezone.now()
		self.category = Category.objects.create(name="Cached Category", slug="cached-category")
		self.product_type = ProductType.objects.create(name="Cached Type")
		self.product = Product.objects.create(
			name="Cached Product",
			slug="cached-product",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="200.00",
			is_active=True,
		)
		ProductVariant.objects.create(
			product=self.product,
			sku="CACHED-SKU-1",
			stock=5,
			combination_hash="cached-hash-1",
		)

	def _create_discount(self, name, scope, value, make_card=False):
		return Discount.objects.create(
			name=name,
			discount_type="percentage",
			value=value,
			scope=scope,
			is_active=True,
			start_date=self.now - timezone.timedelta(days=1),
			end_date=self.now + timezone.timedelta(days=1),
			priority=10,
			make_card=make_card,
		)

	def test_discount_cards_endpoint_uses_cache_and_invalidates_on_discount_change(self):
		card_discount = self._create_discount("Card Discount", "global", 10, make_card=True)
		cache_key = build_cache_key("discount_cards")

		first_response = self.client.get("/api/discount/cards/")
		self.assertEqual(first_response.status_code, status.HTTP_200_OK)
		self.assertIsNotNone(cache.get(cache_key))

		second_response = self.client.get("/api/discount/cards/")
		self.assertEqual(second_response.data, first_response.data)

		card_discount.priority = 99
		card_discount.save(update_fields=["priority"])

		self.assertIsNone(cache.get(cache_key))

	def test_discount_products_endpoint_uses_cache_and_invalidates_on_assignment_change(self):
		discount = self._create_discount("Product Discount", "product", 15)
		ProductDiscount.objects.create(product=self.product, discount=discount)
		cache_key = build_cache_key("discount_products", path_params={"discount_id": discount.id})

		first_response = self.client.get(f"/api/discount/cards/{discount.id}/products/")
		self.assertEqual(first_response.status_code, status.HTTP_200_OK)
		self.assertIsNotNone(cache.get(cache_key))
		self.assertEqual(first_response.data["discount"]["id"], discount.id)

		second_response = self.client.get(f"/api/discount/cards/{discount.id}/products/")
		self.assertEqual(second_response.data, first_response.data)

		ProductDiscount.objects.create(
			product=Product.objects.create(
				name="Cached Product 2",
				slug="cached-product-2",
				description="",
				category=self.category,
				product_type=self.product_type,
				buying_price="120.00",
				selling_price="240.00",
				is_active=True,
			),
			discount=discount,
		)

		self.assertIsNone(cache.get(cache_key))

	def test_discount_products_cache_is_invalidated_when_product_changes(self):
		discount = self._create_discount("Product Discount Product Change", "product", 12)
		ProductDiscount.objects.create(product=self.product, discount=discount)
		cache_key = build_cache_key("discount_products", path_params={"discount_id": discount.id})

		first_response = self.client.get(f"/api/discount/cards/{discount.id}/products/")
		self.assertEqual(first_response.status_code, status.HTTP_200_OK)
		self.assertIsNotNone(cache.get(cache_key))

		self.product.name = "Cached Product Renamed"
		self.product.save()

		self.assertIsNone(cache.get(cache_key))

