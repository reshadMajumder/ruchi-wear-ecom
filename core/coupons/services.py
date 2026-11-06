from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Coupon, CouponPhoneUsage


def _calculate_discount_amount(coupon, subtotal):
    if coupon.discount_type == "percentage":
        discount = (subtotal * coupon.value) / Decimal("100")
    else:
        discount = coupon.value

    if coupon.max_discount_amount is not None:
        discount = min(discount, coupon.max_discount_amount)

    return max(Decimal("0.00"), min(discount, subtotal))


@transaction.atomic
def validate_and_apply_coupon(coupon_code, customer_phone, subtotal):
    if not coupon_code:
        return None, Decimal("0.00")

    now = timezone.now()
    coupon = Coupon.objects.select_for_update().filter(code__iexact=coupon_code).first()
    if not coupon:
        raise ValidationError("Invalid coupon code.")

    if not coupon.is_active:
        raise ValidationError("This coupon is inactive.")

    if coupon.start_date > now or coupon.end_date < now:
        raise ValidationError("This coupon is not valid at this time.")

    if subtotal < coupon.min_order_amount:
        raise ValidationError(
            f"Minimum order amount for this coupon is {coupon.min_order_amount}."
        )

    if coupon.scope == "specific":
        phone_rule = CouponPhoneUsage.objects.select_for_update().filter(
            coupon=coupon,
            phone_number=customer_phone,
        ).first()
        if not phone_rule:
            raise ValidationError("This coupon is not available for this phone number.")

        if phone_rule.used_count >= phone_rule.usable_count:
            raise ValidationError("Coupon usage limit reached for this phone number.")

        phone_rule.used_count += 1
        phone_rule.save(update_fields=["used_count"])

    discount_amount = _calculate_discount_amount(coupon, subtotal)
    return coupon, discount_amount


@transaction.atomic
def rollback_coupon_usage(coupon_code, customer_phone):
    if not coupon_code:
        return

    coupon = Coupon.objects.select_for_update().filter(code__iexact=coupon_code).first()
    if not coupon:
        return

    rule = CouponPhoneUsage.objects.select_for_update().filter(
        coupon=coupon,
        phone_number=customer_phone,
    ).first()
    if rule and rule.used_count > 0:
        rule.used_count -= 1
        rule.save(update_fields=["used_count"])
