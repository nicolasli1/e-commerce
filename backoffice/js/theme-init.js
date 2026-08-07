(function () {
  'use strict';

  var STORAGE_KEY = 'repuestoscel_admin_theme_mode';
  var VALID_MODES = ['system', 'light', 'dark'];
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var activeMode = 'system';

  document.documentElement.dataset.adminShell = (!window.location.hash || window.location.hash === '#/login') ? 'auth' : 'app';

  function readMode() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (VALID_MODES.indexOf(stored) >= 0) return stored;
      if (stored !== null) window.localStorage.removeItem(STORAGE_KEY);
      return 'system';
    } catch (_) {
      return 'system';
    }
  }

  function resolveMode(mode) {
    return mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
  }

  function syncControls() {
    document.querySelectorAll('[data-admin-theme-select]').forEach(function (selector) {
      if (selector.value !== activeMode) selector.value = activeMode;
    });
  }

  function applyMode(mode) {
    var safeMode = VALID_MODES.indexOf(mode) >= 0 ? mode : 'system';
    var resolved = resolveMode(safeMode);
    var root = document.documentElement;
    activeMode = safeMode;
    root.dataset.adminThemeMode = safeMode;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    syncControls();
  }

  function saveMode(mode) {
    var safeMode = VALID_MODES.indexOf(mode) >= 0 ? mode : 'system';
    try {
      window.localStorage.setItem(STORAGE_KEY, safeMode);
    } catch (_) {
      // The selected mode still applies for this tab when storage is unavailable.
    }
    applyMode(safeMode);
  }

  function onSystemChange() {
    if (activeMode === 'system') applyMode('system');
  }

  applyMode(readMode());
  if (media.addEventListener) media.addEventListener('change', onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) applyMode(readMode());
  });

  document.addEventListener('DOMContentLoaded', function () {
    syncControls();
  });

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-admin-theme-select]')) saveMode(event.target.value);
  });

  window.AdminTheme = Object.freeze({
    getMode: readMode,
    setMode: saveMode,
    syncControls: syncControls,
  });
})();
