from datetime import timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from discount.models import Discount, ProductDiscount
from products.models import (
	Attribute,
	AttributeValue,
	Category,
	Product,
	ProductImage,
	ProductTag,
	Section,
	SectionProduct,
	ProductType,
	ProductTypeAttribute,
	ProductVariant,
	VariantAttributeValue,
)
from products.services.product_service import create_product_with_variants
from products.cache import build_cache_key


User = get_user_model()


class ProductListFilteringAndSortingTests(TestCase):
	def setUp(self):
		self.url = reverse("products-list")

		self.category_phone = Category.objects.create(name="Phone", slug="phone")
		self.subcategory_android = Category.objects.create(name="Android", slug="android", parent=self.category_phone)
		self.subcategory_ios = Category.objects.create(name="iPhone", slug="iphone", parent=self.category_phone)
		self.category_laptop = Category.objects.create(name="Laptop", slug="laptop")
		self.product_type = ProductType.objects.create(name="Device")

		self.product_a = self._create_product(
			name="Alpha",
			category=self.category_phone,
			subcategory=self.subcategory_android,
			selling_price="1000.00",
			sku="SKU-A",
		)
		self.product_b = self._create_product(
			name="Beta",
			category=self.category_laptop,
			selling_price="2000.00",
			sku="SKU-B",
		)
		self.product_c = self._create_product(
			name="Gamma",
			category=self.category_phone,
			subcategory=self.subcategory_ios,
			selling_price="1500.00",
			sku="SKU-C",
		)

	def _create_product(self, name, category, selling_price, sku, subcategory=None):
		product = Product.objects.create(
			name=name,
			slug=name.lower(),
			description="",
			category=category,
			subcategory=subcategory,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price=selling_price,
			is_active=True,
		)
		ProductVariant.objects.create(
			product=product,
			sku=sku,
			stock=5,
			combination_hash=f"hash-{sku}",
		)
		return product

	def test_sort_by_price_low_to_high(self):
		response = self.client.get(self.url, {"sort": "price_low_to_high"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_a.id, self.product_c.id, self.product_b.id])

	def test_sort_by_price_high_to_low(self):
		response = self.client.get(self.url, {"sort": "price_high_to_low"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_b.id, self.product_c.id, self.product_a.id])

	def test_sort_by_newest(self):
		now = timezone.now()
		Product.objects.filter(id=self.product_a.id).update(created_at=now - timedelta(days=3))
		Product.objects.filter(id=self.product_b.id).update(created_at=now - timedelta(days=2))
		Product.objects.filter(id=self.product_c.id).update(created_at=now - timedelta(days=1))

		response = self.client.get(self.url, {"sort": "newest"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_c.id, self.product_b.id, self.product_a.id])

	def test_filter_by_category_slug(self):
		response = self.client.get(self.url, {"category": "phone"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_a.id, self.product_c.id])

	def test_filter_by_subcategory_slug(self):
		response = self.client.get(self.url, {"subcategory": "android"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_a.id])

	def test_filter_discounted_only(self):
		now = timezone.now()
		discount = Discount.objects.create(
			name="Discount A",
			discount_type="percentage",
			value="10.00",
			scope="product",
			is_active=True,
			start_date=now - timedelta(days=1),
			end_date=now + timedelta(days=1),
			priority=1,
		)
		ProductDiscount.objects.create(product=self.product_b, discount=discount)

		response = self.client.get(self.url, {"discounted_only": "true"})
		self.assertEqual(response.status_code, 200)

		result_ids = [item["id"] for item in response.data.get("results", [])]
		self.assertEqual(result_ids, [self.product_b.id])


class ProductVariantValidationTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(name="Fashion", slug="fashion")
		self.product_type = ProductType.objects.create(name="TShirt")

		self.size_attribute = Attribute.objects.create(name="Size")
		self.color_attribute = Attribute.objects.create(name="Color")

		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=self.size_attribute)
		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=self.color_attribute)

		self.size_m = AttributeValue.objects.create(attribute=self.size_attribute, value="M")
		self.size_xl = AttributeValue.objects.create(attribute=self.size_attribute, value="XL")
		self.color_blue = AttributeValue.objects.create(attribute=self.color_attribute, value="Blue")

	def test_rejects_variant_with_multiple_values_for_same_attribute(self):
		payload = {
			"name": "Graphic Tee",
			"description": "",
			"category_id": self.category.id,
			"product_type_id": self.product_type.id,
			"buying_price": "100.00",
			"selling_price": "150.00",
			"variants": [
				{
					"sku": "TEE-MULTI-SIZE",
					"stock": 10,
					"attributes": [self.size_m.id, self.size_xl.id, self.color_blue.id],
				}
			],
		}

		with self.assertRaises(ValidationError):
			create_product_with_variants(payload)


