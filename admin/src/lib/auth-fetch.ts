import { API_ENDPOINTS } from './api-config';

/**
 * Setup a global fetch interceptor by monkey-patching window.fetch.
 * This handles automatic Authorization headers and silent token refresh on 401 errors.
 *
 * IMPORTANT: We capture the real `originalFetch` at module scope BEFORE patching,
 * so that `performTokenRefresh` always uses the real browser fetch — not itself.
 */

// Capture the real fetch ONCE at module load time (before any patching)
const nativeFetch: typeof fetch =
  typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;

  // Prevent double-patching if called more than once (e.g. React StrictMode)
  if ((window.fetch as any).__intercepted) return;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url || input.toString();

    // Only intercept requests going to our API backend
    const isApiRequest = url.includes('/api/');
    const isRefreshRequest = url.includes('/token/refresh/');
    const isLoginRequest = url.includes('/login/');

    // Attach Authorization header automatically for all API requests (except auth endpoints)
    let requestInit = { ...init };
    if (isApiRequest && !isRefreshRequest && !isLoginRequest) {
      const token = localStorage.getItem('commercehub_access_token');
      if (token) {
        requestInit.headers = {
          ...requestInit.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    }

    // Use the captured native fetch — never the patched one
    const response = await nativeFetch(input, requestInit);

    // On 401, attempt a silent token refresh and retry the original request
    if (response.status === 401 && isApiRequest && !isRefreshRequest && !isLoginRequest) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await performTokenRefresh();
          isRefreshing = false;

          if (newToken) {
            // Drain the queue — all concurrent requests waiting for the new token
            refreshQueue.forEach(cb => cb(newToken));
            refreshQueue = [];

            // Retry THIS request with the fresh token
            const retriedInit = {
              ...requestInit,
              headers: {
                ...requestInit.headers,
                'Authorization': `Bearer ${newToken}`,
              },
            };
            return nativeFetch(input, retriedInit);
          } else {
            // Refresh token is also invalid/expired → force logout
            refreshQueue.forEach(cb => cb(null));
            refreshQueue = [];
            handleForcedLogout();
            return response; // return the original 401 so callers don't hang
          }
        } catch (error) {
          isRefreshing = false;
          refreshQueue.forEach(cb => cb(null));
          refreshQueue = [];
          handleForcedLogout();
          throw error;
        }
      } else {
        // A refresh is already in progress — queue this request
        return new Promise<Response>((resolve) => {
          refreshQueue.push((newToken) => {
            if (newToken) {
              const retriedInit = {
                ...requestInit,
                headers: {
                  ...requestInit.headers,
                  'Authorization': `Bearer ${newToken}`,
                },
              };
              resolve(nativeFetch(input, retriedInit));
            } else {
              resolve(response); // resolve with the 401; logout already handled
            }
          });
        });
      }
    }

    return response;
  };

  // Mark as patched to prevent double-patching
  (window.fetch as any).__intercepted = true;
}

/**
 * Calls the token/refresh/ endpoint using the NATIVE fetch (not the patched one)
 * to avoid infinite recursion.
 */
async function performTokenRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem('commercehub_refresh_token');
  if (!refresh) return null;

  try {
    // Use nativeFetch directly — critical to avoid calling ourselves
    const response = await nativeFetch(API_ENDPOINTS.TOKEN_REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.access) {
      localStorage.setItem('commercehub_access_token', data.access);
      // When ROTATE_REFRESH_TOKENS=True, the server returns a new refresh token
      if (data.refresh) {
        localStorage.setItem('commercehub_refresh_token', data.refresh);
      }
      return data.access;
    }
    return null;
  } catch (error) {
    console.error('[auth-fetch] Token refresh failed:', error);
    return null;
  }
}

function handleForcedLogout() {
  localStorage.removeItem('commercehub_access_token');
  localStorage.removeItem('commercehub_refresh_token');
  localStorage.removeItem('commercehub_user');

  if (typeof window !== 'undefined') {
    window.location.href = '/login?expired=true';
  }
}
