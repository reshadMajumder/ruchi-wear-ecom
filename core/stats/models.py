from django.db import models

class Event(models.Model):
    event_type = models.CharField(max_length=50, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    visitor_id = models.CharField(max_length=255, db_index=True)
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.event_type} - {self.visitor_id}"

class DailyAnalytics(models.Model):
    date = models.DateField(unique=True, db_index=True)
    total_visits = models.IntegerField(default=0)
    unique_users = models.IntegerField(default=0)
    total_orders = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    def __str__(self):
        return str(self.date)
