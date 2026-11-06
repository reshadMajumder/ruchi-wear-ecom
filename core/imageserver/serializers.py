from rest_framework import serializers

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.FileField(required=True)
