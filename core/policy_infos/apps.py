from django.apps import AppConfig


class PolicyInfosConfig(AppConfig):
    name = 'policy_infos'

    def ready(self):
        """Register signal handlers when app is ready."""
        from . import signals  # noqa: F401

