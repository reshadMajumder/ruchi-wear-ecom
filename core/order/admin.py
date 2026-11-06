from django.contrib import admin
from .models import Order, OrderItem, DeliverySettings


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "variant", "quantity", "price_at_purchase", "actual_selling_price", "product_name"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "public_order_id",
        "customer_name",
        "customer_phone",
        "division",
        "city",
        "status",
        "total_amount",
        "delivery_charge",
        "vat_amount",
        "tax_amount",
        "created_at",
    ]
    list_filter = ["status", "payment_method", "is_paid", "created_at"]
    search_fields = ["public_order_id", "customer_phone", "customer_name"]
    readonly_fields = [
        "order_id",
        "public_order_id",
        "total_amount",
        "total_amount_before_discount",
        "coupon_discount_amount",
        "delivery_charge",
        "vat_amount",
        "tax_amount",
        "created_at",
    ]
    inlines = [OrderItemInline]
    fieldsets = (
        ("Order Information", {
            "fields": ("order_id", "public_order_id", "customer_name", "customer_phone", "division", "city", "detailed_address", "address")
        }),
        ("Location", {
            "fields": ("is_inside_dhaka",)
        }),
        ("Payment & Status", {
            "fields": ("payment_method", "is_paid", "status")
        }),
        ("Pricing & Charges", {
            "fields": (
                "total_amount_before_discount",
                "coupon_code",
                "coupon_discount_amount",
                "delivery_charge",
                "vat_amount",
                "tax_amount",
                "total_amount",
            )
        }),
        ("Timestamps", {
            "fields": ("created_at",)
        }),
    )


@admin.register(DeliverySettings)
class DeliverySettingsAdmin(admin.ModelAdmin):
    list_display = ["inside_dhaka_charge", "outside_dhaka_charge", "vat_percentage", "tax_percentage", "updated_at"]
    fields = ["inside_dhaka_charge", "outside_dhaka_charge", "vat_percentage", "tax_percentage"]
    readonly_fields = ["updated_at"]

    def has_delete_permission(self, request):
        """Prevent deletion of the singleton settings object."""
        return False

    def has_add_permission(self, request):
        """Prevent creation of multiple settings objects."""
        return not DeliverySettings.objects.exists()
