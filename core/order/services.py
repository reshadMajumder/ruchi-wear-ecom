import secrets
from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from products.models import ProductVariant

from discount.services import get_price_data
from coupons.services import validate_and_apply_coupon, rollback_coupon_usage

from .models import Order, OrderItem, DeliverySettings


def _generate_public_order_id() -> str:
    """Create a human-friendly id like ORD03XXXX that stays unique."""
    month_part = timezone.now().strftime("%m")
    for _ in range(10):
        suffix = secrets.randbelow(10**5)
        candidate = f"ORD{month_part}{suffix:05d}"
        if not Order.objects.filter(public_order_id=candidate).exists():
            return candidate
    raise ValidationError("Unable to generate a public order id right now.")


def _calculate_order_charges(
    discounted_subtotal: Decimal,
    original_subtotal: Decimal,
    is_inside_dhaka: bool,
):
    """
    Calculate VAT and tax from the original product subtotal,
    then add delivery charge at the end.
    Returns a dict with delivery_charge, vat_amount, tax_amount, and final total.
    """
    settings = DeliverySettings.get_settings()
    
    # Calculate delivery charge
    delivery_charge = (
        settings.inside_dhaka_charge
        if is_inside_dhaka
        else settings.outside_dhaka_charge
    )
    delivery_charge = Decimal(str(delivery_charge))
    
    # VAT and tax apply to the original product subtotal.
    base_for_tax = original_subtotal
    
    # Calculate VAT if configured
    vat_amount = Decimal("0.00")
    if settings.vat_percentage:
        vat_percentage = Decimal(str(settings.vat_percentage))
        vat_amount = (base_for_tax * vat_percentage / Decimal("100")).quantize(Decimal("0.01"))
    
    # Calculate Tax if configured
    tax_amount = Decimal("0.00")
    if settings.tax_percentage:
        tax_percentage = Decimal(str(settings.tax_percentage))
        tax_amount = (base_for_tax * tax_percentage / Decimal("100")).quantize(Decimal("0.01"))
    
    # Final total = discounted subtotal + vat + tax + delivery
    final_total = discounted_subtotal + vat_amount + tax_amount + delivery_charge
    
    return {
        "delivery_charge": delivery_charge,
        "vat_amount": vat_amount,
        "tax_amount": tax_amount,
        "final_total": final_total,
    }


@transaction.atomic
def create_order(data):
    if not data.get("items"):
        raise ValidationError("At least one item is required.")

    division = str(data.get("division", "")).strip()
    city = str(data.get("city", "")).strip()
    detailed_address = str(data.get("detailed_address", data.get("address", ""))).strip()
    address_snapshot = ", ".join(part for part in [division, city, detailed_address] if part) or detailed_address

    discounted_subtotal = Decimal("0.00")
    total_amount_before_discount = Decimal("0.00")
    coupon_discount_amount = Decimal("0.00")
    applied_coupon_code = None
    items_to_create = []

    requested_quantities_by_variant = defaultdict(int)
    for item in data["items"]:
        requested_quantities_by_variant[item["variant_id"]] += item["quantity"]

    variants = ProductVariant.objects.select_for_update().select_related("product").in_bulk(
        requested_quantities_by_variant.keys()
    )
    missing_variant_ids = sorted(set(requested_quantities_by_variant.keys()) - set(variants.keys()))
    if missing_variant_ids:
        raise ValidationError(f"Invalid variant id(s): {missing_variant_ids}")

    for variant_id, requested_quantity in requested_quantities_by_variant.items():
        variant = variants[variant_id]

        # ❌ stock validation
        if variant.stock < requested_quantity:
            raise ValidationError(f"Stock not available for SKU {variant.sku}")

        product = variant.product

        price_data = get_price_data(product)
        unit_price = price_data["final_price"]
        actual_selling_price = product.selling_price

        discounted_subtotal += unit_price * requested_quantity
        total_amount_before_discount += actual_selling_price * requested_quantity

        items_to_create.append({
            "variant": variant,
            "product": product,
            "quantity": requested_quantity,
            "price": unit_price,
            "actual_selling_price": actual_selling_price,
        })

    coupon_code = data.get("coupon_code")
    if coupon_code:
        coupon, coupon_discount_amount = validate_and_apply_coupon(
            coupon_code=coupon_code,
            customer_phone=data["customer_phone"],
            subtotal=discounted_subtotal,
        )
        applied_coupon_code = coupon.code
        discounted_subtotal = max(Decimal("0.00"), discounted_subtotal - coupon_discount_amount)

    # 💰 Calculate delivery charge, VAT, and tax
    is_inside_dhaka = data.get("is_inside_dhaka", True)
    charges = _calculate_order_charges(discounted_subtotal, total_amount_before_discount, is_inside_dhaka)

    # 🧾 create order with delivery charges and tax
    order = Order.objects.create(
        customer_name=data["customer_name"],
        customer_phone=data["customer_phone"],
        division=division,
        city=city,
        detailed_address=detailed_address,
        address=address_snapshot,
        is_inside_dhaka=is_inside_dhaka,
        public_order_id=_generate_public_order_id(),
        weight=data.get("weight", None),
        total_amount=charges["final_total"],
        total_amount_before_discount=total_amount_before_discount,
        coupon_code=applied_coupon_code,
        coupon_discount_amount=coupon_discount_amount,
        delivery_charge=charges["delivery_charge"],
        vat_amount=charges["vat_amount"],
        tax_amount=charges["tax_amount"],
    )

    # 🔥 create items + deduct stock
    for item in items_to_create:
        OrderItem.objects.create(
            order=order,
            product=item["product"],
            variant=item["variant"],
            quantity=item["quantity"],
            price_at_purchase=item["price"],
            actual_selling_price=item["actual_selling_price"],
            product_name=item["product"].name
        )

        item["variant"].stock -= item["quantity"]
        item["variant"].save(update_fields=["stock"])

    return order


