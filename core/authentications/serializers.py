from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class SuperuserLoginSerializer(serializers.Serializer):
	username = serializers.CharField()
	password = serializers.CharField(write_only=True)

	def validate(self, attrs):
		request = self.context.get("request")
		username = attrs.get("username")
		password = attrs.get("password")

		user = authenticate(request=request, username=username, password=password)
		if not user:
			raise serializers.ValidationError("Invalid username or password")

		if not user.is_superuser:
			raise serializers.ValidationError("Only superuser can log in here")

		if not user.is_active:
			raise serializers.ValidationError("This account is inactive")

		refresh = RefreshToken.for_user(user)

		return {
			"access": str(refresh.access_token),
			"refresh": str(refresh),
			"user": {
				"id": user.id,
				"username": user.username,
				"is_superuser": user.is_superuser,
			},
		}


class LogoutSerializer(serializers.Serializer):
	refresh = serializers.CharField()

	def validate_refresh(self, value):
		try:
			token = RefreshToken(value)
			token.blacklist()
		except TokenError as exc:
			raise serializers.ValidationError("Invalid or expired refresh token") from exc

		return value


class SuperuserTokenRefreshSerializer(TokenRefreshSerializer):
	def validate(self, attrs):
		data = super().validate(attrs)
		refresh = RefreshToken(attrs["refresh"])
		user_id = refresh.get("user_id")
		
		try:
			user = User.objects.get(id=user_id)
			if not user.is_superuser:
				raise serializers.ValidationError("Only superuser can refresh tokens")
			if not user.is_active:
				raise serializers.ValidationError("User account is inactive")
		except User.DoesNotExist:
			raise serializers.ValidationError("User not found")

		return data
