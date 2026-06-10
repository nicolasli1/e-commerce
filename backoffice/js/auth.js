/**
 * RepuestosCel Backoffice — Authentication Module
 */

const Auth = (() => {
  'use strict';

  const TOKEN_KEY = 'repuestoscel_admin_token';
  const LEGACY_TOKEN_KEY = 'nex' + 'core_admin_token';

  function getStoredToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) {
      localStorage.setItem(TOKEN_KEY, legacyToken);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
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
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return data;
  }

  /**
   * Log out: clear token and redirect to login.
   */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
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
