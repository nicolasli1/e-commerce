/**
 * RepuestosCel Backoffice — Authentication Module
 */

const Auth = (() => {
  'use strict';

  const TOKEN_KEY = 'repuestoscel_admin_token';
  const LEGACY_TOKEN_KEY = 'nex' + 'core_admin_token';

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  function getStoredToken() {
    const token = storageGet(TOKEN_KEY);
    if (token) return token;
    const legacyToken = storageGet(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      if (storageSet(TOKEN_KEY, legacyToken)) storageRemove(LEGACY_TOKEN_KEY);
    }
    return legacyToken;
  }

  /**
   * Authenticate with username + password.
   * Stores the returned JWT-like token in localStorage.
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} response body
   */
  async function login(username, password) {
    const data = await Api.post('/api/admin/login', { username, password });
    if (data.token) {
      if (storageSet(TOKEN_KEY, data.token)) storageRemove(LEGACY_TOKEN_KEY);
    }
    return data;
  }

  /**
   * Log out: clear token and redirect to login.
   */
  function logout() {
    storageRemove(TOKEN_KEY);
    storageRemove(LEGACY_TOKEN_KEY);
    window.location.hash = '#/login';
  }

  /**
   * Check whether a token is currently stored.
   * @returns {boolean}
   */
  function isAuthenticated() {
    return !!getStoredToken();
  }

  /**
   * Retrieve the raw token string.
   * @returns {string|null}
   */
  function getToken() {
    return getStoredToken();
  }

  return {
    login,
    logout,
    isAuthenticated,
    getToken,
  };
})();
