import json
import os
import redis
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Sum
from stats.models import Event, DailyAnalytics
from order.models import Order

class Command(BaseCommand):
    help = 'Processes analytics events from Redis and fallback log, and updates daily aggregates.'

    def handle(self, *args, **options):
        self.stdout.write("Starting analytics processing...")
        
        # 1. Process Fallback Log
        self.process_fallback_log()
        
        # 2. Process Redis Queue
        self.process_redis_queue()
        
        # 3. Update Daily Aggregates
        self.update_daily_aggregates()
        
        self.stdout.write(self.style.SUCCESS("Successfully processed analytics."))
        print("✓ Process analytics run success")

    def process_fallback_log(self):
        log_path = os.path.join(settings.BASE_DIR, 'analytics_fallback.log')
        if not os.path.exists(log_path):
            return

        self.stdout.write("Processing fallback log...")
        events_to_create = []
        try:
            with open(log_path, 'r') as f:
                lines = f.readlines()
            
            for line in lines:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    events_to_create.append(Event(
                        event_type=data['event_type'],
                        payload=data['payload'],
                        visitor_id=data['visitor_id'],
                        user_id=data['user_id'],
                        ip_address=data['ip_address'],
                        user_agent=data['user_agent'],
                        created_at=data.get('timestamp', timezone.now())
                    ))
                except Exception as e:
                    self.stderr.write(f"Error parsing log line: {e}")

            if events_to_create:
                Event.objects.bulk_create(events_to_create)
                self.stdout.write(f"Imported {len(events_to_create)} events from log.")
            
            # Clear log file after successful processing
            open(log_path, 'w').close()
        except Exception as e:
            self.stderr.write(f"Failed to process fallback log: {e}")

    def process_redis_queue(self):
        try:
            r = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=0,
            )
            self.stdout.write("Processing Redis queue...")
            
            events_to_create = []
            while True:
                # lpop returns None when empty
                item = r.lpop('analytics_queue')
                if not item:
                    break
                
                try:
                    data = json.loads(item)
                    events_to_create.append(Event(
                        event_type=data['event_type'],
                        payload=data['payload'],
                        visitor_id=data['visitor_id'],
                        user_id=data['user_id'],
                        ip_address=data['ip_address'],
                        user_agent=data['user_agent'],
                        created_at=data.get('timestamp', timezone.now())
                    ))
                except Exception as e:
                    self.stderr.write(f"Error parsing redis item: {e}")

            if events_to_create:
                Event.objects.bulk_create(events_to_create)
                self.stdout.write(f"Imported {len(events_to_create)} events from Redis.")
        except Exception as e:
            self.stderr.write(f"Redis connection failed: {e}")

    def update_daily_aggregates(self):
        self.stdout.write("Updating daily aggregates...")
        # Update for today and yesterday to ensure consistency
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)
        
        for target_date in [yesterday, today]:
            events = Event.objects.filter(created_at__date=target_date)
            # Conversion counts all orders (any intent to buy)
            all_orders = Order.objects.filter(created_at__date=target_date).exclude(status='cancelled')
            # Revenue only counts completed/delivered orders
            completed_orders = all_orders.filter(status='completed')
            
            total_visits = events.filter(event_type='page_view').count()
            unique_users = events.values('visitor_id').distinct().count()
            total_orders = all_orders.count()
            revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or 0
            
            DailyAnalytics.objects.update_or_create(
                date=target_date,
                defaults={
                    'total_visits': total_visits,
                    'unique_users': unique_users,
                    'total_orders': total_orders,
                    'revenue': revenue
                }
            )
            self.stdout.write(f"Updated aggregates for {target_date}")
