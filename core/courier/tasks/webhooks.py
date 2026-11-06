from __future__ import annotations

import logging

from celery import shared_task

from courier.services.webhook_processor import pathao_webhook_processor


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, default_retry_delay=30)
def process_pathao_webhook_task(self, webhook_log_id: int):
    try:
        pathao_webhook_processor.process_by_log_id(webhook_log_id)
        return {'processed': True, 'webhook_log_id': webhook_log_id}
    except Exception as exc:
        logger.exception('process_pathao_webhook_task failed for log_id=%s', webhook_log_id)
        raise self.retry(exc=exc)
