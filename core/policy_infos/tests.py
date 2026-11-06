from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache

from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.cache_utils import CacheKeyBuilder


class PolicyInfosAPITestCase(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="pass1234")

        refresh = RefreshToken.for_user(self.admin)
        self.admin_access = str(refresh.access_token)

        self.admin_client = self.client
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_access}")

        self.public_client = self.client_class()
        
        # Clear cache before each test
        cache.clear()

    def test_admin_create_and_public_get_policy_terms(self):
        url = "/api/policy-infos/admin/policy-terms/"
        payload = {
            "policy_html": "<h1>Privacy Policy</h1><p>We collect...</p>",
            "terms_html": "<h1>Terms</h1><p>Use of service...</p>",
        }

        # Admin create
        resp = self.admin_client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", resp.data)

        # Public get
        pub_url = "/api/policy-infos/policy-terms/"
        resp = self.public_client.get(pub_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["policy_html"], payload["policy_html"])  # exact match

    def test_admin_patch_and_delete_policy_terms(self):
        create_url = "/api/policy-infos/admin/policy-terms/"
        self.admin_client.post(create_url, {"policy_html": "<p>one</p>", "terms_html": "<p>t</p>"}, format="json")

        # patch
        resp = self.admin_client.patch(create_url, {"policy_html": "<p>updated</p>"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("data", resp.data)
        self.assertEqual(resp.data["data"]["policy_html"], "<p>updated</p>")

        # delete
        resp = self.admin_client.delete(create_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # ensure public returns 404
        resp = self.public_client.get("/api/policy-infos/policy-terms/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_faq_crud_and_public_listing(self):
        admin_faq_url = "/api/policy-infos/admin/faqs/"

        # create two faqs
        r1 = self.admin_client.post(admin_faq_url, {"question": "Q1", "answer": "A1", "is_active": True, "position": 1}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        id1 = r1.data["data"]["id"]

        r2 = self.admin_client.post(admin_faq_url, {"question": "Q2", "answer": "A2", "is_active": False, "position": 2}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)
        id2 = r2.data["data"]["id"]

        # admin list
        r = self.admin_client.get(admin_faq_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(r.data), 2)

        # public list should only include active (Q1)
        r = self.public_client.get("/api/policy-infos/faqs/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertTrue(any(f["id"] == id1 for f in r.data))
        self.assertFalse(any(f["id"] == id2 for f in r.data))

        # admin update FAQ
        detail_url = f"/api/policy-infos/admin/faqs/{id1}/"
        r = self.admin_client.patch(detail_url, {"answer": "A1-updated", "is_active": False}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        # now public list should not include id1
        r = self.public_client.get("/api/policy-infos/faqs/")
        self.assertFalse(any(f["id"] == id1 for f in r.data))

        # admin delete
        r = self.admin_client.delete(detail_url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class CacheInvalidationTestCase(APITestCase):
    """Test that cache is properly set and invalidated on data changes."""

    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(username="admin", email="admin@example.com", password="pass1234")

        refresh = RefreshToken.for_user(self.admin)
        self.admin_access = str(refresh.access_token)

        self.admin_client = self.client
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_access}")

        self.public_client = self.client_class()
        
        # Clear cache before each test
        cache.clear()

    def test_public_policy_terms_cache_set_and_invalidate(self):
        """Verify cache is set on first GET and invalidated on PATCH."""
        admin_url = "/api/policy-infos/admin/policy-terms/"
        public_url = "/api/policy-infos/policy-terms/"
        cache_key = CacheKeyBuilder.build("policy_infos", "policy_terms")

        # Create policy & terms
        self.admin_client.post(admin_url, {"policy_html": "<p>v1</p>", "terms_html": "<p>t1</p>"}, format="json")

        # First public GET should cache data
        r1 = self.public_client.get(public_url)
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data["policy_html"], "<p>v1</p>")
        
        # Verify cache is set
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data["policy_html"], "<p>v1</p>")

        # Update via admin
        self.admin_client.patch(admin_url, {"policy_html": "<p>v2-updated</p>"}, format="json")

        # Cache should be invalidated; next GET should fetch fresh data
        r2 = self.public_client.get(public_url)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["policy_html"], "<p>v2-updated</p>")

    def test_public_faq_list_cache_set_and_invalidate(self):
        """Verify FAQ list cache is set and invalidated on create/update/delete."""
        admin_url = "/api/policy-infos/admin/faqs/"
        public_url = "/api/policy-infos/faqs/"
        cache_key = CacheKeyBuilder.build("policy_infos", "faq_public_list")

        # Create active FAQ
        r = self.admin_client.post(admin_url, {"question": "Q", "answer": "A", "is_active": True, "position": 1}, format="json")
        faq_id = r.data["data"]["id"]

        # First public GET should cache data
        r1 = self.public_client.get(public_url)
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r1.data), 1)
        
        # Verify cache is set
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)
        self.assertEqual(len(cached_data), 1)

        # Create another FAQ (cache should be invalidated)
        self.admin_client.post(admin_url, {"question": "Q2", "answer": "A2", "is_active": True, "position": 2}, format="json")

        # Next GET should fetch fresh data with 2 FAQs
        r2 = self.public_client.get(public_url)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r2.data), 2)

    def test_faq_detail_cache_invalidation(self):
        """Verify FAQ detail cache is invalidated on update/delete."""
        admin_url = "/api/policy-infos/admin/faqs/"
        
        # Create FAQ
        r = self.admin_client.post(admin_url, {"question": "Q", "answer": "A", "is_active": True, "position": 1}, format="json")
        faq_id = r.data["data"]["id"]
        
        detail_url = f"/api/policy-infos/admin/faqs/{faq_id}/"
        cache_key = CacheKeyBuilder.build("policy_infos", f"faq_detail_{faq_id}")
        
        # First GET should cache
        r1 = self.admin_client.get(detail_url)
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data["answer"], "A")
        
        # Update (cache should be invalidated)
        self.admin_client.patch(detail_url, {"answer": "A-updated"}, format="json")
        
        # Next GET should fetch fresh data
        r2 = self.admin_client.get(detail_url)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.data["answer"], "A-updated")
