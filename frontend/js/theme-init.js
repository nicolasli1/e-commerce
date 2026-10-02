(function () {
  var THEME_KEY = 'repuestoscel_theme_mode';
  var LEGACY_KEYS = ['nex' + 'core_theme_mode', 'nex' + 'core_site_theme', 'repuestoscel_site_theme'];
  var root = document.documentElement;

  function storageRead(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }
  function storageWrite(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (_) {}
  }
  function normalize(mode) {
    if (mode === 'repair') return 'light';
    return /^(system|light|dark)$/.test(mode || '') ? mode : null;
  }
  function resolve(mode) {
    return mode === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
  }
  function paint(mode, source) {
    var resolved = resolve(mode);
    root.dataset.themeMode = mode;
    root.dataset.theme = resolved;
    root.dataset.themeSource = source;
    root.style.colorScheme = resolved;
    var meta = document.getElementById('themeColorMeta');
    if (meta) meta.content = resolved === 'dark' ? '#080810' : '#f6f9fa';
  }

  var storedKey = THEME_KEY;
  var rawMode = storageRead(THEME_KEY);
  var storedMode = normalize(rawMode);
  if (storedMode === null) {
    for (var i = 0; i < LEGACY_KEYS.length; i += 1) {
      var legacyMode = storageRead(LEGACY_KEYS[i]);
      var normalizedLegacyMode = normalize(legacyMode);
      if (normalizedLegacyMode !== null) {
        rawMode = legacyMode;
        storedMode = normalizedLegacyMode;
        storedKey = LEGACY_KEYS[i];
        break;
      }
    }
  }
  var hasUserPreference = storedMode !== null;
  var initialMode = storedMode || 'system';

  // Persist the normalized value first; only then remove legacy keys.
  if (hasUserPreference && storageWrite(THEME_KEY, initialMode)) {
    LEGACY_KEYS.forEach(storageRemove);
  } else if (rawMode !== null && !storedMode) {
    storageRemove(storedKey);
  }

  paint(initialMode, hasUserPreference ? 'user' : 'system');
  window.__repuestosThemeBootstrap = {
    key: THEME_KEY,
    legacyKeys: LEGACY_KEYS,
    mode: initialMode,
    hasUserPreference: hasUserPreference,
    read: storageRead,
    write: storageWrite,
    remove: storageRemove
  };
})();