class ProductSectionsListTests(APITestCase):
	def setUp(self):
		self.url = reverse("products-sections-list")
		self.admin = User.objects.create_superuser(
			username="sectionadmin",
			email="sectionadmin@example.com",
			password="strong-pass-123",
		)

		self.category = Category.objects.create(name="Sections Cat", slug="sections-cat")
		self.product_type = ProductType.objects.create(name="Sections Type")

		self.product_a = Product.objects.create(
			name="Section Product A",
			slug="section-product-a",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="50.00",
			selling_price="100.00",
			is_active=True,
		)
		self.product_b = Product.objects.create(
			name="Section Product B",
			slug="section-product-b",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="75.00",
			selling_price="150.00",
			is_active=True,
		)
		self.product_c = Product.objects.create(
			name="Section Product C",
			slug="section-product-c",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="80.00",
			selling_price="160.00",
			is_active=True,
		)
		self.product_d = Product.objects.create(
			name="Section Product D",
			slug="section-product-d",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="90.00",
			selling_price="180.00",
			is_active=True,
		)
		self.product_e = Product.objects.create(
			name="Section Product E",
			slug="section-product-e",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="95.00",
			selling_price="190.00",
			is_active=True,
		)

		ProductVariant.objects.create(
			product=self.product_a,
			sku="SECTION-SKU-A",
			stock=10,
			combination_hash="section-hash-a",
		)
		ProductVariant.objects.create(
			product=self.product_b,
			sku="SECTION-SKU-B",
			stock=8,
			combination_hash="section-hash-b",
		)
		ProductVariant.objects.create(
			product=self.product_c,
			sku="SECTION-SKU-C",
			stock=8,
			combination_hash="section-hash-c",
		)
		ProductVariant.objects.create(
			product=self.product_d,
			sku="SECTION-SKU-D",
			stock=8,
			combination_hash="section-hash-d",
		)
		ProductVariant.objects.create(
			product=self.product_e,
			sku="SECTION-SKU-E",
			stock=8,
			combination_hash="section-hash-e",
		)

		self.section = Section.objects.create(title="Featured", priority=20)
		SectionProduct.objects.create(section=self.section, product=self.product_a, priority=1)
		SectionProduct.objects.create(section=self.section, product=self.product_b, priority=5)
		SectionProduct.objects.create(section=self.section, product=self.product_c, priority=4)
		SectionProduct.objects.create(section=self.section, product=self.product_d, priority=3)
		SectionProduct.objects.create(section=self.section, product=self.product_e, priority=2)

	def test_sections_list_returns_products(self):
		response = self.client.get(self.url)
		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(response.data[0]["title"], "Featured")

		product_ids = [item["id"] for item in response.data[0]["products"]]
		self.assertEqual(len(product_ids), 4)
		self.assertEqual(product_ids, [self.product_b.id, self.product_c.id, self.product_d.id, self.product_e.id])

	def test_section_detail_returns_all_products(self):
		response = self.client.get(reverse("products-sections-detail", args=[self.section.id]))
		self.assertEqual(response.status_code, 200)
		product_ids = [item["id"] for item in response.data["products"]]
		self.assertEqual(len(product_ids), 5)

	def test_section_products_endpoint_returns_paginated_products(self):
		response = self.client.get(reverse("products-sections-products", args=[self.section.id]))
		self.assertEqual(response.status_code, 200)
		self.assertIn("results", response.data)
		self.assertIn("next", response.data)
		self.assertIn("previous", response.data)

		product_ids = [item["id"] for item in response.data["results"]]
		self.assertEqual(set(product_ids), {
			self.product_a.id,
			self.product_b.id,
			self.product_c.id,
			self.product_d.id,
			self.product_e.id,
		})

	def test_section_products_endpoint_returns_404_for_missing_section(self):
		response = self.client.get(reverse("products-sections-products", args=[999999]))
		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Section not found.")

	def test_admin_can_create_section(self):
		self.client.force_authenticate(user=self.admin)
		response = self.client.post(
			reverse("products-sections-create"),
			{
				"title": "New Section",
				"priority": 10,
				"product_ids": [self.product_a.id, self.product_b.id],
			},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data["section"]["title"], "New Section")

	def test_admin_can_patch_section_add_remove_and_set_products(self):
		self.client.force_authenticate(user=self.admin)
		url = reverse("products-sections-manage", args=[self.section.id])

		add_response = self.client.patch(
			url,
			{"action": "add", "product_ids": [self.product_a.id]},
			format="json",
		)
		self.assertEqual(add_response.status_code, 200)

		remove_response = self.client.patch(
			url,
			{"action": "remove", "product_ids": [self.product_e.id]},
			format="json",
		)
		self.assertEqual(remove_response.status_code, 200)

		set_response = self.client.patch(
			url,
			{"action": "set", "product_ids": [self.product_a.id, self.product_b.id]},
			format="json",
		)
		self.assertEqual(set_response.status_code, 200)
		product_ids = [item["id"] for item in set_response.data["section"]["products"]]
		self.assertEqual(set(product_ids), {self.product_a.id, self.product_b.id})

	def test_admin_can_delete_section(self):
		self.client.force_authenticate(user=self.admin)
		response = self.client.delete(reverse("products-sections-manage", args=[self.section.id]))
		self.assertEqual(response.status_code, 200)
		self.assertFalse(Section.objects.filter(id=self.section.id).exists())


class ProductSlugConflictTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(name="Electronics", slug="electronics")
		self.product_type = ProductType.objects.create(name="Device")

	def test_auto_suffixes_slug_when_product_name_repeats(self):
		first = Product.objects.create(
			name="Same Name",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="50.00",
			selling_price="100.00",
		)
		second = Product.objects.create(
			name="Same Name",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="60.00",
			selling_price="120.00",
		)

		self.assertEqual(first.slug, "same-name")
		self.assertEqual(second.slug, "same-name-2")


class ProductCreateSubcategoryValidationTests(TestCase):
	def setUp(self):
		self.root_category = Category.objects.create(name="Phone", slug="phone")
		self.other_root_category = Category.objects.create(name="Laptop", slug="laptop")
		self.subcategory = Category.objects.create(name="Android", slug="android", parent=self.root_category)
		self.product_type = ProductType.objects.create(name="Mobile")
		self.attribute = Attribute.objects.create(name="Storage")
		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=self.attribute)
		self.attribute_value = AttributeValue.objects.create(attribute=self.attribute, value="128GB")

	def _payload(self, category_id, subcategory_id=None):
		return {
			"name": "Phone X",
			"description": "",
			"category_id": category_id,
			"subcategory_id": subcategory_id,
			"product_type_id": self.product_type.id,
			"buying_price": "100.00",
			"selling_price": "150.00",
			"variants": [
				{
					"sku": "PHONE-X-128",
					"stock": 5,
					"attributes": [self.attribute_value.id],
				}
			],
		}

	def test_create_product_with_category_and_subcategory(self):
		product = create_product_with_variants(
			self._payload(self.root_category.id, self.subcategory.id)
		)
		self.assertEqual(product.category_id, self.root_category.id)
		self.assertEqual(product.subcategory_id, self.subcategory.id)

	def test_rejects_subcategory_not_belonging_to_category(self):
		with self.assertRaises(ValidationError):
			create_product_with_variants(
				self._payload(self.other_root_category.id, self.subcategory.id)
			)


class ProductAdminDetailEndpointTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(
			username="productsadmin",
			email="productsadmin@example.com",
			password="strong-pass-123",
		)
		self.client.force_authenticate(user=self.admin)

		self.root_category = Category.objects.create(name="Phone", slug="phone")
		self.subcategory = Category.objects.create(name="Android", slug="android", parent=self.root_category)
		self.product_type = ProductType.objects.create(name="Mobile")

		self.color = Attribute.objects.create(name="Color")
		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=self.color)
		self.black = AttributeValue.objects.create(attribute=self.color, value="Black")

		self.product = Product.objects.create(
			name="Phone Z",
			description="Admin detail product",
			category=self.root_category,
			subcategory=self.subcategory,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="150.00",
			is_active=True,
		)

		variant = ProductVariant.objects.create(
			product=self.product,
			sku="PHONE-Z-BLACK",
			stock=5,
			combination_hash="hash-phone-z-black",
		)
		VariantAttributeValue.objects.create(variant=variant, attribute_value=self.black)

	def test_admin_product_detail_returns_full_editable_payload(self):
		response = self.client.get(reverse("products-admin-detail", args=[self.product.id]))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["id"], self.product.id)
		self.assertEqual(response.data["category_id"], self.root_category.id)
		self.assertEqual(response.data["subcategory_id"], self.subcategory.id)
		self.assertEqual(response.data["product_type_id"], self.product_type.id)
		self.assertIn("buying_price", response.data)
		self.assertIn("selling_price", response.data)
		self.assertIn("images", response.data)
		self.assertIn("variants", response.data)

		variant_payload = response.data["variants"][0]
		self.assertEqual(variant_payload["sku"], "PHONE-Z-BLACK")
		self.assertEqual(variant_payload["attributes"][0]["attribute_value_id"], self.black.id)

	def test_admin_product_detail_returns_404_for_unknown_product(self):
		response = self.client.get(reverse("products-admin-detail", args=[999999]))
		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Product not found.")


class ProductTagsEndpointTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(
			username="tagadmin",
			email="tagadmin@example.com",
			password="strong-pass-123",
		)
		self.client.force_authenticate(user=self.admin)

		self.category = Category.objects.create(name="Tag Cat", slug="tag-cat")
		self.product_type = ProductType.objects.create(name="Tag Type")
		self.product = Product.objects.create(
			name="Tag Product",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="50.00",
			selling_price="100.00",
		)

		self.tag_one = ProductTag.objects.create(name="Featured", slug="featured")
		self.tag_two = ProductTag.objects.create(name="Trending", slug="trending")
		self.product.tags.set([self.tag_one, self.tag_two])

	def test_get_product_tags_returns_assigned_tags(self):
		response = self.client.get(reverse("products-assign-tags", args=[self.product.id]))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["product_id"], self.product.id)
		tag_slugs = {item["slug"] for item in response.data["tags"]}
		self.assertEqual(tag_slugs, {"featured", "trending"})

	def test_get_product_tags_returns_404_for_unknown_product(self):
		response = self.client.get(reverse("products-assign-tags", args=[999999]))
		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Product not found.")


class ProductCreateUpdateTagsFlowTests(APITestCase):
	def setUp(self):
		self.admin = User.objects.create_superuser(
			username="flowadmin",
			email="flowadmin@example.com",
			password="strong-pass-123",
		)
		self.client.force_authenticate(user=self.admin)

		self.category = Category.objects.create(name="Phones", slug="phones")
		self.product_type = ProductType.objects.create(name="Phone Type")
		self.attribute = Attribute.objects.create(name="Storage")
		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=self.attribute)
		self.value_128 = AttributeValue.objects.create(attribute=self.attribute, value="128GB")

		self.tag_featured = ProductTag.objects.create(name="FeaturedTag", slug="featured-tag")
		self.tag_trending = ProductTag.objects.create(name="TrendingTag", slug="trending-tag")
		self.tag_sale = ProductTag.objects.create(name="SaleTag", slug="sale-tag")

	def test_create_product_accepts_tag_ids(self):
		payload = {
			"name": "Taggable Phone",
			"description": "",
			"category_id": self.category.id,
			"product_type_id": self.product_type.id,
			"buying_price": "100.00",
			"selling_price": "150.00",
			"tag_ids": [self.tag_featured.id, self.tag_trending.id],
			"variants": [
				{
					"sku": "TAG-PHONE-128",
					"stock": 5,
					"attributes": [self.value_128.id],
				}
			],
		}

		response = self.client.post(reverse("products-create"), payload, format="json")
		self.assertEqual(response.status_code, 201)

		product = Product.objects.get(id=response.data["product_id"])
		tag_ids = set(product.tags.values_list("id", flat=True))
		self.assertEqual(tag_ids, {self.tag_featured.id, self.tag_trending.id})

	def test_update_product_supports_add_remove_set_tag_operations(self):
		product = Product.objects.create(
			name="Mutable Tags Product",
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="150.00",
		)
		product.tags.set([self.tag_featured])

		add_response = self.client.patch(
			reverse("products-update", args=[product.id]),
			{"tag_ids": [self.tag_trending.id], "tags_action": "add"},
			format="json",
		)
		self.assertEqual(add_response.status_code, 200)
		self.assertEqual(
			set(product.tags.values_list("slug", flat=True)),
			{"featured-tag", "trending-tag"},
		)

		remove_response = self.client.patch(
			reverse("products-update", args=[product.id]),
			{"tag_ids": [self.tag_featured.id], "tags_action": "remove"},
			format="json",
		)
		self.assertEqual(remove_response.status_code, 200)
		product.refresh_from_db()
		self.assertEqual(set(product.tags.values_list("slug", flat=True)), {"trending-tag"})

		set_response = self.client.patch(
			reverse("products-update", args=[product.id]),
			{"tag_ids": [self.tag_sale.id], "tags_action": "set"},
			format="json",
		)
		self.assertEqual(set_response.status_code, 200)
		product.refresh_from_db()
		self.assertEqual(set(product.tags.values_list("slug", flat=True)), {"sale-tag"})


