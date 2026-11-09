import uuid
from pathlib import Path

import cloudinary.uploader
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ImageUploadSerializer

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


class ImageUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = ImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image_file = serializer.validated_data['image']

        try:
            if _using_cloudinary():
                upload_data = cloudinary.uploader.upload(image_file)
                image_url = upload_data.get('secure_url')
            else:
                image_url = _store_locally(request, image_file)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'image_url': image_url}, status=status.HTTP_200_OK)


def _using_cloudinary():
    import os
    return bool(os.getenv('cloud_name') and os.getenv('api_key') and os.getenv('api_secret'))


def _store_locally(request, image_file):
    extension = Path(getattr(image_file, 'name', '')).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        extension = '.jpg'
    filename = f'{uuid.uuid4().hex}{extension}'
    destination = Path(settings.MEDIA_ROOT) / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('wb') as stored:
        for chunk in image_file.chunks():
            stored.write(chunk)
    return request.build_absolute_uri(f'{settings.MEDIA_URL}{filename}')
