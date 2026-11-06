from django.core.management.base import BaseCommand
from courier.models import CourierOrder, CourierWebhookLog
import json

class Command(BaseCommand):
    help = 'Debug webhook integration by showing all stored courier orders and recent webhook logs'

    def add_arguments(self, parser):
        parser.add_argument('--search-consignment', type=str, help='Search for a specific consignment_id')
        parser.add_argument('--search-merchant-order', type=str, help='Search for a specific merchant_order_id')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== COURIER ORDERS IN DATABASE ===\n'))
        
        courier_orders = CourierOrder.objects.select_related('order').all().order_by('-created_at')[:10]
        if not courier_orders:
            self.stdout.write(self.style.WARNING('No courier orders found.'))
        else:
            for i, co in enumerate(courier_orders, 1):
                self.stdout.write(
                    f"{i}. Order ID: {co.order.order_id}\n"
                    f"   Public Order ID: {co.order.public_order_id}\n"
                    f"   Consignment ID: {co.consignment_id}\n"
                    f"   Merchant Order ID: {co.merchant_order_id}\n"
                    f"   Current Status: {co.current_status}\n"
                    f"   Is Delivered: {co.is_delivered}\n"
                    f"   Created: {co.created_at}\n"
                    f"   Provider: {co.provider}\n"
                )
        
        self.stdout.write(self.style.SUCCESS('\n=== RECENT WEBHOOK LOGS ===\n'))
        
        webhook_logs = CourierWebhookLog.objects.all().order_by('-received_at')[:10]
        if not webhook_logs:
            self.stdout.write(self.style.WARNING('No webhook logs found.'))
        else:
            for i, log in enumerate(webhook_logs, 1):
                payload_str = json.dumps(log.payload, indent=2) if log.payload else "None"
                self.stdout.write(
                    f"{i}. Log ID: {log.id}\n"
                    f"   Event: {log.event}\n"
                    f"   Consignment ID: {log.consignment_id}\n"
                    f"   Processed: {log.processed}\n"
                    f"   Processing Error: {log.processing_error}\n"
                    f"   Received: {log.received_at}\n"
                    f"   Payload: {payload_str}\n"
                )
