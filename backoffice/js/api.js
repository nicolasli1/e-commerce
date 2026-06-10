/**
 * RepuestosCel Backoffice — API Client
 *
 * Singleton wrapper around fetch with auth headers, error handling,
 * and automatic redirect to login on 401.
 */

const Api = (() => {
  'use strict';

  const BASE_URL = CONFIG.API_BASE_URL;

  /**
   * Retrieve the stored auth token.
   * @returns {string|null}
   */
  function getToken() {
    const token = localStorage.getItem('repuestoscel_admin_token');
    if (token) return token;
    const legacyToken = localStorage.getItem('nex' + 'core_admin_token');
    if (legacyToken) {
      localStorage.setItem('repuestoscel_admin_token', legacyToken);
      localStorage.removeItem('nex' + 'core_admin_token');
    }
    return legacyToken;
  }

  /**
   * Core request function.
   * @param {'GET'|'POST'|'PUT'|'DELETE'} method
   * @param {string} path  — e.g. '/api/admin/products'
   * @param {object} [body] — JSON-serializable payload
   * @returns {Promise<object>} parsed JSON response
   */
  async function request(method, path, body) {
    // Add cache-buster to GET requests to avoid CloudFront cache
    const cacheBuster = method === 'GET' 
      ? (path.includes('?') ? '&' : '?') + '_t=' + Date.now()
      : '';
    const url = BASE_URL + path + cacheBuster;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body !== undefined && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    // Handle 401 — token expired or invalid
    if (res.status === 401) {
      localStorage.removeItem('repuestoscel_admin_token');
      localStorage.removeItem('nex' + 'core_admin_token');
      window.location.hash = '#/login';
      throw new Error('Sesión expirada. Redirigiendo al login…');
    }

    // Handle other errors
    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: `HTTP ${res.status}` };
      }
      throw new Error(errorData.error || `Error ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) {
      return {};
    }

    return res.json();
  }

  return {
    get:    (path)            => request('GET', path),
    post:   (path, body)      => request('POST', path, body),
    put:    (path, body)      => request('PUT', path, body),
    delete: (path)            => request('DELETE', path),

    /**
     * Upload a product image via the image processing Lambda.
     * @param {string} productId
     * @param {string} base64Image — raw base64 string (no data URI prefix)
     * @returns {Promise<object>} { ok, productId, urls: {lg, md, sm} }
     */
    async uploadImage(productId, base64Image) {
      const url = BASE_URL + '/api/admin/products/image';
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.API_KEY,
      };
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId, image: base64Image }),
      });
      if (res.status === 401) {
        localStorage.removeItem('repuestoscel_admin_token');
        localStorage.removeItem('nex' + 'core_admin_token');
        window.location.hash = '#/login';
        throw new Error('Sesión expirada. Redirigiendo al login…');
      }
      if (!res.ok) {
        let err;
        try { err = (await res.json()).error; } catch { err = `HTTP ${res.status}`; }
        throw new Error(err || `Error ${res.status}`);
      }
      return res.json();
    },
  };
})();
