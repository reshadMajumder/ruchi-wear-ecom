

from pytz import timezone
from .models import Discount

def get_active_discounts():
    now = timezone.now()
    return Discount.objects.filter(
        is_active=True,
        start_date__lte=now,
        end_date__gte=now
    )