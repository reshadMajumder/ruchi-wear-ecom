/**
 * API Configuration constants
 */
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/api/auth/login/`,
  LOGOUT: `${BASE_URL}/api/auth/logout/`,
  TOKEN_REFRESH: `${BASE_URL}/api/auth/token/refresh/`,

  // Products Public
  PRODUCTS: `${BASE_URL}/api/products/`,
  PRODUCTS_DISCOUNTED: `${BASE_URL}/api/products/discounted/`,
  getSectionProducts: (id: string | number) => `${BASE_URL}/api/products/sections/${id}/products/`,
  getRelatedProducts: (slug: string) => `${BASE_URL}/api/products/related/${slug}/`,

  // Products Admin
  PRODUCTS_ADMIN_LIST: `${BASE_URL}/api/products/admin/list/`,
  CREATE_PRODUCT: `${BASE_URL}/api/products/admin/create/`,
  PRODUCT_ADMIN_DETAILS: (id: string | number) => `${BASE_URL}/api/products/admin/${id}/details/`,
  PRODUCT_ADMIN_DETAILS_SLUG: (slug: string) => `${BASE_URL}/api/products/admin/slug/${slug}/details/`,
  UPDATE_PRODUCT: (id: string | number) => `${BASE_URL}/api/products/admin/${id}/update/`,
  DELETE_PRODUCT: (id: string | number) => `${BASE_URL}/api/products/admin/${id}/delete/`,

  // Tags
  PRODUCT_TAGS_ADMIN: `${BASE_URL}/api/products/admin/tags/`,
  getProductTags: (id: string | number) => `${BASE_URL}/api/products/admin/${id}/tags/`,

  // Foundation Categories
  CATEGORIES_ROOT: `${BASE_URL}/api/foundation/categories/`,
  CATEGORIES_ALL_SUB: `${BASE_URL}/api/foundation/subcategories/`,
  CATEGORIES_ADMIN: `${BASE_URL}/api/foundation/admin/categories/`,
  getCategoryAdminDetail: (id: string | number) => `${BASE_URL}/api/foundation/admin/categories/${id}/`,
  getSubcategoriesByCategoryId: (id: string | number) => `${BASE_URL}/api/foundation/category/${id}/subcategory/`,
  getSubcategoriesByCategorySlug: (slug: string) => `${BASE_URL}/api/foundation/categories/${slug}/subcategories/`,

  // Foundation Other
  PRODUCT_TYPES: `${BASE_URL}/api/foundation/admin/product-types/`,
  ATTRIBUTES: `${BASE_URL}/api/foundation/admin/attributes/`,
  ATTRIBUTE_VALUES: `${BASE_URL}/api/foundation/admin/attribute-values/`,
  PRODUCT_TYPE_ATTRIBUTES: `${BASE_URL}/api/foundation/admin/product-type-attributes/`,

  // Orders Endpoints
  ORDERS_LIST: `${BASE_URL}/api/order/admin/list/`,
  ORDER_DETAILS: (id: string) => `${BASE_URL}/api/order/${id}/details/`,
  UPDATE_ORDER: (id: string) => `${BASE_URL}/api/order/${id}/admin/update/`,
  CONFIRM_ORDER: (id: string) => `${BASE_URL}/api/order/${id}/admin/confirm/`,
  COMPLETE_ORDER: (id: string) => `${BASE_URL}/api/order/${id}/admin/complete/`,
  CANCEL_ORDER: (id: string) => `${BASE_URL}/api/order/${id}/admin/cancel/`,
  DELIVERY_SETTINGS: `${BASE_URL}/api/order/admin/delivery-settings/`,

  // Discount Endpoints
  CREATE_DISCOUNT: `${BASE_URL}/api/discount/admin/create/`,
  DISCOUNT_LIST: `${BASE_URL}/api/discount/list/`,
  ASSIGN_DISCOUNT: `${BASE_URL}/api/discount/admin/assign/`,
  ASSIGN_LIST: `${BASE_URL}/api/discount/admin/assign/list/`,
  UNASSIGN_DISCOUNT: `${BASE_URL}/api/discount/admin/unassign/`,
  getDiscountDetail: (id: string | number) => `${BASE_URL}/api/discount/admin/detail/${id}/`,
  UPDATE_DISCOUNT: (id: string | number) => `${BASE_URL}/api/discount/admin/update/${id}/`,
  DELETE_DISCOUNT: (id: string | number) => `${BASE_URL}/api/discount/admin/delete/${id}/`,

  // Public Discount Cards
  DISCOUNT_CARDS: `${BASE_URL}/api/discount/cards/`,
  getDiscountCardProducts: (id: string | number) => `${BASE_URL}/api/discount/cards/${id}/products/`,

  // Coupons Endpoints
  COUPONS_CREATE: `${BASE_URL}/api/coupons/admin/create/`,
  COUPONS_LIST: `${BASE_URL}/api/coupons/admin/list/`,
  COUPON_UPDATE_DELETE: (id: string | number) => `${BASE_URL}/api/coupons/admin/${id}/update-delete/`,
  COUPON_PHONE_USAGE_UPDATE: (usageId: string | number) => `${BASE_URL}/api/coupons/admin/phone-usage/${usageId}/update/`,

  // Fetch attributes and their values for a specific product type
  getProductTypeAttributes: (typeId: string) =>
    `${BASE_URL}/api/foundation/admin/product-types/${typeId}/attributes/?include_values=true`,
  getProductTypeAdminDetail: (id: string | number) => `${BASE_URL}/api/foundation/admin/product-types/${id}/`,

  // Sections Endpoints
  SECTIONS_LIST: `${BASE_URL}/api/products/sections/`,
  CREATE_SECTION: `${BASE_URL}/api/products/admin/sections/create/`,
  getSectionDetail: (id: string | number) => `${BASE_URL}/api/products/sections/${id}/`,
  UPDATE_SECTION: (id: string | number) => `${BASE_URL}/api/products/admin/sections/${id}/`,
  DELETE_SECTION: (id: string | number) => `${BASE_URL}/api/products/admin/sections/${id}/`,

  // Analytics Endpoints
  ANALYTICS_DASHBOARD: `${BASE_URL}/api/stats/analytics/dashboard/`,
  ANALYTICS_FUNNEL: `${BASE_URL}/api/stats/analytics/funnel/`,
  DASHBOARD_STATS: `${BASE_URL}/api/stats/admin/dashboard/`,

  // Policy & FAQs
  POLICIES_ADMIN: `${BASE_URL}/api/policy-infos/admin/policy-terms/`,
  FAQS_ADMIN: `${BASE_URL}/api/policy-infos/admin/faqs/`,
  FAQ_DETAIL_ADMIN: (id: string | number) => `${BASE_URL}/api/policy-infos/admin/faqs/${id}/`,

  // Courier Endpoints
  COURIER_CITIES: `${BASE_URL}/api/courier/cities/`,
  COURIER_ZONES: (cityId: string | number) => `${BASE_URL}/api/courier/zones/${cityId}/`,
  COURIER_AREAS: (zoneId: string | number) => `${BASE_URL}/api/courier/areas/${zoneId}/`,
  COURIER_STORES: `${BASE_URL}/api/courier/stores/`,
  COURIER_CALCULATE_PRICE: `${BASE_URL}/api/courier/calculate-price/`,
  COURIER_CREATE_DELIVERY: (orderId: string) => `${BASE_URL}/api/admin/orders/${orderId}/create-delivery/`,
  COURIER_DELIVERY_STATUS: (orderId: string) => `${BASE_URL}/api/admin/orders/${orderId}/delivery-status/`,
  COURIER_LIST: `${BASE_URL}/api/admin/orders/courier-list/`,

  // Variant Management
  VARIANT_STOCK_UPDATE: (variantId: string | number) => `${BASE_URL}/api/varient/admin/${variantId}/stock/`,
  CREATE_VARIANT: (productId: string | number) => `${BASE_URL}/api/varient/admin/products/${productId}/`,

  // Image Upload
  IMAGE_UPLOAD: `${BASE_URL}/api/imageserver/upload/`,
};