@transaction.atomic
def update_order_before_confirm(order_id, data):
    order = Order.objects.select_for_update().get(order_id=order_id)
    original_customer_phone = order.customer_phone

    if order.status != "pending":
        raise ValidationError("Only pending orders can be edited before confirmation.")

    for field in ["customer_name", "customer_phone", "address", "payment_method"]:
        if field in data:
            setattr(order, field, data[field])
    if "weight" in data:
        setattr(order, "weight", data["weight"])

    for field in ["division", "city", "detailed_address"]:
        if field in data:
            setattr(order, field, data[field])

    if any(field in data for field in ["division", "city", "detailed_address"]):
        order.address = f"{order.division}, {order.city}, {order.detailed_address}"

    if "items" not in data:
        if order.coupon_code and "customer_phone" in data:
            rollback_coupon_usage(order.coupon_code, original_customer_phone)
            _, coupon_discount_amount = validate_and_apply_coupon(
                coupon_code=order.coupon_code,
                customer_phone=order.customer_phone,
                subtotal=order.total_amount_before_discount,
            )
            order.coupon_discount_amount = coupon_discount_amount
            order.total_amount = max(
                Decimal("0.00"),
                order.total_amount_before_discount - coupon_discount_amount,
            )
        order.save()
        return order

    new_items_data = data["items"]
    old_items = list(order.items.select_related("variant", "product").all())

    old_variant_ids = [item.variant_id for item in old_items]
    new_variant_ids = [item["variant_id"] for item in new_items_data]
    all_variant_ids = set(old_variant_ids + new_variant_ids)

    variants = ProductVariant.objects.select_for_update().select_related("product").in_bulk(all_variant_ids)

    missing_variant_ids = sorted(all_variant_ids - set(variants.keys()))
    if missing_variant_ids:
        raise ValidationError(f"Invalid variant id(s): {missing_variant_ids}")

    # Restore previously reserved stock before applying new item allocation.
    for old_item in old_items:
        variants[old_item.variant_id].stock += old_item.quantity

    discounted_subtotal = Decimal("0.00")
    total_amount_before_discount = Decimal("0.00")
    rebuilt_items = []

    for item_data in new_items_data:
        variant = variants[item_data["variant_id"]]
        quantity = item_data["quantity"]

        if variant.stock < quantity:
            raise ValidationError(f"Stock not available for SKU {variant.sku}")

        product = variant.product
        price_data = get_price_data(product)
        unit_price = price_data["final_price"]
        actual_selling_price = product.selling_price

        discounted_subtotal += unit_price * quantity
        total_amount_before_discount += actual_selling_price * quantity

        rebuilt_items.append(
            OrderItem(
                order=order,
                product=product,
                variant=variant,
                quantity=quantity,
                price_at_purchase=unit_price,
                actual_selling_price=actual_selling_price,
                product_name=product.name,
            )
        )

        variant.stock -= quantity

    for variant in variants.values():
        variant.save(update_fields=["stock"])

    order.items.all().delete()
    OrderItem.objects.bulk_create(rebuilt_items)

    coupon_discount_amount = Decimal("0.00")
    if order.coupon_code:
        rollback_coupon_usage(order.coupon_code, original_customer_phone)
        coupon, coupon_discount_amount = validate_and_apply_coupon(
            coupon_code=order.coupon_code,
            customer_phone=order.customer_phone,
            subtotal=discounted_subtotal,
        )
        order.coupon_code = coupon.code

    discounted_subtotal = max(Decimal("0.00"), discounted_subtotal - coupon_discount_amount)

    # Recalculate delivery charges with updated subtotals
    charges = _calculate_order_charges(
        discounted_subtotal,
        total_amount_before_discount,
        order.is_inside_dhaka,
    )

    order.total_amount = charges["final_total"]
    order.total_amount_before_discount = total_amount_before_discount
    order.coupon_discount_amount = coupon_discount_amount
    order.delivery_charge = charges["delivery_charge"]
    order.vat_amount = charges["vat_amount"]
    order.tax_amount = charges["tax_amount"]
    # ensure weight updates persist when items or address changed
    order.save()

    return order


