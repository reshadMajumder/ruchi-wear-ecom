from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from discount.models import CategoryDiscount, Discount, ProductDiscount
from order.models import DeliverySettings
from policy_infos.models import FAQ, PolicyTerms
from products.models import (
    Attribute,
    AttributeValue,
    Category,
    Product,
    ProductImage,
    ProductType,
    ProductTypeAttribute,
    Section,
    SectionProduct,
)
from products.services.common import create_variant_internal


class Command(BaseCommand):
    help = "Load sample Ruchi Wear categories, products, sections, and an admin user."

    def handle(self, *args, **options):
        with transaction.atomic():
            admin = self._admin_user()
            categories = self._categories()
            size_values = self._sizes()
            products = self._products(categories, size_values)
            self._sections(products)
            self._discounts(categories, products)
            self._content()
            DeliverySettings.get_settings()

        self.stdout.write(self.style.SUCCESS("Seed data is ready."))
        self.stdout.write(f"Admin login: {admin.username} / ruchiwear")

    def _admin_user(self):
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@ruchiwear.local",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.email = "admin@ruchiwear.local"
        user.is_staff = True
        user.is_superuser = True
        user.set_password("ruchiwear")
        user.save()
        if created:
            self.stdout.write("Created admin user.")
        return user

    def _categories(self):
        specs = [
            ("Panjabi", "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=400&q=80"),
            ("Shirts", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80"),
            ("T-shirts", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80"),
            ("Sets", "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=400&q=80"),
        ]
        categories = {}
        for name, image_url in specs:
            category, _ = Category.objects.get_or_create(
                name=name,
                parent=None,
                defaults={"image_url": image_url},
            )
            if category.image_url != image_url:
                category.image_url = image_url
                category.save(update_fields=["image_url"])
            categories[name] = category
        return categories

    def _sizes(self):
        product_type, _ = ProductType.objects.get_or_create(name="Apparel")
        size, _ = Attribute.objects.get_or_create(name="Size")
        ProductTypeAttribute.objects.get_or_create(product_type=product_type, attribute=size)
        values = {}
        for label in ("S", "M", "L", "XL"):
            value, _ = AttributeValue.objects.get_or_create(attribute=size, value=label)
            values[label] = value
        return product_type, values

    def _products(self, categories, size_bundle):
        product_type, sizes = size_bundle
        catalog = [
            ("Ivory Cotton Panjabi", "Panjabi", "A lightweight cotton panjabi with a clean collar.", "1800.00", "3200.00", ["M", "L", "XL"], "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80"),
            ("Midnight Black Panjabi", "Panjabi", "A black panjabi cut for evening wear.", "2000.00", "3600.00", ["M", "L", "XL"], "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80"),
            ("Sky Blue Linen Shirt", "Shirts", "A breathable linen shirt for warm days.", "1400.00", "2600.00", ["S", "M", "L"], "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80"),
            ("White Poplin Shirt", "Shirts", "A crisp poplin shirt with a sharp collar.", "1200.00", "2200.00", ["S", "M", "L", "XL"], "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80"),
            ("Navy Formal Shirt", "Shirts", "A navy shirt for work and occasions.", "1500.00", "2900.00", ["M", "L", "XL"], "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=900&q=80"),
            ("Olive Everyday Tee", "T-shirts", "A soft cotton tee in olive.", "450.00", "1200.00", ["S", "M", "L", "XL"], "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"),
            ("Black Heavyweight Tee", "T-shirts", "A heavier black tee with a relaxed fit.", "500.00", "1400.00", ["M", "L", "XL"], "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80"),
            ("Festive Kurta Set", "Sets", "A kurta set with a matching lower.", "2800.00", "5200.00", ["M", "L", "XL"], "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=900&q=80"),
        ]

        products = {}
        for name, category_name, description, buying, selling, size_labels, image_url in catalog:
            product, _ = Product.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "category": categories[category_name],
                    "product_type": product_type,
                    "buying_price": Decimal(buying),
                    "selling_price": Decimal(selling),
                    "is_active": True,
                },
            )
            product.description = description
            product.category = categories[category_name]
            product.product_type = product_type
            product.buying_price = Decimal(buying)
            product.selling_price = Decimal(selling)
            product.is_active = True
            product.save()

            ProductImage.objects.update_or_create(
                product=product,
                is_primary=True,
                defaults={"image_url": image_url},
            )

            if not product.variants.exists():
                allowed = list(
                    ProductTypeAttribute.objects.filter(product_type=product_type).values_list("attribute_id", flat=True)
                )
                for label in size_labels:
                    create_variant_internal(
                        product,
                        {
                            "sku": f"RW-{product.slug.upper()}-{label}",
                            "stock": 12,
                            "weight": "0.250",
                            "attributes": [sizes[label].id],
                        },
                        allowed,
                    )
            products[name] = product
        return products

    def _sections(self, products):
        groups = [
            ("New Arrivals", 10, ["Ivory Cotton Panjabi", "Sky Blue Linen Shirt", "Festive Kurta Set", "White Poplin Shirt"]),
            ("Everyday Edit", 5, ["Olive Everyday Tee", "Black Heavyweight Tee", "Navy Formal Shirt", "Midnight Black Panjabi"]),
        ]
        for title, priority, names in groups:
            section, _ = Section.objects.get_or_create(title=title, defaults={"priority": priority})
            section.priority = priority
            section.save(update_fields=["priority"])
            for index, name in enumerate(names):
                SectionProduct.objects.update_or_create(
                    section=section,
                    product=products[name],
                    defaults={"priority": 10 - index},
                )

    def _discounts(self, categories, products):
        now = timezone.now()
        shirt_sale, _ = Discount.objects.get_or_create(
            name="Shirt Season",
            defaults={
                "discount_type": "percentage",
                "value": Decimal("15.00"),
                "scope": "category",
                "is_active": True,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=60),
                "priority": 5,
                "image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1400&q=80",
                "make_card": True,
            },
        )
        CategoryDiscount.objects.get_or_create(category=categories["Shirts"], discount=shirt_sale)

        new_season, _ = Discount.objects.get_or_create(
            name="New Season",
            defaults={
                "discount_type": "percentage",
                "value": Decimal("10.00"),
                "scope": "global",
                "is_active": True,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=60),
                "priority": 8,
                "image_url": "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1400&q=80",
                "make_card": True,
            },
        )
        if not new_season.make_card:
            new_season.make_card = True
            new_season.save(update_fields=["make_card"])

        panjabi_offer, _ = Discount.objects.get_or_create(
            name="Panjabi Highlight",
            defaults={
                "discount_type": "fixed",
                "value": Decimal("300.00"),
                "scope": "product",
                "is_active": True,
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=60),
                "priority": 3,
                "make_card": False,
            },
        )
        ProductDiscount.objects.get_or_create(product=products["Ivory Cotton Panjabi"], discount=panjabi_offer)

    def _content(self):
        PolicyTerms.objects.update_or_create(
            pk=1,
            defaults={
                "policy_html": "<p>Ruchi Wear keeps order and contact details only to fulfill purchases and answer support requests.</p>",
                "terms_html": "<p>Orders are confirmed after review. Sizes can be exchanged when the piece is unused and returned in its original condition.</p>",
            },
        )
        faqs = [
            ("How long does delivery take?", "Inside Dhaka usually arrives in 1-3 days. Outside Dhaka usually arrives in 3-5 days."),
            ("Can I change the size?", "Yes. Message us on WhatsApp with your order number and the size you need."),
            ("How do I pay?", "Cash on delivery is available. You can also pay with bKash during checkout."),
        ]
        for position, (question, answer) in enumerate(faqs):
            FAQ.objects.update_or_create(
                question=question,
                defaults={"answer": answer, "is_active": True, "position": position},
            )
