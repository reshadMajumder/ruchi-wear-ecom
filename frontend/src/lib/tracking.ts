const VISITOR_ID_KEY = 'adurys_visitor_id';
const TRACKING_ENDPOINT = '/api/stats/track/';

class Tracker {
  private visitorId: string;

  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
  }

  private getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  async trackEvent(event: string, data: any = {}) {
    if (typeof window === 'undefined') return;

    const payload = {
      event,
      data,
      visitor_id: this.visitorId,
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
      await fetch(`${apiUrl}${TRACKING_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      // Silent failure
    }
  }

  private lastTrackedPath: string = '';

  trackPageView() {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    if (this.lastTrackedPath === currentPath) return;
    this.lastTrackedPath = currentPath;

    this.trackEvent('page_view', {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }

  trackProductView(productId: number | string, name: string) {
    this.trackEvent('product_view', { product_id: productId, product_name: name });
  }

  trackAddToCart(productId: number | string, quantity: number) {
    this.trackEvent('add_to_cart', { product_id: productId, quantity });
  }

  trackCheckoutStart(cartId: string) {
    this.trackEvent('checkout_start', { cart_id: cartId });
  }

  trackPurchase(orderId: string, amount: number) {
    this.trackEvent('purchase', { order_id: orderId, amount });
  }
}

export const tracker = new Tracker();
