from django.urls import path

from .views import (
    AdminDashboardStatsAPIView,
    TrackEventAPIView,
    AnalyticsDashboardAPIView,
    AnalyticsFunnelAPIView
)


urlpatterns = [
    path("admin/dashboard/", AdminDashboardStatsAPIView.as_view()),
    path("track/", TrackEventAPIView.as_view()),
    path("analytics/dashboard/", AnalyticsDashboardAPIView.as_view()),
    path("analytics/funnel/", AnalyticsFunnelAPIView.as_view()),
]
