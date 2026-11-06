import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# Load configuration from Django settings with CELERY namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# Explicitly import tasks module
from . import tasks  # noqa

# Celery Beat Schedule
app.conf.beat_schedule = {
    'process-analytics-every-minute': {
        'task': 'core.tasks.process_analytics_task',
        'schedule': crontab(),  # Run every minute
    },
    'sync-courier-orders-hourly': {
        'task': 'courier.tasks.sync_orders.sync_courier_orders_task',
        'schedule': crontab(minute=0),  # Run every hour
    },
}

app.conf.timezone = settings.TIME_ZONE
