

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/products/', include('products.urls')),
    path('api/varient/', include('product_varient.urls')),
    path('api/auth/', include('authentications.urls')),
    path('api/foundation/', include('product_foundation.urls')),
    path('api/discount/', include('discount.urls')),
    path('api/order/', include('order.urls')),
    path('api/', include('courier.urls')),
    path('api/coupons/', include('coupons.urls')),
    path('api/stats/', include('stats.urls')),
    path('api/policy-infos/', include('policy_infos.urls')),
    path('api/imageserver/', include('imageserver.urls')),

]