class ProductRedisCacheTests(APITestCase):
	def setUp(self):
		cache.clear()
		self.category = Category.objects.create(name="Cache Phones", slug="cache-phones")
		self.product_type = ProductType.objects.create(name="Cache Device")

		self.product = self._create_product(
			name="Cache Product",
			slug="cache-product",
			sku="CACHE-SKU-1",
		)

		self.section = Section.objects.create(title="Cache Section", priority=10)
		SectionProduct.objects.create(section=self.section, product=self.product, priority=1)

	def _create_product(self, name, slug, sku):
		product = Product.objects.create(
			name=name,
			slug=slug,
			description="",
			category=self.category,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="150.00",
			is_active=True,
		)
		ProductVariant.objects.create(
			product=product,
			sku=sku,
			stock=5,
			combination_hash=f"hash-{sku}",
		)
		ProductImage.objects.create(
			product=product,
			image_url=f"https://example.com/{slug}.jpg",
			is_primary=True,
		)
		return product

	def test_product_list_cache_is_reused_and_invalidated_on_product_save(self):
		url = reverse("products-list")
		cache_key = build_cache_key("product_list")

		first_response = self.client.get(url)
		self.assertEqual(first_response.status_code, 200)
		self.assertIsNotNone(cache.get(cache_key))

		second_response = self.client.get(url)
		self.assertEqual(second_response.data, first_response.data)

		self.product.name = "Cache Product Updated"
		self.product.save()

		self.assertIsNone(cache.get(cache_key))

	def test_section_list_cache_is_reused_and_invalidated_on_section_product_change(self):
		url = reverse("products-sections-list")
		cache_key = build_cache_key("sections_list")

		first_response = self.client.get(url)
		self.assertEqual(first_response.status_code, 200)
		self.assertIsNotNone(cache.get(cache_key))
		self.assertEqual(len(first_response.data[0]["products"]), 1)

		second_product = self._create_product(
			name="Cache Product Two",
			slug="cache-product-two",
			sku="CACHE-SKU-2",
		)
		SectionProduct.objects.create(section=self.section, product=second_product, priority=2)

		self.assertIsNone(cache.get(cache_key))

		second_response = self.client.get(url)
		self.assertEqual(second_response.status_code, 200)
		self.assertEqual(len(second_response.data[0]["products"]), 2)

	def test_product_detail_cache_is_reused_and_invalidated_by_discount_change(self):
		url = reverse("products-detail", args=[self.product.slug])
		cache_key = build_cache_key("product_detail", path_params={"slug": self.product.slug})

		first_response = self.client.get(url)
		self.assertEqual(first_response.status_code, 200)
		self.assertFalse(first_response.data["price_data"]["is_discounted"])
		self.assertIsNotNone(cache.get(cache_key))

		now = timezone.now()
		discount = Discount.objects.create(
			name="Cache Discount",
			discount_type="percentage",
			value="10.00",
			scope="product",
			is_active=True,
			start_date=now - timedelta(days=1),
			end_date=now + timedelta(days=1),
			priority=1,
		)
		ProductDiscount.objects.create(product=self.product, discount=discount)

		self.assertIsNone(cache.get(cache_key))

		second_response = self.client.get(url)
		self.assertEqual(second_response.status_code, 200)
		self.assertTrue(second_response.data["price_data"]["is_discounted"])
		self.assertLess(
			second_response.data["price_data"]["final_price"],
			second_response.data["price_data"]["original_price"],
		)
