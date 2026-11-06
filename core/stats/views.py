from decimal import Decimal
from django.conf import settings
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from order.models import Order, OrderItem
from products.models import ProductVariant


def _start_of_day(dt):
	return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _period_ranges(now):
	day_start = _start_of_day(now)
	month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
	year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
	return {
		"daily": (day_start, now),
		"monthly": (month_start, now),
		"yearly": (year_start, now),
	}


def _sales_queryset(start=None, end=None):
	queryset = Order.objects.filter(status__in=["confirmed", "completed"])
	if start and end:
		queryset = queryset.filter(created_at__range=(start, end))
	return queryset


def _build_sales_summary(start=None, end=None):
	orders = _sales_queryset(start, end)
	aggregates = orders.aggregate(
		sales=Sum("total_amount"),
		gross_sales=Sum("total_amount_before_discount"),
		coupon_discount=Sum("coupon_discount_amount"),
	)

	status_breakdown = list(
		orders.values("status").annotate(count=Count("id")).order_by("status")
	)
	payment_breakdown = list(
		orders.values("payment_method").annotate(count=Count("id")).order_by("payment_method")
	)

	item_queryset = OrderItem.objects.filter(order__in=orders)
	line_profit_expr = ExpressionWrapper(
		(F("price_at_purchase") - F("product__buying_price")) * F("quantity"),
		output_field=DecimalField(max_digits=14, decimal_places=2),
	)
	profit = item_queryset.aggregate(total_profit=Sum(line_profit_expr))["total_profit"] or Decimal("0.00")

	return {
		"total_orders": orders.count(),
		"sales": aggregates["sales"] or Decimal("0.00"),
		"gross_sales": aggregates["gross_sales"] or Decimal("0.00"),
		"coupon_discount": aggregates["coupon_discount"] or Decimal("0.00"),
		"profit": profit,
		"status_breakdown": status_breakdown,
		"payment_breakdown": payment_breakdown,
	}


def _stock_summary():
	variant_queryset = ProductVariant.objects.select_related("product")
	aggregates = variant_queryset.aggregate(total_stock=Sum("stock"))
	return {
		"total_stock": aggregates["total_stock"] or 0,
		"out_of_stock_variants": variant_queryset.filter(stock=0).count(),
		"low_stock_variants": variant_queryset.filter(stock__gt=0, stock__lte=5).count(),
	}


def _most_sold_products(start=None, end=None, limit=10):
	orders = _sales_queryset(start, end)
	revenue_expr = ExpressionWrapper(
		F("quantity") * F("price_at_purchase"),
		output_field=DecimalField(max_digits=14, decimal_places=2),
	)

	queryset = (
		OrderItem.objects.filter(order__in=orders)
		.values("product_id", "product_name")
		.annotate(
			sold_quantity=Sum("quantity"),
			revenue=Sum(revenue_expr),
		)
		.order_by("-sold_quantity", "-revenue")
	)

	return list(queryset[:limit])


class AdminDashboardStatsAPIView(APIView):
	permission_classes = [IsAdminUser]

	def get(self, request):
		"""
		Retrieves dashboard statistics including sales summaries for different periods,
		stock information, and most sold products.

		Query Parameters:
		- period (str): The time period for 'most_sold_products'.
		  Options: 'daily', 'monthly', 'yearly'. Defaults to 'monthly'.
		"""
		now = timezone.now()
		ranges = _period_ranges(now)

		daily = _build_sales_summary(*ranges["daily"])
		monthly = _build_sales_summary(*ranges["monthly"])
		yearly = _build_sales_summary(*ranges["yearly"])

		period = request.query_params.get("period", "monthly")
		range_for_top = ranges.get(period, ranges["monthly"])

		data = {
			"daily": daily,
			"monthly": monthly,
			"yearly": yearly,
			"stock": _stock_summary(),
			"most_sold_products": _most_sold_products(*range_for_top),
		}
		return Response(data)

import json
import redis
from rest_framework.permissions import AllowAny
from .models import Event, DailyAnalytics

try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, socket_timeout=1, socket_connect_timeout=1)
except Exception:
    redis_client = None

class TrackEventAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        event_type = data.get("event", "unknown")
        payload = data.get("data", {})
        visitor_id = data.get("visitor_id", "")
        
        user_id = request.user.id if request.user.is_authenticated else data.get("user_id")
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        event_data = {
            "event_type": event_type,
            "payload": payload,
            "visitor_id": visitor_id,
            "user_id": user_id,
            "ip_address": ip,
            "user_agent": user_agent,
            "timestamp": timezone.now().isoformat()
        }
        
        try:
            # 1. Try Redis
            if redis_client:
                redis_client.rpush('analytics_queue', json.dumps(event_data))
            else:
                raise Exception("Redis not available")
        except Exception:
            try:
                # 2. Fallback to DB
                Event.objects.create(
                    event_type=event_data['event_type'],
                    payload=event_data['payload'],
                    visitor_id=event_data['visitor_id'],
                    user_id=event_data['user_id'],
                    ip_address=event_data['ip_address'],
                    user_agent=event_data['user_agent']
                )
            except Exception:
                # 3. Fallback to File
                try:
                    import os
                    with open(os.path.join(settings.BASE_DIR, 'analytics_fallback.log'), 'a') as f:
                        f.write(json.dumps(event_data) + '\n')
                except Exception:
                    pass # Completely fail-safe
                
        return Response({"status": "tracked"})

class AnalyticsDashboardAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        daily_stats = DailyAnalytics.objects.filter(date__lte=today).order_by('-date')[:30]
        
        data = []
        for stat in reversed(daily_stats):
            data.append({
                "date": stat.date.isoformat(),
                "visits": stat.total_visits,
                "users": stat.unique_users,
                "orders": stat.total_orders,
                "revenue": float(stat.revenue)
            })
            
        today_stat = DailyAnalytics.objects.filter(date=today).first()
        yesterday = today - timezone.timedelta(days=1)
        yesterday_stat = DailyAnalytics.objects.filter(date=yesterday).first()

        def get_trend(current, previous):
            if not previous or previous == 0:
                return "+100%" if current > 0 else "0%"
            diff = ((current - previous) / previous) * 100
            return f"{'+' if diff >= 0 else ''}{diff:.1f}%"

        today_data = {
            "visits": today_stat.total_visits if today_stat else 0,
            "users": today_stat.unique_users if today_stat else 0,
            "revenue": float(today_stat.revenue) if today_stat else 0,
            "conversion_rate": (today_stat.total_orders / today_stat.total_visits * 100) if (today_stat and today_stat.total_visits > 0) else 0,
            "trends": {
                "visits": get_trend(today_stat.total_visits if today_stat else 0, yesterday_stat.total_visits if yesterday_stat else 0),
                "users": get_trend(today_stat.unique_users if today_stat else 0, yesterday_stat.unique_users if yesterday_stat else 0),
                "revenue": get_trend(float(today_stat.revenue) if today_stat else 0, float(yesterday_stat.revenue) if yesterday_stat else 0),
                "conversion": get_trend(
                    (today_stat.total_orders / today_stat.total_visits * 100) if (today_stat and today_stat.total_visits > 0) else 0,
                    (yesterday_stat.total_orders / yesterday_stat.total_visits * 100) if (yesterday_stat and yesterday_stat.total_visits > 0) else 0
                )
            }
        }
            
        return Response({
            "today": today_data,
            "history": data
        })

class AnalyticsFunnelAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        events = Event.objects.filter(created_at__gte=thirty_days_ago)
        
        page_views = events.filter(event_type="page_view").count()
        product_views = events.filter(event_type="product_view").count()
        add_to_cart = events.filter(event_type="add_to_cart").count()
        checkout_start = events.filter(event_type="checkout_start").count()
        purchase = events.filter(event_type="purchase").count()
        
        return Response({
            "funnel": [
                {"stage": "Page Views", "count": page_views},
                {"stage": "Product Views", "count": product_views},
                {"stage": "Added to Cart", "count": add_to_cart},
                {"stage": "Checkout Started", "count": checkout_start},
                {"stage": "Purchased", "count": purchase}
            ]
        })
