from django.urls import path

from .views import LogoutAPIView, SuperuserLoginAPIView, SuperuserTokenRefreshAPIView


urlpatterns = [
	path("login/", SuperuserLoginAPIView.as_view(), name="superuser-login"),
	path("logout/", LogoutAPIView.as_view(), name="superuser-logout"),
	path("token/refresh/", SuperuserTokenRefreshAPIView.as_view(), name="token-refresh"),
]
