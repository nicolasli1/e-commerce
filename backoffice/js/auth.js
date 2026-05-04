/**
 * NexCore Backoffice — Authentication Module
 */

const Auth = (() => {
  'use strict';

  const TOKEN_KEY = 'nexcore_admin_token';

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
    }
    return data;
  }

  /**
   * Log out: clear token and redirect to login.
   */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.hash = '#/login';
  }

  /**
   * Check whether a token is currently stored.
   * @returns {boolean}
   */
  function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Retrieve the raw token string.
   * @returns {string|null}
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  return {
    login,
    logout,
    isAuthenticated,
    getToken,
  };
})();
