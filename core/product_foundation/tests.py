from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from products.models import (
	Attribute,
	AttributeValue,
	Category,
	Product,
	ProductType,
	ProductTypeAttribute,
	ProductVariant,
	VariantAttributeValue,
)


class PublicCategoryEndpointsTests(TestCase):
	def setUp(self):
		self.product_type = ProductType.objects.create(name="Device")

		self.root_phone = Category.objects.create(
			name="Phone",
			slug="phone",
			image_url="https://example.com/phone.jpg",
		)
		self.root_accessories = Category.objects.create(
			name="Accessories",
			slug="accessories",
			image_url="https://example.com/accessories.jpg",
		)

		self.sub_android = Category.objects.create(
			name="Android",
			slug="android",
			parent=self.root_phone,
			image_url="https://example.com/android.jpg",
		)
		self.sub_iphone = Category.objects.create(
			name="iPhone",
			slug="iphone",
			parent=self.root_phone,
			image_url="https://example.com/iphone.jpg",
		)

		self._create_product("Galaxy", self.root_phone, "SKU-1")
		self._create_product("Pixel", self.sub_android, "SKU-2")

	def _create_product(self, name, category, sku):
		product = Product.objects.create(
			name=name,
			slug=name.lower(),
			description="",
			category=category,
			product_type=self.product_type,
			buying_price="100.00",
			selling_price="500.00",
			is_active=True,
		)
		ProductVariant.objects.create(
			product=product,
			sku=sku,
			stock=3,
			combination_hash=f"hash-{sku}",
		)
		return product

	def test_public_categories_list_returns_top_level_with_image_url(self):
		url = reverse("public-categories-list")
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 2)
		self.assertEqual(response.data[0]["name"], "Accessories")
		self.assertIn("image_url", response.data[0])

	def test_public_subcategories_list_by_parent_slug(self):
		url = reverse("public-subcategories-list", kwargs={"category_slug": "phone"})
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		names = [item["name"] for item in response.data]
		self.assertEqual(names, ["Android", "iPhone"])

	def test_public_subcategories_query_list_returns_all(self):
		url = reverse("public-subcategories-query-list")
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		slugs = [item["slug"] for item in response.data]
		self.assertEqual(set(slugs), {"android", "iphone"})

	def test_public_subcategories_query_list_filters_by_category(self):
		url = reverse("public-subcategories-query-list")
		response = self.client.get(url, {"category": "phone"})

		self.assertEqual(response.status_code, 200)
		slugs = [item["slug"] for item in response.data]
		self.assertEqual(set(slugs), {"android", "iphone"})

	def test_public_subcategories_by_category_id(self):
		url = reverse("public-subcategories-by-category-id", kwargs={"category_id": self.root_phone.id})
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		slugs = [item["slug"] for item in response.data]
		self.assertEqual(set(slugs), {"android", "iphone"})

	def test_public_subcategories_by_category_id_not_found(self):
		url = reverse("public-subcategories-by-category-id", kwargs={"category_id": 999999})
		response = self.client.get(url)
		self.assertEqual(response.status_code, 404)

	def test_public_categories_include_empty_false_excludes_empty_roots(self):
		url = reverse("public-categories-list")
		response = self.client.get(url, {"include_empty": "false"})

		self.assertEqual(response.status_code, 200)
		names = [item["name"] for item in response.data]
		self.assertEqual(names, ["Phone"])

	def test_parent_category_visible_when_only_subcategory_has_products(self):
		Product.objects.filter(category=self.root_phone).delete()

		url = reverse("public-categories-list")
		response = self.client.get(url, {"include_empty": "false"})

		self.assertEqual(response.status_code, 200)
		names = [item["name"] for item in response.data]
		self.assertEqual(names, ["Phone"])


