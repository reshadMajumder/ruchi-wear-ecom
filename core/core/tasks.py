from celery import shared_task
from django.core.management import call_command

@shared_task
def process_analytics_task():
    """
    Celery task to process analytics events.
    Runs the process_analytics management command.
    """
    try:
        call_command('process_analytics')
        print("✓ Process analytics run success")
        return "Analytics processing completed successfully"
    except Exception as e:
        print(f"✗ Process analytics failed: {str(e)}")
        return f"Analytics processing failed: {str(e)}"