@transaction.atomic
def cancel_order(order_id):
    order = Order.objects.select_for_update().get(order_id=order_id)

    if order.status == "cancelled":
        raise ValidationError("Order is already cancelled.")

    if order.status == "completed":
        raise ValidationError("Completed orders cannot be cancelled.")

    if order.status not in ["pending", "confirmed"]:
        raise ValidationError("Only pending or confirmed orders can be cancelled.")

    items = list(order.items.select_related("variant").all())
    variant_ids = [item.variant_id for item in items]

    variants = ProductVariant.objects.select_for_update().in_bulk(variant_ids)

    for item in items:
        variant = variants.get(item.variant_id)
        if variant is not None:
            variant.stock += item.quantity

    for variant in variants.values():
        variant.save(update_fields=["stock"])

    rollback_coupon_usage(order.coupon_code, order.customer_phone)

    order.status = "cancelled"
    order.save(update_fields=["status"])

    return order


@transaction.atomic
def confirm_order(order_id):
    order = Order.objects.select_for_update().get(order_id=order_id)

    if order.status == "confirmed":
        raise ValidationError("Order is already confirmed.")

    if order.status != "pending":
        raise ValidationError("Only pending orders can be confirmed.")

    order.status = "confirmed"
    order.save(update_fields=["status"])

    return order


@transaction.atomic
def complete_order(order_id):
    order = Order.objects.select_for_update().get(order_id=order_id)

    if order.status == "completed":
        raise ValidationError("Order is already completed.")

    if order.status != "confirmed":
        raise ValidationError("Only confirmed orders can be completed.")

    order.status = "completed"
    order.is_paid = True
    order.save(update_fields=["status", "is_paid"])

    return order


def calculate_order_preview(data):
    """
    Calculate full order pricing snapshot without creating an order,
    without deducting stock, and without consuming coupon usage.
    """
    if not data.get("items"):
        raise ValidationError("At least one item is required.")

    discounted_subtotal = Decimal("0.00")
    total_amount_before_discount = Decimal("0.00")
    coupon_discount_amount = Decimal("0.00")
    applied_coupon_code = None

    requested_quantities_by_variant = defaultdict(int)
    for item in data["items"]:
        requested_quantities_by_variant[item["variant_id"]] += item["quantity"]

    variants = ProductVariant.objects.select_related("product").in_bulk(
        requested_quantities_by_variant.keys()
    )
    missing_variant_ids = sorted(set(requested_quantities_by_variant.keys()) - set(variants.keys()))
    if missing_variant_ids:
        raise ValidationError(f"Invalid variant id(s): {missing_variant_ids}")

    for variant_id, requested_quantity in requested_quantities_by_variant.items():
        variant = variants[variant_id]

        if variant.stock < requested_quantity:
            raise ValidationError(f"Stock not available for SKU {variant.sku}")

        product = variant.product
        price_data = get_price_data(product)
        unit_price = price_data["final_price"]
        actual_selling_price = product.selling_price

        discounted_subtotal += unit_price * requested_quantity
        total_amount_before_discount += actual_selling_price * requested_quantity

    coupon_code = data.get("coupon_code")
    if coupon_code:
        coupon, coupon_discount_amount = validate_and_apply_coupon(
            coupon_code=coupon_code,
            customer_phone=data["customer_phone"],
            subtotal=discounted_subtotal,
        )
        applied_coupon_code = coupon.code

        # Important: preview calculation must not consume coupon usage.
        rollback_coupon_usage(applied_coupon_code, data["customer_phone"])
        discounted_subtotal = max(Decimal("0.00"), discounted_subtotal - coupon_discount_amount)

    is_inside_dhaka = data.get("is_inside_dhaka", True)
    charges = _calculate_order_charges(
        discounted_subtotal,
        total_amount_before_discount,
        is_inside_dhaka,
    )

    return {
        "total_amount_before_discount": total_amount_before_discount,
        "discounted_subtotal": discounted_subtotal,
        "coupon_code": applied_coupon_code,
        "coupon_discount_amount": coupon_discount_amount,
        "delivery_charge": charges["delivery_charge"],
        "vat_amount": charges["vat_amount"],
        "tax_amount": charges["tax_amount"],
        "total_amount": charges["final_total"],
        "is_inside_dhaka": is_inside_dhaka,
    }