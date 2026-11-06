from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import LogoutSerializer, SuperuserLoginSerializer, SuperuserTokenRefreshSerializer


class SuperuserLoginAPIView(APIView):
	authentication_classes = []
	permission_classes = []

	def post(self, request):
		serializer = SuperuserLoginSerializer(
			data=request.data,
			context={"request": request},
		)
		serializer.is_valid(raise_exception=True)
		return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutAPIView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		# Strict check for superuser
		if not request.user.is_superuser:
			return Response(
				{"detail": "Only superuser can access this endpoint"},
				status=status.HTTP_403_FORBIDDEN,
			)

		serializer = LogoutSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


class SuperuserTokenRefreshAPIView(TokenRefreshView):
	"""
	Custom TokenRefreshView that ensures the user is still a superuser and active.
	"""
	serializer_class = SuperuserTokenRefreshSerializer