class CategorySlugConstraintTests(TestCase):
	def test_same_subcategory_slug_allowed_under_different_parents(self):
		phone = Category.objects.create(name="Phone", slug="phone")
		laptop = Category.objects.create(name="Laptop", slug="laptop")

		Category.objects.create(name="Cases", slug="cases", parent=phone)
		Category.objects.create(name="Cases", slug="cases", parent=laptop)

		self.assertEqual(Category.objects.filter(slug="cases", parent__isnull=False).count(), 2)

	def test_same_subcategory_slug_under_same_parent_gets_suffix(self):
		phone = Category.objects.create(name="Phone", slug="phone")
		first = Category.objects.create(name="Cases", slug="cases", parent=phone)
		second = Category.objects.create(name="Cases 2", slug="cases", parent=phone)

		self.assertEqual(first.slug, "cases")
		self.assertEqual(second.slug, "cases-2")

	def test_same_root_slug_gets_suffix(self):
		first = Category.objects.create(name="Phone", slug="phone")
		second = Category.objects.create(name="Phone Duplicate", slug="phone")

		self.assertEqual(first.slug, "phone")
		self.assertEqual(second.slug, "phone-2")


class ProductTypeAttributesFilterTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.admin = User.objects.create_superuser(
			username="admin",
			email="admin@example.com",
			password="adminpass123",
		)
		access_token = str(RefreshToken.for_user(self.admin).access_token)
		self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"

		self.tshirt_type = ProductType.objects.create(name="Mens T-shirt")
		self.phone_type = ProductType.objects.create(name="Phone")

		self.size = Attribute.objects.create(name="Size")
		self.color = Attribute.objects.create(name="Color")
		self.ram = Attribute.objects.create(name="RAM")

		self.size_m = AttributeValue.objects.create(attribute=self.size, value="M")
		self.size_l = AttributeValue.objects.create(attribute=self.size, value="L")
		self.color_black = AttributeValue.objects.create(attribute=self.color, value="Black")
		self.color_blue = AttributeValue.objects.create(attribute=self.color, value="Blue")
		AttributeValue.objects.create(attribute=self.ram, value="8GB")

		ProductTypeAttribute.objects.create(product_type=self.tshirt_type, attribute=self.size)
		ProductTypeAttribute.objects.create(product_type=self.tshirt_type, attribute=self.color)
		ProductTypeAttribute.objects.create(product_type=self.phone_type, attribute=self.ram)

	def test_returns_attributes_for_selected_product_type_only(self):
		url = reverse(
			"admin-product-type-attributes-by-product-type",
			kwargs={"product_type_id": self.tshirt_type.id},
		)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["product_type"]["id"], self.tshirt_type.id)

		attribute_names = [item["name"] for item in response.data["attributes"]]
		self.assertEqual(attribute_names, ["Color", "Size"])

		size_item = next(item for item in response.data["attributes"] if item["name"] == "Size")
		size_values = [value["value"] for value in size_item["values"]]
		self.assertEqual(size_values, ["L", "M"])

	def test_returns_404_for_unknown_product_type(self):
		url = reverse(
			"admin-product-type-attributes-by-product-type",
			kwargs={"product_type_id": 999999},
		)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Product type not found")


class AttributeDetailsSafetyTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.admin = User.objects.create_superuser(
			username="admin_safety",
			email="admin_safety@example.com",
			password="adminpass123",
		)
		access_token = str(RefreshToken.for_user(self.admin).access_token)
		self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"

	def test_patch_returns_404_for_unknown_attribute(self):
		url = reverse("admin-attributes-detail", kwargs={"pk": 999999})
		response = self.client.patch(url, {"name": "Updated"}, content_type="application/json")

		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Attribute not found")

	def test_delete_returns_404_for_unknown_attribute(self):
		url = reverse("admin-attributes-detail", kwargs={"pk": 999999})
		response = self.client.delete(url)

		self.assertEqual(response.status_code, 404)
		self.assertEqual(response.data["error"], "Attribute not found")


class AttributeCreationByProductTypeTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.admin = User.objects.create_superuser(
			username="admin_attr",
			email="admin_attr@example.com",
			password="adminpass123",
		)
		access_token = str(RefreshToken.for_user(self.admin).access_token)
		self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"

		self.product_type = ProductType.objects.create(name="Shoes")

	def test_create_attribute_and_link_to_product_type(self):
		url = reverse(
			"admin-product-type-attributes-by-product-type",
			kwargs={"product_type_id": self.product_type.id},
		)
		response = self.client.post(url, {"name": "Color"}, content_type="application/json")

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.data["attribute"]["name"], "Color")
		self.assertEqual(response.data["mapping"]["product_type_id"], self.product_type.id)
		self.assertTrue(Attribute.objects.filter(name="Color").exists())
		self.assertTrue(ProductTypeAttribute.objects.filter(product_type=self.product_type, attribute__name="Color").exists())

	def test_attribute_list_includes_values_and_type_mappings(self):
		attribute = Attribute.objects.create(name="Material")
		AttributeValue.objects.create(attribute=attribute, value="Cotton")
		AttributeValue.objects.create(attribute=attribute, value="Polyester")
		ProductTypeAttribute.objects.create(product_type=self.product_type, attribute=attribute)

		url = reverse("admin-attributes-list-create")
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		material = next(item for item in response.data if item["name"] == "Material")
		self.assertEqual([item["value"] for item in material["values"]], ["Cotton", "Polyester"])
		self.assertEqual(material["connected_type_names"], ["Shoes"])


class AttributeFullEditTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.admin = User.objects.create_superuser(
			username="admin_edit",
			email="admin_edit@example.com",
			password="adminpass123",
		)
		access_token = str(RefreshToken.for_user(self.admin).access_token)
		self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"

		self.type_clothing = ProductType.objects.create(name="Clothing")
		self.type_shoes = ProductType.objects.create(name="Shoes")
		self.type_phone = ProductType.objects.create(name="Phone")

		self.attribute = Attribute.objects.create(name="Color")
		self.red = AttributeValue.objects.create(attribute=self.attribute, value="Red")
		self.blue = AttributeValue.objects.create(attribute=self.attribute, value="Blue")
		ProductTypeAttribute.objects.create(product_type=self.type_clothing, attribute=self.attribute)

	def test_patch_can_update_name_values_and_connected_types(self):
		url = reverse("admin-attributes-detail", kwargs={"pk": self.attribute.id})
		payload = {
			"name": "Shade",
			"values": ["Blue", "Green"],
			"product_type_ids": [self.type_clothing.id, self.type_shoes.id],
		}

		response = self.client.patch(url, payload, content_type="application/json")

		self.assertEqual(response.status_code, 200)
		self.attribute.refresh_from_db()
		self.assertEqual(self.attribute.name, "Shade")
		self.assertEqual(
			sorted(AttributeValue.objects.filter(attribute=self.attribute).values_list("value", flat=True)),
			["Blue", "Green"],
		)
		self.assertEqual(
			sorted(ProductTypeAttribute.objects.filter(attribute=self.attribute).values_list("product_type__name", flat=True)),
			["Clothing", "Shoes"],
		)

	def test_patch_rejects_removing_values_used_in_variants(self):
		category = Category.objects.create(name="Fashion", slug="fashion")
		product = Product.objects.create(
			name="Test Shirt",
			slug="test-shirt",
			description="",
			category=category,
			product_type=self.type_clothing,
			buying_price="10.00",
			selling_price="20.00",
		)
		variant = ProductVariant.objects.create(
			product=product,
			sku="SKU-COLOR",
			stock=2,
			combination_hash="hash-color",
		)
		VariantAttributeValue.objects.create(variant=variant, attribute_value=self.red)

		url = reverse("admin-attributes-detail", kwargs={"pk": self.attribute.id})
		response = self.client.patch(
			url,
			{"values": ["Blue"]},
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		self.assertIn("used_values", response.data)
		self.assertIn("Red", response.data["used_values"])
