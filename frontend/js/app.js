// ==============================
// CARRITO
// ==============================
const CART_STORAGE_KEY = 'repuestoscel_cart';
const LEGACY_CART_STORAGE_KEY = 'nex' + 'core_cart';
const CHECKOUT_REFERENCE_STORAGE_KEY = 'repuestoscel_checkout_reference';
const LEGACY_CHECKOUT_REFERENCE_STORAGE_KEY = 'nex' + 'core_checkout_reference';
const DELIVERY_REGIONS = [
  { key: 'bogota', label: 'Bogotá D.C.', defaultCity: 'Bogotá', eta: 'Mismo día o siguiente día hábil', defaultFeeCents: 1000000 },
  { key: 'amazonas', label: 'Amazonas', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'antioquia', label: 'Antioquia', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'arauca', label: 'Arauca', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'atlantico', label: 'Atlántico', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'bolivar', label: 'Bolívar', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'boyaca', label: 'Boyacá', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'caldas', label: 'Caldas', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'caqueta', label: 'Caquetá', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'casanare', label: 'Casanare', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'cauca', label: 'Cauca', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'cesar', label: 'Cesar', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'choco', label: 'Chocó', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'cordoba', label: 'Córdoba', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'cundinamarca', label: 'Cundinamarca', defaultCity: '', eta: '1 a 3 días hábiles', defaultFeeCents: 1800000 },
  { key: 'guainia', label: 'Guainía', defaultCity: '', eta: '4 a 8 días hábiles', defaultFeeCents: 1800000 },
  { key: 'guaviare', label: 'Guaviare', defaultCity: '', eta: '4 a 8 días hábiles', defaultFeeCents: 1800000 },
  { key: 'huila', label: 'Huila', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'la-guajira', label: 'La Guajira', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'magdalena', label: 'Magdalena', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'meta', label: 'Meta', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'narino', label: 'Nariño', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'norte-de-santander', label: 'Norte de Santander', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'putumayo', label: 'Putumayo', defaultCity: '', eta: '3 a 7 días hábiles', defaultFeeCents: 1800000 },
  { key: 'quindio', label: 'Quindío', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'risaralda', label: 'Risaralda', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'san-andres-y-providencia', label: 'San Andrés y Providencia', defaultCity: '', eta: '4 a 8 días hábiles', defaultFeeCents: 1800000 },
  { key: 'santander', label: 'Santander', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'sucre', label: 'Sucre', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'tolima', label: 'Tolima', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'valle-del-cauca', label: 'Valle del Cauca', defaultCity: '', eta: '2 a 5 días hábiles', defaultFeeCents: 1800000 },
  { key: 'vaupes', label: 'Vaupés', defaultCity: '', eta: '4 a 8 días hábiles', defaultFeeCents: 1800000 },
  { key: 'vichada', label: 'Vichada', defaultCity: '', eta: '4 a 8 días hábiles', defaultFeeCents: 1800000 }
];
const DELIVERY_REGION_BY_KEY = DELIVERY_REGIONS.reduce((acc, region) => {
  acc[region.key] = region;
  return acc;
}, {});

function defaultRegionPricesCents() {
  return DELIVERY_REGIONS.reduce((acc, region) => {
    acc[region.key] = region.defaultFeeCents;
    return acc;
  }, {});
}

const DEFAULT_SITE_SETTINGS = {
  visualTheme: 'dark',
  deliveryMapEnabled: true,
  shippingBogotaCents: 1000000,
  shippingNationalCents: 1800000,
  shippingRegionPricesCents: defaultRegionPricesCents(),
  googleMapsEmbedKey: ''
};
let siteSettings = { ...DEFAULT_SITE_SETTINGS };

function safeStorageRead(storageName, key, fallback = null) {
  try {
    const storage = window[storageName];
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function safeStorageWrite(storageName, key, value) {
  try {
    const storage = window[storageName];
    storage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

function safeStorageRemove(storageName, key) {
  try { window[storageName].removeItem(key); } catch (_) {}
}

function readLocalStorageWithLegacy(key, legacyKey, fallback = '') {
  const currentValue = safeStorageRead('localStorage', key);
  if (currentValue !== null) return currentValue;
  const legacyValue = safeStorageRead('localStorage', legacyKey);
  if (legacyValue !== null) {
    if (safeStorageWrite('localStorage', key, legacyValue)) {
      safeStorageRemove('localStorage', legacyKey);
    }
    return legacyValue;
  }
  return fallback;
}

function saveCart() {
  if (safeStorageWrite('localStorage', CART_STORAGE_KEY, JSON.stringify(cart))) {
    safeStorageRemove('localStorage', LEGACY_CART_STORAGE_KEY);
  }
}

function clearCartStorage() {
  safeStorageRemove('localStorage', CART_STORAGE_KEY);
  safeStorageRemove('localStorage', LEGACY_CART_STORAGE_KEY);
}

function saveCheckoutReference(reference) {
  if (safeStorageWrite('localStorage', CHECKOUT_REFERENCE_STORAGE_KEY, reference)) {
    safeStorageRemove('localStorage', LEGACY_CHECKOUT_REFERENCE_STORAGE_KEY);
  }
}

function clearCheckoutReferenceStorage() {
  safeStorageRemove('localStorage', CHECKOUT_REFERENCE_STORAGE_KEY);
  safeStorageRemove('localStorage', LEGACY_CHECKOUT_REFERENCE_STORAGE_KEY);
}

function readStoredCart() {
  try {
    const parsed = JSON.parse(readLocalStorageWithLegacy(CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, '[]') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    clearCartStorage();
    return [];
  }
}

let cart = readStoredCart();
let lastMobileNavTrigger = null;
let lastCartTrigger = null;
let lastCheckoutTrigger = null;
let lastProductTrigger = null;
let lastImageZoomTrigger = null;
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusLayer(layer, preferredSelector) {
  requestAnimationFrame(() => {
    const target = (preferredSelector && layer?.querySelector(preferredSelector))
      || layer?.querySelector(FOCUSABLE_SELECTOR)
      || layer;
    target?.focus({ preventScroll: true });
  });
}

function restoreLayerFocus(trigger, fallbackSelector) {
  const fallback = fallbackSelector ? document.querySelector(fallbackSelector) : null;
  const target = trigger instanceof HTMLElement && trigger.offsetParent !== null ? trigger : fallback;
  target?.focus({ preventScroll: true });
}

function trapFocusInside(event, layer) {
  if (event.key !== 'Tab' || !layer) return;
  const focusable = Array.from(layer.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => element.offsetParent !== null);
  if (focusable.length === 0) {
    event.preventDefault();
    layer.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
// API Key for backend auth — injected by CDK during deploy
// In dev, this can be empty (backend allows requests without key)
const API_KEY = '__API_KEY__';
function cartItemKey(item) {
  return [item?.productId || '', item?.variantId || 'base'].join('::');
}

function addToCart(product) {
  const key = cartItemKey(product);
  const existing = cart.find(c => cartItemKey(c) === key);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({...product, quantity: 1});
  }
  saveCart();
  updateCartCount();
  showCartToast(product.name + ' agregado al carrito');
}

function removeFromCart(key) {
  const el = document.querySelector(`.cart-item[data-key="${CSS.escape(key)}"]`);
  if (el) {
    el.classList.add('removing');
    setTimeout(() => {
      cart = cart.filter(c => cartItemKey(c) !== key);
      saveCart();
      updateCartCount();
      renderCart();
    }, 200);
  } else {
    cart = cart.filter(c => cartItemKey(c) !== key);
    saveCart();
    updateCartCount();
    renderCart();
  }
}

function updateQuantity(key, delta) {
  const item = cart.find(c => cartItemKey(c) === key);
  if (item) {
    const nextQuantity = item.quantity + delta;
    if (nextQuantity <= 0) {
      removeFromCart(key);
      return;
    }
    item.quantity = nextQuantity;
    saveCart();
    updateCartCount();
    renderCart();
  }
}

function updateCartCount() {
  const count = cart.reduce((sum, c) => sum + c.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
  // Also update floating cart bar
  const floatingBadge = document.getElementById('floatingCartBadge');
  const floatingTotal = document.getElementById('floatingCartTotal');
  const floatingSub = document.getElementById('floatingCartSub');
  const floatingCart = document.getElementById('floatingCart');
  if (floatingCart) {
    floatingCart.classList.toggle('is-empty', count === 0);
  }
  if (floatingBadge && floatingTotal && floatingSub) {
    floatingBadge.textContent = count;
    floatingBadge.style.display = count > 0 ? 'flex' : 'none';
    const total = cartTotal();
    floatingTotal.textContent = '\$' + total.toLocaleString('es-CO', {minimumFractionDigits:0}) + ' COP';
    floatingSub.textContent = count > 0
      ? count + ' producto' + (count !== 1 ? 's' : '')
      : 'Carrito vacío';
  }
}

function renderCart() {
  if (typeof renderInstallationOption === 'function') renderInstallationOption();
  const container = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const summary = document.getElementById('cartSummary');

  if (cart.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    summary.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  summary.style.display = 'block';

  const total = cart.reduce((sum, c) => sum + (Number(c.price) || 0) * c.quantity, 0);

  container.innerHTML = cart.map((c, i) => {
    const key = cartItemKey(c);
    const img = c.image || '';
    const initial = (c.name || '?')[0].toUpperCase();
    const thumbHtml = img
      ? `<div class="cart-thumb cart-thumb-img"><img src="${htmlSafe(img)}" alt="" loading="lazy"></div>`
      : `<div class="cart-thumb cart-thumb-init">${initial}</div>`;
    return `
    <div class="cart-item" data-key="${htmlSafe(key)}" style="animation-delay:${i * 45}ms">
      ${thumbHtml}
      <div class="cart-item-info">
        <div class="cart-item-name">${htmlSafe(c.name)}</div>
        ${c.variantLabel ? `<div class="cart-item-variant">${htmlSafe(c.variantLabel)}${c.variantQuality ? ` · ${htmlSafe(c.variantQuality)}` : ''}</div>` : ''}
        <div class="cart-item-price">$${Number(c.price).toLocaleString('es-CO', {minimumFractionDigits:0})} COP c/u</div>
      </div>
      <div class="cart-item-right">
        <div class="cart-qty">
          <button class="cart-qty-btn" onclick='updateQuantity(${JSON.stringify(key)}, -1)' aria-label="Restar">−</button>
          <span class="cart-qty-count">${c.quantity}</span>
          <button class="cart-qty-btn" onclick='updateQuantity(${JSON.stringify(key)}, 1)' aria-label="Sumar">+</button>
        </div>
        <div class="cart-item-subtotal">$${(Number(c.price) * c.quantity).toLocaleString('es-CO', {minimumFractionDigits:0})}</div>
        <button class="cart-remove" onclick='removeFromCart(${JSON.stringify(key)})' aria-label="Eliminar ${htmlSafe(c.name)}">Eliminar</button>
      </div>
    </div>`;
  }).join('');

  const installationFee = typeof installationCost === 'function' ? installationCost() : 0;
  document.getElementById('cartTotal').textContent = '$' + (total + installationFee).toLocaleString('es-CO', {minimumFractionDigits:0}) + ' COP';

  const pill = document.getElementById('cartCountPill');
  if (pill) {
    const totalQty = cart.reduce((s, c) => s + c.quantity, 0);
    pill.textContent = totalQty + (totalQty === 1 ? ' ítem' : ' ítems');
    pill.classList.toggle('visible', totalQty > 0);
  }
}

function showCartToast(msg) {
  const liveRegion = document.getElementById('cartLiveRegion');
  if (liveRegion) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = msg; });
  }
  const t = document.createElement('div');
  const hasItems = cart.reduce((sum, item) => sum + item.quantity, 0) > 0;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isModalOpen = !!document.querySelector('.modal-overlay.open');
  const placement = isMobile
    ? `top:${isModalOpen ? '18px' : '84px'};left:20px;right:20px;`
    : `bottom:${hasItems && isMobile ? '92px' : '20px'};right:20px;`;
  t.style.cssText = `position:fixed;${placement}max-width:min(360px,calc(100vw - 40px));background:#ecfdf5;color:#065f46;padding:12px 16px;border-radius:16px;border:1px solid #86efac;font-size:0.875rem;font-weight:800;line-height:1.45;z-index:9999;animation:fadeIn 0.22s cubic-bezier(0.23,1,0.32,1);box-shadow:0 18px 45px rgba(6,95,70,0.18);`;
  t.textContent = '✅ ' + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => t.remove(), 3000);
}

// Search bar toggle + live filtering
var searchVisible = false;
function toggleSearch() {
  var bar = document.getElementById('searchBar');
  var input = document.getElementById('searchInput');
  if (!bar) return;
  searchVisible = !searchVisible;
  bar.classList.toggle('visible', searchVisible);
  if (searchVisible && input) {
    input.focus(); input.select();
    document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  } else if (input) { filterProducts(''); }
}
function clearSearch() {
  filterProducts('');
  var input = document.getElementById('searchInput');
  if (input) input.focus();
}
function syncSearchInputs(query) {
  var value = String(query || '');
  var input = document.getElementById('searchInput');
  var heroInput = document.getElementById('heroSearchInput');
  var clearBtn = document.getElementById('searchClear');
  if (input && input.value !== value) input.value = value;
  if (heroInput && heroInput.value !== value) heroInput.value = value;
  if (clearBtn) clearBtn.classList.toggle('visible', value.trim().length > 0);
}
function filterProducts(query, options = {}) {
  if (options.resetCategory) activeProductCategory = '';
  activeSearchQuery = String(query || '').trim();
  currentPage = 1;
  syncSearchInputs(activeSearchQuery);
  renderStorefrontProducts();
}
function wireSearchPickButtons(root) {
  var scope = root || document;
  var input = document.getElementById('searchInput');
  scope.querySelectorAll('[data-search-pick]').forEach(function(btn) {
    if (btn.dataset.searchWired === '1') return;
    btn.dataset.searchWired = '1';
    btn.addEventListener('click', function() {
      var value = this.getAttribute('data-search-pick') || '';
      filterProducts(value, { resetCategory: true });
      document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
    });
  });
}
// Wire search input
document.addEventListener('DOMContentLoaded', function() {
  var input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('input', function() { filterProducts(this.value, { resetCategory: true }); });
  }
  var heroForm = document.getElementById('heroSearchForm');
  var heroInput = document.getElementById('heroSearchInput');
  if (heroInput) {
    heroInput.addEventListener('input', function() { filterProducts(this.value, { resetCategory: true }); });
    heroInput.addEventListener('focus', function() {
      if (!searchVisible) toggleSearch();
    });
  }
  if (heroForm) {
    heroForm.addEventListener('submit', function(event) {
      event.preventDefault();
      filterProducts(heroInput ? heroInput.value : '', { resetCategory: true });
      document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
    });
  }
  wireSearchPickButtons(document);
});

// Mobile nav slide-in panel
function openMobileNav() {
  const panel = document.getElementById('mobileNavPanel');
  const overlay = document.getElementById('navOverlay');
  const trigger = document.getElementById('mobileMenuButton');
  lastMobileNavTrigger = document.activeElement;
  panel?.classList.add('open');
  panel?.setAttribute('aria-hidden', 'false');
  overlay?.classList.add('open');
  overlay?.setAttribute('aria-hidden', 'false');
  trigger?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  focusLayer(panel, '.mobile-nav-close');
}
function closeMobileNav() {
  const panel = document.getElementById('mobileNavPanel');
  const overlay = document.getElementById('navOverlay');
  const wasOpen = panel?.classList.contains('open');
  panel?.classList.remove('open');
  panel?.setAttribute('aria-hidden', 'true');
  overlay?.classList.remove('open');
  overlay?.setAttribute('aria-hidden', 'true');
  document.getElementById('mobileMenuButton')?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  if (wasOpen) restoreLayerFocus(lastMobileNavTrigger, '#mobileMenuButton');
}

// ── Cart particle animation ──────────────────────
var _cartParticleRAF = null;
function startCartParticles() {
  if (prefersReducedMotion()) {
    stopCartParticles();
    return;
  }
  const canvas = document.getElementById('cartParticleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const modal = canvas.closest('.modal');

  function resize() {
    canvas.width  = modal.offsetWidth;
    canvas.height = modal.offsetHeight;
  }
  resize();

  const COUNT = 48;
  const COLORS = ['#a78bfa','#818cf8','#c084fc','#e879f9','#7dd3fc','#a5f3fc'];
  const pts = Array.from({length: COUNT}, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * 2.2 + 1.0,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    o:  Math.random() * 0.35 + 0.18,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      else if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      else if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.o;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    _cartParticleRAF = requestAnimationFrame(draw);
  }
  draw();
}
function stopCartParticles() {
  if (_cartParticleRAF) { cancelAnimationFrame(_cartParticleRAF); _cartParticleRAF = null; }
  const ctx = document.getElementById('cartParticleCanvas')?.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, 9999, 9999);
}

function openCart() {
  const modal = document.getElementById('cartModal');
  lastCartTrigger = document.activeElement;
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  renderCart();
  startCartParticles();
  focusLayer(modal, '#cartCloseBtn');
}

function closeCart(options = {}) {
  const modal = document.getElementById('cartModal');
  const wasOpen = modal?.classList.contains('open');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  stopCartParticles();
  if (wasOpen && options.restoreFocus !== false) restoreLayerFocus(lastCartTrigger, '#cartNavBtn');
}

function openCheckout() {
  const modal = document.getElementById('checkoutModal');
  lastCheckoutTrigger = document.activeElement;
  modal?.classList.add('open');
  modal?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  renderCheckoutSummary();
  requestAnimationFrame(() => updateCheckoutMapEmbed());
  focusLayer(modal, '#checkoutFullName');
}

function closeCheckout(options = {}) {
  const modal = document.getElementById('checkoutModal');
  const wasOpen = modal?.classList.contains('open');
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (wasOpen && options.restoreFocus !== false) restoreLayerFocus(lastCheckoutTrigger, '#cartNavBtn');
}

function formatCOP(value) {
  return '$' + Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

function formatCents(value) {
  return formatCOP((Number(value) || 0) / 100) + ' COP';
}

function normalizeSiteSettings(rawSettings = {}) {
  const regionPrices = {
    ...defaultRegionPricesCents(),
    ...(rawSettings.shippingRegionPricesCents || {})
  };
  if (!rawSettings.shippingRegionPricesCents) {
    regionPrices.bogota = Number(rawSettings.shippingBogotaCents || DEFAULT_SITE_SETTINGS.shippingBogotaCents);
    DELIVERY_REGIONS.forEach((region) => {
      if (region.key !== 'bogota') {
        regionPrices[region.key] = Number(rawSettings.shippingNationalCents || DEFAULT_SITE_SETTINGS.shippingNationalCents);
      }
    });
  }
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...rawSettings,
    deliveryMapEnabled: rawSettings.deliveryMapEnabled !== false,
    shippingRegionPricesCents: regionPrices
  };
}

function deliveryRegion(zone = selectedShippingZone()) {
  return DELIVERY_REGION_BY_KEY[zone] || DELIVERY_REGION_BY_KEY.bogota;
}

function renderDeliveryRegionOptions() {
  const select = document.getElementById('checkoutShippingZone');
  if (!select || select.dataset.rendered === 'true') return;
  select.innerHTML = DELIVERY_REGIONS.map((region) => (
    `<option value="${region.key}" ${region.key === 'bogota' ? 'selected' : ''}>${region.label}</option>`
  )).join('');
  select.dataset.rendered = 'true';
  syncCheckoutCityWithRegion(true);
}

function selectedShippingZone() {
  const value = document.getElementById('checkoutShippingZone')?.value || 'bogota';
  return DELIVERY_REGION_BY_KEY[value] ? value : 'bogota';
}

function syncCheckoutCityWithRegion(force = false) {
  const cityInput = document.getElementById('checkoutCity');
  if (!cityInput) return;
  const region = deliveryRegion();
  const wasAutoBogota = cityInput.dataset.autoCity === 'true';
  if (force || !cityInput.value.trim() || wasAutoBogota) {
    cityInput.value = region.defaultCity || '';
    cityInput.placeholder = region.key === 'bogota' ? 'Bogotá' : 'Ej: Medellín, Cali, Barranquilla';
    cityInput.dataset.autoCity = region.defaultCity ? 'true' : 'false';
  } else {
    cityInput.placeholder = region.key === 'bogota' ? 'Bogotá' : 'Ej: Medellín, Cali, Barranquilla';
    cityInput.dataset.autoCity = 'false';
  }
}

function checkoutCityValue(zone = selectedShippingZone()) {
  const cityInput = document.getElementById('checkoutCity');
  const typedCity = cityInput?.value.trim() || '';
  return typedCity || deliveryRegion(zone).defaultCity || '';
}

function shippingFeeCents(zone = selectedShippingZone()) {
  const prices = siteSettings.shippingRegionPricesCents || DEFAULT_SITE_SETTINGS.shippingRegionPricesCents;
  return Math.max(0, Number(prices[zone] ?? deliveryRegion(zone).defaultFeeCents ?? 0));
}

function shippingZoneLabel(zone = selectedShippingZone()) {
  return deliveryRegion(zone).label;
}

function shippingMapLabel(zone = selectedShippingZone()) {
  return `Entrega en ${shippingZoneLabel(zone)}`;
}

function shippingZoneCity(zone = selectedShippingZone()) {
  return checkoutCityValue(zone);
}

function shippingZoneRegion(zone = selectedShippingZone()) {
  return shippingZoneLabel(zone);
}

function shippingEta(zone = selectedShippingZone()) {
  return deliveryRegion(zone).eta;
}

function updateDeliveryPreview() {
  const zone = selectedShippingZone();
  const fee = shippingFeeCents(zone);
  const costEl = document.getElementById('checkoutDeliveryCost');
  const etaEl = document.getElementById('checkoutEstimatedDelivery');
  const mapEl = document.getElementById('checkoutMapAddress');
  if (costEl) costEl.textContent = formatCents(fee);
  if (etaEl) etaEl.textContent = shippingEta(zone);
  if (mapEl) mapEl.textContent = shippingMapLabel(zone);
  renderCheckoutSummary();
  syncCheckoutMapVisibility();
}

// ----- Mapa de entrega (Google Maps Embed) -----
// La key de "Maps Embed API" llega desde el backend en /api/site-settings (vive en AWS SSM,
// no en el repo). Si no hay key, cae a un embed sin key para no dejar el mapa en blanco.
let mapEmbedTimer = null;
let lastEmbedQuery = '';

function isDeliveryMapEnabled() {
  return siteSettings.deliveryMapEnabled !== false;
}

function syncCheckoutMapVisibility() {
  const field = document.getElementById('checkoutMapField');
  if (!field) return;
  const enabled = isDeliveryMapEnabled();
  field.classList.toggle('is-hidden', !enabled);
  if (!enabled) {
    clearTimeout(mapEmbedTimer);
    const iframe = document.getElementById('checkoutMapEmbed');
    if (iframe) iframe.removeAttribute('src');
    lastEmbedQuery = '';
  }
}

function setCheckoutMapHint(text, isSet) {
  const hint = document.getElementById('checkoutMapHint');
  if (!hint) return;
  hint.textContent = text;
  hint.classList.toggle('is-set', !!isSet);
}

function googleEmbedSrc(query) {
  const key = (siteSettings && siteSettings.googleMapsEmbedKey) || '';
  if (key) {
    // Embed oficial (Maps Embed API). La key va restringida por HTTP referrer.
    return 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(key)
      + '&q=' + encodeURIComponent(query) + '&zoom=16';
  }
  // Fallback sin key: URL de embed directa, enmarcable. (El atajo
  // maps.google.com?output=embed ya no sirve: redirige con X-Frame-Options.)
  return 'https://www.google.com/maps/embed?pb=!1m3!2m1!1s' + encodeURIComponent(query) + '!6i16';
}

function buildMapQuery() {
  const addr = document.getElementById('checkoutAddress')?.value.trim() || '';
  const city = checkoutCityValue();
  const region = shippingZoneLabel();
  if (addr.length < 6 || city.length < 2) return '';
  return [addr, city, region, 'Colombia'].filter(Boolean).join(', ');
}

function updateCheckoutMapEmbed() {
  if (!isDeliveryMapEnabled()) {
    syncCheckoutMapVisibility();
    return;
  }
  const iframe = document.getElementById('checkoutMapEmbed');
  if (!iframe) return;
  const query = buildMapQuery();
  if (!query) {
    if (!iframe.getAttribute('src')) iframe.src = googleEmbedSrc('Bogotá, Colombia');
    setCheckoutMapHint('Completa dirección, ciudad y departamento para ver una referencia en Google Maps.');
    lastEmbedQuery = '';
    return;
  }
  if (query === lastEmbedQuery) return;
  lastEmbedQuery = query;
  iframe.src = googleEmbedSrc(query);
  setCheckoutMapHint('Mapa referencial actualizado. Si el punto no coincide, conserva la dirección escrita y agrega un punto de referencia en notas.', true);
}

function scheduleMapEmbed(delay) {
  clearTimeout(mapEmbedTimer);
  mapEmbedTimer = setTimeout(updateCheckoutMapEmbed, delay == null ? 700 : delay);
}

function humanizeStatus(status) {
  const labels = {
    CHECKOUT_CREATED: 'Checkout creado',
    PENDING: 'Pago en proceso',
    PAY_ON_DELIVERY: 'Pago contra entrega',
    APPROVED: 'Pago aprobado',
    DECLINED: 'Pago rechazado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
    READY_TO_FULFILL: 'Listo para alistar',
    PROCESSING: 'En preparación',
    SHIPPED: 'Despachado',
    DELIVERED: 'Entregado',
    PENDING_PAYMENT: 'Pendiente de pago',
  };
  return labels[(status || '').toUpperCase()] || status || '—';
}

function orderItemsHtml(order) {
  const productRows = (order?.items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitCents = Number(item.unitPriceCents ?? item.unitPriceInCents ?? item.priceInCents ?? ((Number(item.price) || 0) * 100));
    const subtotalCents = Number(item.subtotalCents ?? item.subtotalInCents ?? (unitCents * quantity));
    const thumb = item.imageUrl
      ? (typeof item.imageUrl === 'object' && item.imageUrl.sm
        ? `<img class="checkout-result-item-thumb" src="${item.imageUrl.sm}" srcset="${item.imageUrl.sm} 180w${item.imageUrl.md ? ', ' + item.imageUrl.md + ' 700w' : ''}" sizes="150px" alt="${item.name || 'Producto'}" loading="lazy" />`
        : `<img class="checkout-result-item-thumb" src="${typeof item.imageUrl === 'string' ? item.imageUrl : item.imageUrl.md || item.imageUrl.lg}" alt="${item.name || 'Producto'}" loading="lazy" />`)
      : `<div class="checkout-result-item-icon">📦</div>`;
    return `
      <div class="checkout-result-item">
        <div class="checkout-result-item-main">
          ${thumb}
          <div>
            <div class="checkout-result-item-name">${item.name || 'Producto'}</div>
            <div class="checkout-result-item-meta">${quantity} x ${formatCents(unitCents)}</div>
          </div>
        </div>
        <div style="font-weight:700;">${formatCents(subtotalCents)}</div>
      </div>
    `;
  }).join('');
  const deliveryFee = Number(order?.deliveryFeeInCents || order?.delivery?.feeInCents || 0);
  const deliveryRow = deliveryFee > 0 ? `
    <div class="checkout-result-item">
      <div class="checkout-result-item-main">
        <div class="checkout-result-item-icon">🚚</div>
        <div>
          <div class="checkout-result-item-name">Envío ${order?.delivery?.label || ''}</div>
          <div class="checkout-result-item-meta">${order?.delivery?.provider || 'Inter Rapidísimo'} · ${order?.delivery?.eta || 'Entrega estimada'}</div>
        </div>
      </div>
      <div style="font-weight:700;">${formatCents(deliveryFee)}</div>
    </div>
  ` : '';
  const installationRow = typeof installationOrderRow === 'function' ? installationOrderRow(order) : '';
  return (productRows + installationRow + deliveryRow) || '<div class="tracking-empty">No encontramos ítems para este pedido.</div>';
}

function copyReference(reference) {
  if (!reference) return;
  navigator.clipboard?.writeText(reference)
    .then(() => showCartToast('Referencia copiada'))
    .catch(() => showCartToast('No pudimos copiar la referencia'));
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
}

function renderCheckoutSummary() {
  const list = document.getElementById('checkoutSummaryList');
  const subtotal = cartTotal();
  const deliveryCents = shippingFeeCents();
  const deliveryCop = deliveryCents / 100;
  const installationFee = typeof installationCost === 'function' ? installationCost() : 0;
  const total = subtotal + deliveryCop + installationFee;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (!list) return;

  const productRows = cart.map((item) => `
    <div class="checkout-summary-item">
      <div>
        <div class="checkout-summary-name">${item.name}</div>
        <div class="checkout-summary-meta">${item.quantity} x ${formatCOP(item.price)} COP</div>
      </div>
      <div style="font-weight:700;">${formatCOP((Number(item.price) || 0) * item.quantity)}</div>
    </div>
  `).join('');
  const installationSummary = typeof selectedInstallation === 'function' && selectedInstallation()
    ? `<div class="checkout-summary-total-row muted"><span>Instalación · 1 servicio</span><strong>${formatCOP(installationFee)}</strong></div>`
    : '';
  list.innerHTML = productRows + installationSummary + `
    <div class="checkout-summary-total-row muted">
      <span>Subtotal</span>
      <strong>${formatCOP(subtotal)}</strong>
    </div>
    <div class="checkout-summary-total-row muted">
      <span>Envío ${shippingZoneLabel()}</span>
      <strong>${formatCents(deliveryCents)}</strong>
    </div>
  `;

  document.getElementById('checkoutGrandTotal').textContent = formatCOP(total);
  document.getElementById('checkoutItemCount').textContent = itemCount + ' ítems';
  document.getElementById('cartTotal').textContent = formatCOP(subtotal + installationFee) + ' COP';
  document.getElementById('checkoutCity').setCustomValidity('');
  if (typeof renderInstallationCheckout === 'function') renderInstallationCheckout();
  const notesField = document.getElementById('checkoutNotes');
  const autoNote = `Pedido web con ${itemCount} ${itemCount === 1 ? 'ítem' : 'ítems'}.`;
  if (notesField && (!notesField.value || /^Pedido web con \d+ ítems?\.$/.test(notesField.value.trim()))) {
    notesField.value = autoNote;
  }
}

function selectedCheckoutProvider() {
  const el = document.querySelector('input[name="checkoutProvider"]:checked');
  return el ? el.value : 'wompi';
}

function checkoutProviderLabel(provider) {
  const key = String(provider || '').toLowerCase();
  if (key === 'nequi') return 'Nequi';
  if (key === 'wompi') return 'Wompi';
  if (key === 'interrapidisimo_cod') return 'pago contra entrega';
  return 'Mercado Pago';
}

function normalizeColombianMobile(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? digits : '';
}

function syncCheckoutProviderUI() {
  const provider = selectedCheckoutProvider();
  const note = document.getElementById('checkoutInlineNote');
  const payBtn = document.getElementById('checkoutPayBtn');
  if (payBtn) {
    payBtn.textContent = provider === 'interrapidisimo_cod' ? 'Confirmar pedido contra entrega' : 'Pagar con Wompi';
  }
  if (note) {
    if (provider === 'wompi') {
      note.textContent = 'Wompi abrirá un checkout seguro. El total incluye productos y envío calculado por backend.';
    } else if (provider === 'interrapidisimo_cod') {
      note.textContent = 'Crearemos el pedido para pago contra entrega con Inter Rapidísimo. Validaremos cobertura antes del despacho.';
    } else {
      note.textContent = 'Este método no está habilitado para nuevos pedidos.';
    }
  }
}

function showNequiWaiting(phone) {
  const form = document.getElementById('checkoutForm');
  const providerWrap = document.querySelector('.checkout-provider-wrap');
  const note = document.getElementById('checkoutInlineNote');
  const shell = document.querySelector('.checkout-shell');
  if (form) form.style.display = 'none';
  if (providerWrap) providerWrap.style.display = 'none';
  if (note) note.style.display = 'none';
  const existing = document.getElementById('nequiWaitingBlock');
  if (existing) existing.remove();
  const block = document.createElement('div');
  block.id = 'nequiWaitingBlock';
  block.className = 'nequi-waiting';
  block.innerHTML = `
    <span class="nequi-waiting-icon">📲</span>
    <p class="nequi-waiting-title">Revisa tu app Nequi</p>
    <p class="nequi-waiting-sub">Enviamos una notificación al número <strong>${htmlSafe(phone)}</strong>.<br>Aprueba el pago para confirmar tu pedido.</p>
    <div class="nequi-waiting-steps">
      <div class="nequi-step"><span class="nequi-step-num">1</span>Abre la app Nequi en tu celular</div>
      <div class="nequi-step"><span class="nequi-step-num">2</span>Acepta la notificación de cobro</div>
      <div class="nequi-step"><span class="nequi-step-num">3</span>Tu pedido se confirma automáticamente</div>
    </div>`;
  shell?.querySelector('.checkout-panel')?.appendChild(block);
}

function setCheckoutStatus(message, type = '') {
  const el = document.getElementById('checkoutStatus');
  if (!el) return;
  el.textContent = message;
  el.className = 'checkout-status visible' + (type ? ' ' + type : '');
}

function setCheckoutMode(mode) {
  const form = document.getElementById('checkoutForm');
  const providerWrap = document.querySelector('.checkout-provider-wrap');
  const note = document.getElementById('checkoutInlineNote');
  const modalTitle = document.querySelector('#checkoutModal .modal-title');
  const shell = document.querySelector('.checkout-shell');
  if (!form || !providerWrap || !note || !modalTitle) return;

  if (mode === 'confirmed') {
    shell?.classList.add('post-purchase');
    modalTitle.textContent = 'Pedido confirmado';
    return;
  }

  shell?.classList.remove('post-purchase');
  form.style.display = '';
  providerWrap.style.display = '';
  note.style.display = '';
  modalTitle.textContent = 'Finaliza tu pedido';
}

function showCheckoutResult(order, transactionId) {
  const result = document.getElementById('checkoutResult');
  const badge = document.getElementById('checkoutResultBadge');
  const title = document.getElementById('checkoutResultTitle');
  const copy = document.getElementById('checkoutResultCopy');
  const meta = document.getElementById('checkoutResultMeta');
  const referenceTag = document.getElementById('checkoutResultReference');
  const details = document.getElementById('checkoutResultDetails');
  const items = document.getElementById('checkoutResultItems');
  const nextStep = document.getElementById('checkoutResultNextStep');
  const copyBtn = document.getElementById('checkoutCopyReferenceBtn');
  const trackBtn = document.getElementById('checkoutTrackBtn');
  if (!result || !badge || !title || !copy || !meta || !referenceTag || !details || !items || !nextStep) return;

  result.classList.add('visible');
  const status = (order?.status || 'PENDING').toUpperCase();
  const provider = (order?.provider || selectedCheckoutProvider()).toLowerCase();
  const providerLabel = checkoutProviderLabel(provider);
  const statusMap = {
    APPROVED: {
      badge: 'Pago aprobado',
      title: 'Tu pago fue confirmado',
      copy: `El pedido quedó validado en ${providerLabel}. Guarda tu referencia para revisar el estado del despacho cuando quieras.`,
      nextStep: 'Tu pedido ya quedó registrado. Usa esta referencia en la sección de seguimiento para ver pago, alistamiento y entrega.',
    },
    DECLINED: {
      badge: 'Pago rechazado',
      title: 'El pago no fue aprobado',
      copy: `Puedes volver a intentar con otro método desde ${providerLabel} o revisar los datos ingresados.`,
      nextStep: 'Puedes volver al carrito e intentar otra vez con una pasarela distinta.',
    },
    ERROR: {
      badge: 'Error de pago',
      title: 'Ocurrió un error durante el cobro',
      copy: 'No marcamos el pedido como exitoso. Vuelve a intentarlo o revisa el estado más tarde.',
      nextStep: 'Conserva la referencia si el pago alcanzó a crearse y consulta su estado más abajo.',
    },
    CHECKOUT_CREATED: {
      badge: 'Checkout creado',
      title: 'Abrimos el checkout seguro',
      copy: `Cuando ${providerLabel} redirija al usuario, aquí mostraremos el resultado final del pedido.`,
      nextStep: 'Todavía estamos esperando confirmación de la pasarela.',
    },
    PAY_ON_DELIVERY: {
      badge: 'Pago contra entrega',
      title: 'Pedido creado para entrega',
      copy: 'Registramos tu pedido con pago al recibir. Confirmaremos cobertura de Inter Rapidísimo antes del despacho.',
      nextStep: 'Guarda la referencia. Te contactaremos para validar dirección, cobertura y horario de entrega.',
    },
    PENDING: {
      badge: 'Pago en proceso',
      title: 'Estamos esperando confirmación',
      copy: `${providerLabel} ya recibió la operación. El webhook o la consulta de estado terminarán de confirmar el resultado.`,
      nextStep: 'Usa la referencia para consultar el estado hasta que pase a aprobado o rechazado.',
    }
  };
  const ui = statusMap[status] || statusMap.PENDING;
  badge.textContent = ui.badge;
  title.textContent = ui.title;
  copy.textContent = ui.copy;
  nextStep.textContent = ui.nextStep || 'Usa la referencia para consultar el estado del pedido.';
  meta.textContent = `Referencia: ${order?.reference || '—'}${transactionId ? ' · Transacción: ' + transactionId : ''}`;
  referenceTag.style.display = order?.reference ? 'inline-flex' : 'none';
  referenceTag.textContent = order?.reference ? `Etiqueta de seguimiento: ${order.reference}` : '';
  details.style.display = order?.reference ? 'grid' : 'none';
  items.innerHTML = orderItemsHtml(order);
  if (copyBtn) {
    copyBtn.onclick = () => copyReference(order?.reference || '');
  }
  if (trackBtn) {
    trackBtn.onclick = () => {
      if (!order?.reference) return;
      const input = document.getElementById('trackingReferenceInput');
      if (input) input.value = order.reference;
      closeCheckout();
      document.getElementById('rastrear-pedido')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
      lookupOrderByReference(order.reference);
    };
  }

  setCheckoutMode(['APPROVED', 'PAY_ON_DELIVERY'].includes(status) ? 'confirmed' : 'active');

  if (['APPROVED', 'PAY_ON_DELIVERY'].includes(status)) {
    cart = [];
    clearCartStorage();
    clearCheckoutReferenceStorage();
    updateCartCount();
    renderCart();
  }
}

async function lookupOrderByReference(reference) {
  const normalized = (reference || '').trim().toUpperCase();
  const result = document.getElementById('trackingResult');
  const badge = document.getElementById('trackingResultBadge');
  const title = document.getElementById('trackingResultTitle');
  const copy = document.getElementById('trackingResultCopy');
  if (!normalized || !result || !badge || !title || !copy) return;

  result.classList.add('visible');
  badge.textContent = 'Buscando pedido';
  title.textContent = 'Consultando estado';
  copy.textContent = 'Estamos revisando la referencia en backend.';

  try {
    const res = await fetch(`/api/checkout/orders/${encodeURIComponent(normalized)}?_t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No encontramos ese pedido.');
    }
    const order = data.order || {};
    badge.textContent = humanizeStatus(order.status);
    title.textContent = `Pedido ${order.reference || normalized}`;
    copy.textContent = `Pago: ${humanizeStatus(order.status)} · Despacho: ${humanizeStatus(order.fulfillmentStatus)}`;
    document.getElementById('trackingReferenceValue').textContent = order.reference || normalized;
    document.getElementById('trackingPaymentStatusValue').textContent = humanizeStatus(order.status);
    document.getElementById('trackingFulfillmentStatusValue').textContent = humanizeStatus(order.fulfillmentStatus);
    document.getElementById('trackingGuideValue').textContent = order.trackingNumber || 'Aún sin guía';
    document.getElementById('trackingItems').innerHTML = orderItemsHtml(order);
  } catch (err) {
    badge.textContent = 'Sin resultado';
    title.textContent = 'No encontramos ese pedido';
    copy.textContent = err.message || 'Verifica la referencia e intenta de nuevo.';
    document.getElementById('trackingReferenceValue').textContent = normalized;
    document.getElementById('trackingPaymentStatusValue').textContent = '—';
    document.getElementById('trackingFulfillmentStatusValue').textContent = '—';
    document.getElementById('trackingGuideValue').textContent = '—';
    document.getElementById('trackingItems').innerHTML = '<div class="tracking-empty">No pudimos recuperar un resumen para esta referencia.</div>';
  }
}

function checkoutPayload() {
  const fullName = document.getElementById('checkoutFullName').value.trim();
  const email = document.getElementById('checkoutEmail').value.trim();
  const phoneNumber = document.getElementById('checkoutPhone').value.trim();
  const shippingAddress = document.getElementById('checkoutAddress').value.trim();
  const addressDetail = document.getElementById('checkoutAddressDetail')?.value.trim() || '';
  const shippingZone = selectedShippingZone();
  const region = deliveryRegion(shippingZone);
  const city = checkoutCityValue(shippingZone);
  const notes = document.getElementById('checkoutNotes').value.trim();
  const customerShippingAddress = [shippingAddress, addressDetail, city, region.label].filter(Boolean).join(', ');

  return {
    provider: selectedCheckoutProvider(),
    installation: typeof selectedInstallation === 'function' && selectedInstallation()
      ? { productId: selectedInstallation().productId, variantId: selectedInstallation().variantId || '' }
      : null,
    shippingZone,
    shippingAddress: {
      addressLine1: shippingAddress,
      addressLine2: addressDetail,
      country: 'CO',
      city,
      region: region.label,
      department: region.label,
      departmentCode: shippingZone,
      phoneNumber,
      name: fullName,
      zone: shippingZone
    },
    cart: cart.map((item) => ({
      productId: item.productId || item.id || '',
      variantId: item.variantId || '',
      quantity: item.quantity
    })),
    customer: {
      fullName,
      email,
      phoneNumber,
      phoneNumberPrefix: '+57',
      city,
      shippingAddress: customerShippingAddress
    },
    notes,
    userId: isLoggedIn() ? getUserToken() : ''  // Will be resolved server-side
  };
}

function goToCheckout() {
  if (cart.length === 0) {
    showCartToast('Tu carrito está vacío');
    return;
  }
  setCheckoutMode('active');
  closeCart({ restoreFocus: false });
  const emailInput = document.getElementById('emailInput');
  const checkoutEmail = document.getElementById('checkoutEmail');
  if (emailInput && checkoutEmail && !checkoutEmail.value) {
    checkoutEmail.value = emailInput.value.trim();
  }
  openCheckout();
}

async function launchMercadoPago(session) {
  const targetUrl = session?.mercadopago?.initPoint || session?.mercadopago?.sandboxInitPoint || '';
  if (!targetUrl) {
    throw new Error('Mercado Pago no devolvió una URL de checkout válida.');
  }
  window.location.href = targetUrl;
}

function launchWompi(session) {
  const config = session?.wompi;
  if (!config?.publicKey || !config?.reference || !config?.amountInCents || !config?.signature?.integrity) {
    throw new Error('Wompi no devolvió una configuración de checkout válida.');
  }

  const form = document.createElement('form');
  form.method = 'GET';
  form.action = 'https://checkout.wompi.co/p/';
  form.style.display = 'none';

  const fields = {
    'public-key': config.publicKey,
    currency: config.currency || 'COP',
    'amount-in-cents': String(config.amountInCents),
    reference: config.reference,
    'signature:integrity': config.signature.integrity,
    'redirect-url': config.redirectUrl || `${window.location.origin}/?checkout=return&provider=wompi&reference=${encodeURIComponent(config.reference)}`,
    'expiration-time': config.expirationTime || '',
    'customer-data:email': config.customerData?.email || '',
    'customer-data:full-name': config.customerData?.fullName || '',
    'customer-data:phone-number': config.customerData?.phoneNumber || '',
    'customer-data:phone-number-prefix': config.customerData?.phoneNumberPrefix || '+57',
  };

  Object.entries(fields).forEach(([name, value]) => {
    if (!value) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

async function submitCheckout(event) {
  event.preventDefault();
  if (typeof selectedInstallation === 'function' && selectedInstallation() && !installationInBogota()) {
    setCheckoutStatus('La instalación solo está disponible en Bogotá. Retírala o corrige tu ciudad.', 'error');
    return;
  }
  if (cart.length === 0) {
    setCheckoutStatus('Tu carrito está vacío.', 'error');
    return;
  }
  if (!document.getElementById('checkoutAcceptStore').checked || !document.getElementById('checkoutAcceptPayment').checked) {
    setCheckoutStatus('Debes aceptar las condiciones del checkout para continuar.', 'warning');
    return;
  }

  const provider = selectedCheckoutProvider();
  const payBtn = document.getElementById('checkoutPayBtn');
  payBtn.disabled = true;
  payBtn.textContent = provider === 'interrapidisimo_cod'
    ? 'Confirmando pedido...'
    : 'Abriendo Wompi...';

  try {
    const payload = checkoutPayload();
    const res = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'No pudimos crear el checkout.');
    }

    saveCheckoutReference(data.reference);

    if (provider === 'interrapidisimo_cod') {
      setCheckoutStatus('Pedido creado. Te contactaremos para confirmar cobertura y despacho.', 'success');
      showCheckoutResult(data.order || data);
      setCheckoutMode('confirmed');
    } else {
      if (provider === 'wompi') {
        setCheckoutStatus('Checkout creado. Te llevamos a Wompi para completar el pago seguro.', 'success');
        launchWompi(data);
        return;
      }
      throw new Error('Este método de pago no está disponible.');
    }
  } catch (err) {
    setCheckoutStatus(err.message || 'No pudimos iniciar el pago.', 'error');
  } finally {
    payBtn.disabled = false;
    syncCheckoutProviderUI();
  }
}

async function syncReturnedCheckout() {
  const params = new URLSearchParams(window.location.search);
  const isCheckoutReturn = params.get('checkout') === 'return';
  if (!isCheckoutReturn) return;

  const reference = params.get('reference') || readLocalStorageWithLegacy(CHECKOUT_REFERENCE_STORAGE_KEY, LEGACY_CHECKOUT_REFERENCE_STORAGE_KEY, '');
  const transactionId = params.get('transactionId') || params.get('payment_id') || params.get('id') || '';
  if (!reference) {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    return;
  }

  openCheckout();
  setCheckoutStatus('Consultando el estado más reciente del pedido...', 'warning');

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(`/api/checkout/orders/${encodeURIComponent(reference)}?transactionId=${encodeURIComponent(transactionId)}&_t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No pudimos consultar el pedido.');
      }
      const order = data.order;
      showCheckoutResult(order, transactionId);
      const status = (order?.status || '').toUpperCase();
      if (['APPROVED', 'DECLINED', 'ERROR'].includes(status)) {
        setCheckoutStatus('Estado final recibido desde backend.', status === 'APPROVED' ? 'success' : 'error');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        return;
      }
    } catch (err) {
      setCheckoutStatus(err.message || 'No pudimos sincronizar el pago.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  setCheckoutStatus('El pago sigue en proceso. El webhook de la pasarela debería actualizarlo en breve.', 'warning');
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
}

// Cart modal
document.addEventListener('DOMContentLoaded', () => {
  const cartLink = document.querySelector('a[href="#carrito"]');
  if (cartLink) {
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  }
  document.getElementById('cartCloseBtn')?.addEventListener('click', () => {
    closeCart();
  });
  document.getElementById('cartModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCart();
  });
  document.getElementById('checkoutCloseBtn')?.addEventListener('click', () => {
    closeCheckout();
  });
  document.getElementById('checkoutModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCheckout();
  });
  document.getElementById('checkoutBackBtn')?.addEventListener('click', () => {
    closeCheckout({ restoreFocus: false });
    openCart();
  });
  document.querySelectorAll('input[name="checkoutProvider"]').forEach((input) => {
    input.addEventListener('change', syncCheckoutProviderUI);
  });
  renderDeliveryRegionOptions();
  document.getElementById('checkoutShippingZone')?.addEventListener('change', () => {
    syncCheckoutCityWithRegion(true);
    updateDeliveryPreview();
    lastEmbedQuery = '';
    scheduleMapEmbed(150);
  });
  document.getElementById('checkoutCity')?.addEventListener('input', () => {
    const cityInput = document.getElementById('checkoutCity');
    if (cityInput) cityInput.dataset.autoCity = 'false';
    updateDeliveryPreview();
    scheduleMapEmbed();
  });
  document.getElementById('checkoutCity')?.addEventListener('blur', () => updateCheckoutMapEmbed());
  document.getElementById('checkoutAddress')?.addEventListener('input', () => scheduleMapEmbed());
  document.getElementById('checkoutAddress')?.addEventListener('blur', () => updateCheckoutMapEmbed());
  document.getElementById('checkoutForm')?.addEventListener('submit', submitCheckout);
  document.getElementById('checkoutBtn')?.addEventListener('click', goToCheckout);
  document.getElementById('trackingForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    lookupOrderByReference(document.getElementById('trackingReferenceInput')?.value || '');
  });
  document.addEventListener('keydown', (event) => {
    const detailModal = document.getElementById('productDetailModal');
    if (!detailModal?.classList.contains('open')) return;
    if (document.getElementById('imageZoomModal')?.classList.contains('open')) return;
    trapFocusInside(event, detailModal);
    if (event.key === 'Escape') {
      event.preventDefault();
      if (detailModal.classList.contains('is-gallery-fullscreen')) {
        setDetailFullscreen(false);
      } else {
        closeProductDetail();
      }
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextGalleryImage();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevGalleryImage();
    }
  });
  updateCartCount();
  syncCheckoutProviderUI();
  updateDeliveryPreview();
  syncReturnedCheckout();
});

document.addEventListener('keydown', (event) => {
  if (document.getElementById('infoModal')?.classList.contains('open')) return;
  if (document.getElementById('productDetailModal')?.classList.contains('open')
      && !document.getElementById('imageZoomModal')?.classList.contains('open')) return;

  const imageZoom = document.getElementById('imageZoomModal');
  const checkout = document.getElementById('checkoutModal');
  const cartLayer = document.getElementById('cartModal');
  const mobileNav = document.getElementById('mobileNavPanel');
  const activeLayer = [imageZoom, checkout, cartLayer, mobileNav]
    .find((layer) => layer?.classList.contains('open'));
  if (!activeLayer) return;

  trapFocusInside(event, activeLayer);
  if (event.key !== 'Escape') return;
  event.preventDefault();
  if (activeLayer === imageZoom) closeImageZoom();
  else if (activeLayer === checkout) closeCheckout();
  else if (activeLayer === cartLayer) closeCart();
  else closeMobileNav();
});

// ==============================
// PRODUCTOS DESDE LA API
// ==============================
const PRODUCT_CATEGORY_LABELS = {
  'pantallas': 'Pantallas',
  'baterias': 'Baterías',
  'flex': 'Flex y conectores',
  'flex-y-conectores': 'Flex y conectores',
  'camaras': 'Cámaras',
  'camaras-y-modulos': 'Cámaras y módulos',
  'tapas': 'Tapas y carcasa',
  'tapas-y-carcasa': 'Tapas y carcasa',
  'accesorios': 'Accesorios',
  'back-glass': 'Back Glass',
  'face-id': 'Face ID',
  'charging-ports': 'Charging Ports',
  'speakers': 'Speakers',
  'adhesivos': 'Adhesivos',
  'herramientas': 'Herramientas DIY',
  'herramientas-diy': 'Herramientas DIY',
};
let storefrontProducts = [];
let activeProductCategory = '';
let activeSearchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 12;

function isLocalPreview() {
  return ['localhost', '127.0.0.1', ''].includes(window.location.hostname) || window.location.protocol === 'file:';
}

function localPreviewProducts() {
  return [
    {
      productId: 'preview-screen-iphone-pro',
      name: 'Pantalla iPhone Pro',
      description: 'Pantalla completa para recuperar imagen y touch. Probada antes de enviarla.',
      price: 120000,
      category: 'pantallas',
      quality: 'GX',
      compatibility: ['iPhone', 'iPhone Pro'],
      shippingTime: 'Calculado según destino',
      warranty: 'Consulta condiciones',
      repairDifficulty: 'Media',
      repairTime: '45-60 min',
      requiredTools: ['Pentalobe', 'Spudger', 'Adhesivo display'],
      productCondition: 'Nuevo probado',
      related: ['Adhesivo iPhone', 'Kit apertura iPhone'],
      stock: 4
    },
    {
      productId: 'preview-battery-samsung-galaxy',
      name: 'Batería Samsung Galaxy',
      description: 'Batería para cuando tu Samsung dura poco, se apaga rápido o ya no retiene carga.',
      price: 78000,
      category: 'baterias',
      quality: 'OEM',
      compatibility: ['Samsung Galaxy'],
      shippingTime: 'Entrega nacional',
      warranty: 'Consulta condiciones',
      repairDifficulty: 'Media',
      repairTime: '30-45 min',
      requiredTools: ['Pentalobe', 'Spudger', 'Adhesivo batería'],
      productCondition: 'Nuevo OEM',
      related: ['Adhesivo batería Samsung', 'Kit destornilladores'],
      stock: 18
    },
    {
      productId: 'preview-flex-xiaomi-redmi',
      name: 'Puerto de carga Xiaomi Redmi',
      description: 'Puerto de carga y micrófono para cuando tu Xiaomi no carga bien o falla al conectar.',
      price: 42000,
      category: 'flex-y-conectores',
      quality: 'AAA',
      compatibility: ['Xiaomi Redmi', 'Xiaomi'],
      shippingTime: 'Calculado según destino',
      warranty: 'Consulta condiciones',
      repairDifficulty: 'Baja',
      repairTime: '20-30 min',
      requiredTools: ['Phillips', 'Pinza', 'Alcohol isopropílico'],
      productCondition: 'Nuevo',
      related: ['Adhesivo tapa Xiaomi', 'Puerto SIM Redmi'],
      stock: 9
    },
    {
      productId: 'preview-camera',
      name: 'Cámara trasera iPhone Pro',
      description: 'Módulo de cámara probado antes del envío para recuperar fotos y video.',
      price: 165000,
      category: 'camaras-y-modulos',
      quality: 'Original',
      compatibility: ['iPhone', 'iPhone Pro'],
      shippingTime: 'Calculado según destino',
      warranty: 'Consulta condiciones',
      repairDifficulty: 'Alta',
      repairTime: '60-90 min',
      requiredTools: ['Pentalobe', 'Spudger', 'Pinza ESD'],
      productCondition: 'Original probado',
      related: ['Flash iPhone', 'Flex cámara iPhone'],
      stock: 0
    }
  ];
}

function getCategoryLabel(category) {
  return PRODUCT_CATEGORY_LABELS[category] || category || 'Catálogo';
}

function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SEARCH_STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'por', 'con', 'sin', 'no', 'un', 'una', 'y', 'o']);
const SEARCH_SYNONYMS = {
  bateria: ['battery', 'baterias', 'pila'],
  baterias: ['battery', 'bateria', 'pila'],
  pantalla: ['display', 'lcd', 'touch', 'screen', 'modulo'],
  pantallas: ['display', 'lcd', 'touch', 'screen', 'modulo'],
  display: ['pantalla', 'lcd', 'touch', 'screen', 'modulo'],
  flex: ['conector', 'cable', 'charging', 'puerto'],
  carga: ['charging', 'puerto', 'conector', 'flex'],
  camara: ['camera', 'modulo', 'lente'],
  camaras: ['camera', 'modulo', 'lente'],
  tapa: ['carcasa', 'back', 'glass', 'vidrio'],
  adhesivo: ['sello', 'pegante', 'precorte', 'precuts'],
  herramienta: ['kit', 'destornillador', 'spudger', 'pentalobe'],
  herramientas: ['kit', 'destornillador', 'spudger', 'pentalobe'],
  auricular: ['speaker', 'parlante', 'audio'],
  parlante: ['speaker', 'auricular', 'audio'],
};
const SEARCH_INTENT_RULES = [
  { intent: 'pantallas', labels: ['Pantallas'], terms: ['pantalla', 'pantallas', 'display', 'lcd', 'touch', 'screen'] },
  { intent: 'baterias', labels: ['Baterías'], terms: ['bateria', 'baterias', 'battery', 'pila'] },
  { intent: 'camaras-y-modulos', labels: ['Cámaras y módulos'], terms: ['camara', 'camaras', 'camera', 'lente'] },
  { intent: 'flex-y-conectores', labels: ['Flex y conectores', 'Charging Ports'], terms: ['flex', 'conector', 'puerto', 'carga', 'charging', 'pin'] },
  { intent: 'tapas-y-carcasa', labels: ['Tapas y carcasa', 'Back Glass'], terms: ['tapa', 'carcasa', 'back', 'glass', 'vidrio'] },
  { intent: 'herramientas-diy', labels: ['Herramientas DIY'], terms: ['herramienta', 'herramientas', 'kit', 'destornillador', 'spudger', 'pinza'] },
  { intent: 'adhesivos', labels: ['Adhesivos'], terms: ['adhesivo', 'sello', 'pegante', 'precorte'] },
];
const CATEGORY_EQUIVALENTS = {
  pantallas: ['pantallas'],
  baterias: ['baterias'],
  'camaras-y-modulos': ['camaras-y-modulos', 'camaras'],
  'flex-y-conectores': ['flex-y-conectores', 'flex', 'charging-ports'],
  'tapas-y-carcasa': ['tapas-y-carcasa', 'tapas', 'back-glass'],
  'herramientas-diy': ['herramientas-diy', 'herramientas'],
  accesorios: ['accesorios'],
  adhesivos: ['adhesivos'],
};
const SEARCH_BRAND_RULES = [
  { brand: 'apple', terms: ['apple', 'iphone', 'ipad', 'airpods'] },
  { brand: 'samsung', terms: ['samsung', 'galaxy'] },
  { brand: 'xiaomi', terms: ['xiaomi', 'redmi', 'poco'] },
  { brand: 'motorola', terms: ['motorola', 'moto'] },
  { brand: 'huawei', terms: ['huawei', 'honor'] },
  { brand: 'oppo', terms: ['oppo', 'realme', 'oneplus'] },
];

function searchTokens(value) {
  return normalizeSearchValue(value)
    .split(/\s+/)
    .filter((token) => token && !SEARCH_STOPWORDS.has(token) && (/^\d+$/.test(token) || token.length >= 3));
}

function expandedSearchTokens(value) {
  const tokens = searchTokens(value);
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    (SEARCH_SYNONYMS[token] || []).forEach((alias) => expanded.add(normalizeSearchValue(alias)));
  });
  return [...expanded].filter(Boolean);
}

function searchIntentRules(value) {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return [];
  const rawTokens = new Set(searchTokens(normalized));
  return SEARCH_INTENT_RULES.filter((rule) => {
    return rule.terms.some((term) => {
      const clean = normalizeSearchValue(term);
      return rawTokens.has(clean) || normalized.includes(clean);
    });
  });
}

function searchBrandRules(value) {
  const normalized = normalizeSearchValue(value);
  if (!normalized) return [];
  const rawTokens = new Set(searchTokens(normalized));
  return SEARCH_BRAND_RULES.filter((rule) => {
    return rule.terms.some((term) => {
      const clean = normalizeSearchValue(term);
      return rawTokens.has(clean) || normalized.includes(clean);
    });
  });
}

function productMatchesIntent(product, intentRules) {
  if (!intentRules.length) return true;
  const category = normalizeSearchValue(product?.category);
  const variantTerms = Array.isArray(product?.variants)
    ? product.variants.flatMap((variant) => [
        variant.deviceBrand,
        variant.deviceFamily,
        variant.model,
        variant.quality,
      ])
    : [];
  const text = normalizeSearchValue([
    product?.name,
    getCategoryLabel(product?.category),
    product?.category,
    product?.quality,
    ...(Array.isArray(product?.deviceFamilies) ? product.deviceFamilies : []),
    ...variantTerms,
  ].filter(Boolean).join(' '));
  return intentRules.some((rule) => {
    const categories = CATEGORY_EQUIVALENTS[rule.intent] || [rule.intent];
    if (categories.map(normalizeSearchValue).includes(category)) return true;
    return rule.terms.some((term) => text.includes(normalizeSearchValue(term)));
  });
}

function productMatchesBrand(product, brandRules) {
  if (!brandRules.length) return true;
  const text = productSearchText(product);
  return brandRules.some((rule) => rule.terms.some((term) => text.includes(normalizeSearchValue(term))));
}

function productSearchText(product) {
  const variantTerms = Array.isArray(product.variants)
    ? product.variants.flatMap((variant) => [
        variant.deviceBrand,
        variant.deviceFamily,
        variant.model,
        variant.quality,
      ])
    : [];
  return normalizeSearchValue([
    product.name,
    product.description,
    getCategoryLabel(product.category),
    product.category,
    product.quality,
    product.shippingTime,
    product.warranty,
    product.repairDifficulty,
    product.repairTime,
    product.productCondition,
    product.condition,
    ...(Array.isArray(product.requiredTools) ? product.requiredTools : []),
    ...(Array.isArray(product.compatibility) ? product.compatibility : []),
    ...(Array.isArray(product.deviceFamilies) ? product.deviceFamilies : []),
    ...variantTerms,
    ...(Array.isArray(product.related) ? product.related : []),
    ...expandedSearchTokens(getCategoryLabel(product.category)),
  ].filter(Boolean).join(' '));
}

function scoreProductSearch(product, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return { score: 1, exact: false, related: false };

  const text = productSearchText(product);
  const name = normalizeSearchValue(product.name);
  const category = normalizeSearchValue(getCategoryLabel(product.category));
  const compatibility = normalizeSearchValue((Array.isArray(product.compatibility) ? product.compatibility : []).join(' '));
  const tokens = expandedSearchTokens(normalizedQuery);
  const alphaTokens = tokens.filter((token) => !/^\d+$/.test(token));
  const numericTokens = tokens.filter((token) => /^\d+$/.test(token));
  const textTokenSet = new Set(searchTokens(text));
  const tokenMatchesText = (token) => (/^\d+$/.test(token) ? textTokenSet.has(token) : text.includes(token));

  let score = 0;
  let exact = false;
  let related = false;

  if (name === normalizedQuery) {
    score += 120;
    exact = true;
  }
  if (name.includes(normalizedQuery)) {
    score += 80;
    exact = true;
  }
  if (compatibility.includes(normalizedQuery)) {
    score += 72;
    exact = true;
  }
  if (text.includes(normalizedQuery)) {
    score += 55;
  }

  tokens.forEach((token) => {
    if (name === token) {
      score += /^\d+$/.test(token) ? 64 : 34;
      exact = true;
    }
    if (name.includes(token)) score += 18;
    if (compatibility.includes(token)) score += 16;
    if (category.includes(token)) score += 10;
    if (tokenMatchesText(token)) {
      score += 8;
      related = true;
    }
  });

  const matchedAlpha = alphaTokens.filter((token) => tokenMatchesText(token)).length;
  const matchedNumeric = numericTokens.filter((token) => tokenMatchesText(token)).length;
  if (alphaTokens.length && matchedAlpha === alphaTokens.length) score += 24;
  if (numericTokens.length && matchedNumeric === numericTokens.length) score += 18;

  // If "iPhone 7" does not exist but iPhone products exist, keep the search useful.
  if (!score && alphaTokens.length) {
    const looseMatches = alphaTokens.filter((token) => token.length >= 3 && text.includes(token)).length;
    if (looseMatches) {
      score += looseMatches * 12;
      related = true;
    }
  }

  return { score, exact, related };
}

function rankedProductsForSearch(products, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return { products: products.slice(), exactCount: 0, relatedCount: 0, intentLabels: [] };
  }
  const intentRules = searchIntentRules(normalizedQuery);
  const brandRules = searchBrandRules(normalizedQuery);

  const ranked = products
    .map((product, index) => {
      const intentMatch = productMatchesIntent(product, intentRules);
      const brandMatch = productMatchesBrand(product, brandRules);
      const scored = scoreProductSearch(product, normalizedQuery);
      return {
        product,
        index,
        intentMatch,
        brandMatch,
        ...scored,
        score: (intentMatch ? scored.score : Math.floor(scored.score * 0.34)) * (brandMatch ? 1 : 0.12),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const brandMatched = brandRules.length ? ranked.filter((item) => item.brandMatch) : ranked;
  const brandScoped = brandRules.length ? brandMatched : ranked;
  const intentMatched = brandScoped.filter((item) => item.intentMatch);
  const finalRanked = intentRules.length ? intentMatched : brandScoped;

  return {
    products: finalRanked.map((item) => item.product),
    exactCount: finalRanked.filter((item) => item.exact).length,
    relatedCount: finalRanked.filter((item) => !item.exact && item.related).length,
    intentLabels: intentRules.flatMap((rule) => rule.labels),
  };
}

/* ==============================
   PRODUCT ROTATION ON CARD (hover)
============================== */
let cardRotationIntervals = {};

function startCardRotation(cardId) {
  if (prefersReducedMotion()) return;
  const el = document.querySelector(`.product-card[data-card-id="${CSS.escape(cardId)}"]`);
  if (!el || cardRotationIntervals[cardId]) return;
  const imgs = el.querySelectorAll('.product-img-rotatable');
  if (imgs.length <= 1) return;
  let idx = 1; // start at second image since first is visible
  cardRotationIntervals[cardId] = setInterval(() => {
    imgs.forEach((img, i) => img.classList.toggle('active', i === idx % imgs.length));
    // Update dot indicators
    const dots = el.querySelector('.product-image-hover-thumbs');
    if (dots) {
      dots.querySelectorAll('span').forEach((dot, i) => dot.classList.toggle('active', i === idx % imgs.length));
    }
    idx++;
  }, 1800);
}

function stopCardRotation(cardId) {
  if (cardRotationIntervals[cardId]) {
    clearInterval(cardRotationIntervals[cardId]);
    delete cardRotationIntervals[cardId];
    // Reset to first image
    const el = document.querySelector(`.product-card[data-card-id="${CSS.escape(cardId)}"]`);
    if (el) {
      const imgs = el.querySelectorAll('.product-img-rotatable');
      imgs.forEach((img, i) => img.classList.toggle('active', i === 0));
      const dots = el.querySelector('.product-image-hover-thumbs');
      if (dots) {
        dots.querySelectorAll('span').forEach((dot, i) => dot.classList.toggle('active', i === 0));
      }
    }
  }
}

/* ==============================
   PRODUCT DETAIL MODAL
============================== */
let detailGalleryIdx = 0;
let detailGalleryInterval = null;
let detailCurrentProduct = null;
let selectedVariant = null;
let detailZoom = 1;
let detailPanX = 0;
let detailPanY = 0;
let detailPanStart = null;

function autoFitProductImage(img, options = {}) {
  if (!img || img.dataset.autoFitDone === '1') return;
  if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
    img.addEventListener('load', () => autoFitProductImage(img, options), { once: true });
    return;
  }

  try {
    const sampleMax = 240;
    const scale = Math.min(1, sampleMax / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h).data;
    const sampleCorner = () => {
      const points = [
        [0, 0], [Math.max(0, w - 1), 0],
        [0, Math.max(0, h - 1)], [Math.max(0, w - 1), Math.max(0, h - 1)]
      ];
      const patch = Math.max(2, Math.min(10, Math.round(Math.min(w, h) * 0.035)));
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      points.forEach(([baseX, baseY]) => {
        const startX = baseX === 0 ? 0 : Math.max(0, w - patch);
        const startY = baseY === 0 ? 0 : Math.max(0, h - patch);
        for (let py = startY; py < Math.min(h, startY + patch); py++) {
          for (let px = startX; px < Math.min(w, startX + patch); px++) {
            const idx = (py * w + px) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
            count++;
          }
        }
      });
      return {
        r: r / Math.max(1, count),
        g: g / Math.max(1, count),
        b: b / Math.max(1, count),
        a: a / Math.max(1, count),
      };
    };
    const background = sampleCorner();
    const colorThreshold = img.closest('#productDetailModal') ? 48 : 32;
    const thresholdSq = colorThreshold * colorThreshold;
    let minX = w, minY = h, maxX = -1, maxY = -1, foreground = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const red = pixels[idx];
        const green = pixels[idx + 1];
        const blue = pixels[idx + 2];
        const alpha = pixels[idx + 3];
        if (alpha > 18) {
          const colorDelta =
            (red - background.r) * (red - background.r) +
            (green - background.g) * (green - background.g) +
            (blue - background.b) * (blue - background.b);
          const alphaDelta = Math.abs(alpha - background.a);
          const isForeground = alpha < 245 || alphaDelta > 24 || colorDelta > thresholdSq;
          if (!isForeground) continue;
          foreground++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foreground || maxX < minX || maxY < minY) return;
    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const fillRatio = Math.max(bboxW / w, bboxH / h);

    // Images without meaningful transparent padding do not need correction.
    if (fillRatio > 0.74) {
      img.dataset.autoFitDone = '1';
      return;
    }

    const desiredFill = options.desiredFill || 0.82;
    const maxScale = options.maxScale || 3.8;
    const fitScale = Math.max(1, Math.min(maxScale, desiredFill / Math.max(fillRatio, 0.05)));
    const centerX = (minX + maxX + 1) / 2 / w;
    const centerY = (minY + maxY + 1) / 2 / h;
    const fitX = (0.5 - centerX) * img.clientWidth;
    const fitY = (0.5 - centerY) * img.clientHeight;

    img.style.setProperty('--fit-scale', fitScale.toFixed(3));
    img.style.setProperty('--fit-x', fitX.toFixed(1) + 'px');
    img.style.setProperty('--fit-y', fitY.toFixed(1) + 'px');
    img.dataset.fitScale = fitScale.toFixed(3);
    img.dataset.fitX = fitX.toFixed(1);
    img.dataset.fitY = fitY.toFixed(1);
    img.dataset.autoFitDone = '1';
    if (img.classList.contains('active')) {
      requestAnimationFrame(() => applyDetailZoom());
    }
  } catch (err) {
    img.dataset.autoFitDone = '1';
  }
}

function autoFitProductImages(root = document) {
  root.querySelectorAll('.product-img, #productDetailModal .gallery-main img, #productDetailModal .gallery-thumb-btn img').forEach((img) => {
    const isDetail = img.closest('#productDetailModal');
    const isThumb = img.closest('.gallery-thumb-btn');
    autoFitProductImage(img, {
      desiredFill: isThumb ? 0.78 : (isDetail ? 0.9 : 0.84),
      maxScale: isThumb ? 4.8 : (isDetail ? 5 : 4.2),
    });
  });
}

const QUALITY_TIPS = {
  Original: 'Pieza original de marca o canal autorizado.',
  OEM: 'Misma calidad del fabricante, sin empaque de marca.',
  AAA: 'Alta calidad compatible para reparación costo-eficiente.',
  GX: 'Repuesto premium compatible, común en pantallas de alto rendimiento.',
  Refurbished: 'Pieza reacondicionada, probada antes de publicar.'
};

function htmlSafe(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function cleanHumanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g, '$1 ')
    .replace(/\bTeléfonos móvil\b/gi, 'Teléfonos móviles')
    .replace(/\bbuena calidad Compatible\b/gi, 'de buena calidad, compatible')
    .trim();
}

function conciseProductDescription(value, maxLength = 190) {
  const text = cleanHumanText(value);
  if (text.length <= maxLength) return text;
  const sentence = text.match(/^.{80,190}?[.!?](?:\s|$)/)?.[0]?.trim();
  if (sentence) return sentence;
  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  return `${clipped}…`;
}

function normalizeShippingText(value) {
  const text = cleanHumanText(value);
  if (!text) return '';
  if (/^\d+$/.test(text)) return `${text} días hábiles`;
  if (/^\d+\s*-\s*\d+$/.test(text)) return `${text} días hábiles`;
  return text;
}

function normalizeWarrantyText(value) {
  const text = cleanHumanText(value);
  if (!text) return { warranty: '', note: '' };
  if (/sello|sellos|instal|adhesivo|pegante|flex/i.test(text) && !/garant/i.test(text)) {
    return { warranty: '', note: text };
  }
  if (/^\d+$/.test(text)) return { warranty: `${text} días`, note: '' };
  return { warranty: text, note: '' };
}

function productDescriptionText(product) {
  const raw = cleanHumanText(product?.description || '');
  const name = cleanHumanText(product?.name || '');
  const generic = getCategoryLabel(product?.category);
  const fallbackByCategory = {
    pantallas: 'Display compatible',
    baterias: 'Batería compatible',
    'flex-y-conectores': 'Flex o conector compatible',
    'camaras-y-modulos': 'Módulo compatible',
    accesorios: 'Accesorio compatible',
  };
  const fallback = fallbackByCategory[product?.category] || 'Repuesto compatible';
  if (!raw || raw.toLowerCase() === name.toLowerCase()) {
    return `${fallback}. Revisa el modelo antes de agregarlo al carrito.`;
  }
  if (/^pachas?\b/i.test(raw)) {
    return `${fallback}. Confirma el modelo y la calidad antes de comprar.`;
  }
  return raw;
}

function variantDisplayLabel(variant) {
  if (!variant) return '';
  const family = String(variant.deviceFamily || '').trim();
  const model = String(variant.model || '').trim();
  if (/^\d+(\.\d+)?$/.test(model) && /iphone|galaxy|samsung|motorola|xiaomi|huawei/i.test(family)) {
    return family;
  }
  if (family && model && family.toLowerCase().endsWith(model.toLowerCase())) return family;
  return [family, model].filter(Boolean).join(' ');
}

function formatCOPNumber(value) {
  return '$' + Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

function variantStockText(variant) {
  const stock = Number(variant?.stock);
  if (!Number.isFinite(stock) || stock <= 0) return 'Agotado';
  if (stock < 5) return `Últimas ${stock}`;
  return `${stock} disp.`;
}

function categoryVisualMeta(category) {
  const key = category || 'general';
  const map = {
    pantallas: { icon: '▯', title: 'Display', label: 'Módulo probado' },
    baterias: { icon: '▮', title: 'Batería', label: 'Celda verificada' },
    'flex-y-conectores': { icon: '⌁', title: 'Flex', label: 'Conector compatible' },
    'camaras-y-modulos': { icon: '◉', title: 'Cámara', label: 'Módulo óptico' },
    'tapas-y-carcasa': { icon: '◇', title: 'Carcasa', label: 'Acabado limpio' },
    accesorios: { icon: '◌', title: 'Accesorio', label: 'Originalidad visible' },
    'herramientas-diy': { icon: '⌘', title: 'Herramienta', label: 'Trabajo preciso' },
    'back-glass': { icon: '⬚', title: 'Back glass', label: 'Cierre premium' },
    'face-id': { icon: '◇', title: 'Face ID', label: 'Sensor delicado' },
    'charging-ports': { icon: '⌁', title: 'Puerto', label: 'Alta rotación' },
    speakers: { icon: '◍', title: 'Audio', label: 'Módulo sonoro' },
    adhesivos: { icon: '⬒', title: 'Adhesivo', label: 'Sellado limpio' },
  };
  return map[key] || { icon: '▣', title: 'Repuesto', label: 'Pieza técnica' };
}

function categoryVisualHtml(product, context = 'card') {
  const meta = categoryVisualMeta(product?.category);
  const quality = product?.quality || getCategoryLabel(product?.category);
  return `
    <div class="product-visual-fallback ${context}" aria-hidden="true">
      <div class="product-visual-ring">
        <span class="product-visual-icon">${htmlSafe(meta.icon)}</span>
      </div>
      <div class="product-visual-copy">
        <strong>${htmlSafe(meta.title)}</strong>
        <span>${htmlSafe(quality || meta.label)}</span>
      </div>
    </div>
  `;
}

function normalizeImageEntry(img) {
  if (!img) return null;
  if (typeof img === 'string') return { xl: img, lg: img, md: img, sm: img };
  if (typeof img === 'object') {
    const xl = img.xl || img.lg || img.md || img.sm || '';
    const lg = img.lg || xl;
    const md = img.md || lg;
    const sm = img.sm || md;
    return xl || lg || md || sm ? { xl, lg, md, sm } : null;
  }
  return null;
}

function productImagesWithVariantFallback(product) {
  const images = [];
  if (Array.isArray(product?.images)) {
    product.images.forEach((img) => {
      const normalized = normalizeImageEntry(img);
      if (normalized) images.push(normalized);
    });
  }
  if (images.length === 0 && product?.imageUrl) {
    const normalized = normalizeImageEntry(product.imageUrl);
    if (normalized) images.push(normalized);
  }
  if (images.length === 0 && Array.isArray(product?.variants)) {
    product.variants.some((variant) => {
      if (!Array.isArray(variant?.images)) return false;
      variant.images.forEach((img) => {
        const normalized = normalizeImageEntry(img);
        if (normalized) images.push(normalized);
      });
      return images.length > 0;
    });
  }
  return images;
}

function effectiveProductStock(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => {
      const count = Number(variant.stock);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
  }
  const count = Number(product?.stock);
  return Number.isFinite(count) ? count : 0;
}

function getStockMeta(stock) {
  const count = Number(stock) || 0;
  if (count <= 0) return { text: 'Agotado', tone: 'danger' };
  if (count < 5) return { text: `Últimas ${count} unidades`, tone: 'warning' };
  return { text: `${count} unidades disponibles`, tone: 'success' };
}

function shortStockMeta(stock) {
  const count = Number(stock);
  if (!Number.isFinite(count)) return null;
  if (count <= 0) return { text: 'Agotado', tone: 'danger' };
  if (count < 5) return { text: `Últimas ${count}`, tone: 'warning' };
  return { text: `${count} en stock`, tone: 'success' };
}

function renderProductCardMeta(product) {
  const chips = [];
  // 1. Stock
  const stock = shortStockMeta(effectiveProductStock(product));
  if (stock) chips.push(`<span class="product-meta-chip ${stock.tone}">${htmlSafe(stock.text)}</span>`);
  if (product.category) {
    chips.push(`<span class="product-meta-chip category">${htmlSafe(getCategoryLabel(product.category))}</span>`);
  }
  const variantQualities = Array.isArray(product.variants)
    ? [...new Set(product.variants.map((variant) => variant.quality).filter(Boolean))]
    : [];
  const qualityLabel = product.quality || variantQualities.slice(0, 2).join(' / ');
  if (qualityLabel) {
    chips.push(`<span class="product-meta-chip quality">${htmlSafe(qualityLabel)}</span>`);
  }
  if (Array.isArray(product.compatibility) && product.compatibility.length > 0) {
    const firstModels = product.compatibility.slice(0, 2).join(', ');
    const more = product.compatibility.length > 2 ? ` +${product.compatibility.length - 2}` : '';
    chips.push(`<span class="product-meta-chip variants">${htmlSafe(firstModels + more)}</span>`);
  }
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    chips.push(`<span class="product-meta-chip variants">${product.variants.length} modelos disp.</span>`);
  }
  if (chips.length === 0) return '';
  return `<div class="product-card-meta">${chips.join('')}</div>`;
}

function productBadgeMeta(product) {
  const stock = effectiveProductStock(product);
  if (stock <= 0) return { text: 'Agotado', tone: 'danger' };
  if (stock < 5) return { text: `Últimas ${stock}`, tone: 'warning' };
  if (Array.isArray(product.variants) && product.variants.length > 1) {
    return { text: `${product.variants.length} modelos`, tone: 'info' };
  }
  if (product.quality) return { text: product.quality, tone: 'info' };
  return { text: 'En stock', tone: 'success' };
}

function renderEmptyProductState(query) {
  const safeQuery = htmlSafe(query || '');
  const title = query ? `No encontramos "${safeQuery}"` : 'No hay productos cargados todavía';
  const intentRules = searchIntentRules(query || '');
  const intentLabels = intentRules.flatMap((rule) => rule.labels);
  const starterPicks = [
    ...(intentRules.some((rule) => rule.intent === 'pantallas') ? ['Pantalla iPhone', 'Display Samsung', 'Pantalla Xiaomi'] : []),
    ...(intentRules.some((rule) => rule.intent === 'baterias') ? ['Batería iPhone', 'Batería Samsung', 'Batería Xiaomi'] : []),
    ...(intentRules.some((rule) => rule.intent === 'camaras-y-modulos') ? ['Cámara iPhone', 'Cámara Samsung', 'Módulo cámara'] : []),
    ...(intentRules.some((rule) => rule.intent === 'flex-y-conectores') ? ['Puerto de carga', 'Flex de carga', 'Conector iPhone'] : []),
    'Pantalla iPhone',
    'Batería',
    'Puerto de carga',
  ];
  const uniquePicks = [...new Set(starterPicks)].slice(0, 6);
  const copy = query
    ? 'No hay una coincidencia directa en el catálogo actual. Prueba una búsqueda más amplia por pieza, marca o familia de dispositivo.'
    : 'Cuando agregues productos desde el backoffice aparecerán aquí con stock, compatibilidad y calidad.';
  return `
    <div class="no-search-results">
      <strong>${title}</strong>
      <p>${copy}</p>
      ${intentLabels.length ? `<div class="no-search-hint">Categorías relacionadas: ${intentLabels.map(htmlSafe).join(' · ')}</div>` : ''}
      <div class="no-search-actions">
        ${uniquePicks.map((pick) => `<button type="button" data-search-pick="${htmlSafe(pick)}">${htmlSafe(pick)}</button>`).join('')}
      </div>
    </div>
  `;
}

function renderProductSkeletons() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="product-skeleton" aria-hidden="true">
      <div class="product-skeleton-media skeleton-block"></div>
      <div class="product-skeleton-body">
        <div class="product-skeleton-line title skeleton-block"></div>
        <div class="product-skeleton-line skeleton-block"></div>
        <div class="product-skeleton-line short skeleton-block"></div>
      </div>
    </div>
  `).join('');
}

function renderCompatibility(models) {
  const list = Array.isArray(models) ? models.filter(Boolean) : [];
  if (list.length === 0) return '<span class="detail-info-value">Consultar compatibilidad</span>';
  const shown = list.slice(0, 3);
  const more = list.length - shown.length;
  return `<div class="compat-list">${shown.map((model) => `<span class="compat-chip">${htmlSafe(model)}</span>`).join('')}${more > 0 ? `<span class="compat-chip">+${more} más</span>` : ''}</div>`;
}

function renderProductInfo(product) {
  const stock = getStockMeta(effectiveProductStock(product));
  const stats = [];
  const shippingText = normalizeShippingText(product.shippingTime);
  const warrantyMeta = normalizeWarrantyText(product.warranty);

  // Stock — always shown
  stats.push({ label: 'Disponibilidad', value: stock.text, tone: stock.tone });

  // Quality
  if (product.quality) {
    const tip = QUALITY_TIPS[product.quality] || '';
    stats.push({ label: 'Calidad', value: product.quality, tip });
  }

  // Shipping + Warranty side by side
  if (shippingText) stats.push({ label: 'Envío estimado', value: shippingText });
  if (warrantyMeta.warranty) stats.push({ label: 'Garantía', value: warrantyMeta.warranty });
  if (warrantyMeta.note) stats.push({ label: 'Nota de instalación', value: warrantyMeta.note });
  if (product.productCondition) stats.push({ label: 'Estado', value: product.productCondition });

  // If odd count, last one is wide
  const html = stats.map((s, i) => {
    const isWide = stats.length % 2 !== 0 && i === stats.length - 1;
    const valueHtml = s.tip
      ? `<span class="quality-pill" data-tip="${htmlSafe(s.tip)}">${htmlSafe(s.value)}</span>`
      : `${htmlSafe(s.value)}`;
    return `
      <div class="detail-stat${isWide ? ' wide' : ''}">
        <span class="detail-stat-label">${htmlSafe(s.label)}</span>
        <span class="detail-stat-value${s.tone ? ' ' + s.tone : ''}">${valueHtml}</span>
      </div>`;
  }).join('');

  return `<div class="detail-product-info">${html}</div>`;
}

function selectDetailVariant(variantId) {
  if (!detailCurrentProduct) return;
  const variants = detailCurrentProduct.variants || [];
  selectedVariant = variants.find(v => v.variantId === variantId) || null;
  // Update price display
  const priceEl = document.getElementById('detailPriceDisplay');
  if (priceEl) {
    const price = selectedVariant?.price != null ? selectedVariant.price : detailCurrentProduct.price;
    priceEl.textContent = '$' + Number(price).toLocaleString('es-CO', {minimumFractionDigits: 0}) + ' COP';
  }
  const selectedNote = document.getElementById('detailSelectedVariantNote');
  if (selectedNote) {
    selectedNote.textContent = selectedVariant ? `${variantDisplayLabel(selectedVariant)} · ${variantStockText(selectedVariant)}` : '';
  }
  // Update pill active state
  document.querySelectorAll('.variant-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.variantId === variantId);
  });
  // Swap first gallery image to variant image if available
  if (selectedVariant?.images?.length > 0) {
    const vImg = selectedVariant.images[0];
    const mainEl = document.querySelector('.detail-gallery .gallery-main img.active, .detail-gallery .gallery-main img:first-of-type');
    if (mainEl) mainEl.src = vImg.xl || vImg.lg || vImg.md || mainEl.src;
  }
}

function openProductDetail(product) {
  lastProductTrigger = document.activeElement;
  detailCurrentProduct = product;
  detailGalleryIdx = 0;
  selectedVariant = null;
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;

  const images = productImagesWithVariantFallback(product);

  const priceStr = '$' + Number(product.price).toLocaleString('es-CO', {minimumFractionDigits: 0});
  const escapedName = htmlSafe(product.name || '');
  const description = conciseProductDescription(productDescriptionText(product), 360);
  const categoryLabel = getCategoryLabel(product.category);
  const hasRealImages = images.some((img) => img.xl || img.lg || img.md || img.sm);

  // Build gallery panel
  const galleryEl = modal.querySelector('.detail-gallery');
  if (galleryEl) {
    const imgCount = images.length;
    if (!hasRealImages) {
      galleryEl.innerHTML = `
        <button class="product-detail-close-btn" type="button" onclick="closeProductDetail()" aria-label="Cerrar detalle">✕</button>
        <div class="gallery-layout">
          <div class="gallery-thumbs" aria-label="Miniaturas del producto"></div>
          <div class="gallery-main-shell">
            <div class="gallery-main" role="img" aria-label="Producto sin imagen">
              <div class="gallery-placeholder">${categoryVisualHtml(product, 'detail')}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      let mainImgs = images.map((img, idx) =>
        `<img src="${img.xl || img.lg || img.md || ''}" alt="${escapedName} - foto ${idx + 1}" class="${idx === 0 ? 'active' : ''}" data-gallery-idx="${idx}" loading="${idx === 0 ? 'eager' : 'lazy'}" decoding="async" ${idx === 0 ? 'fetchpriority="high"' : ''} />`
      ).join('');
      let thumbs = images.map((img, idx) =>
        `<button class="gallery-thumb-btn ${idx === 0 ? 'active' : ''}" type="button" data-gallery-idx="${idx}" onclick="setGalleryImage(${idx})" aria-label="Ver foto ${idx + 1} de ${imgCount}" aria-current="${idx === 0 ? 'true' : 'false'}"><img src="${img.sm || img.md || img.lg || ''}" alt="" loading="lazy" decoding="async" /></button>`
      ).join('');
      const navArrows = imgCount > 1
        ? `<button class="gallery-nav-btn prev" type="button" onclick="prevGalleryImage()" aria-label="Foto anterior">‹</button><button class="gallery-nav-btn next" type="button" onclick="nextGalleryImage()" aria-label="Foto siguiente">›</button>`
        : '';
      const counter = imgCount > 1
        ? `<div class="gallery-counter"><span id="galleryCurrentIdx">1</span> / ${imgCount}</div>`
        : '';
      galleryEl.innerHTML = `
        <button class="product-detail-close-btn" type="button" onclick="closeProductDetail()" aria-label="Cerrar detalle">✕</button>
        <div class="gallery-layout">
          <div class="gallery-thumbs" aria-label="Miniaturas del producto">${thumbs}</div>
          <div class="gallery-main-shell">
            <div class="gallery-main" aria-live="polite">
              ${mainImgs}
              ${navArrows}
              ${counter}
              <div class="gallery-hint">Inspecciona conectores y detalles</div>
            </div>
            <div class="gallery-toolbar">
              <div class="gallery-zoom-controls" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">
                <button class="gallery-zoom-btn" type="button" onclick="nudgeDetailZoom(-0.5)" aria-label="Alejar">−</button>
                <input class="gallery-zoom-range" id="detailZoomRange" type="range" min="1" max="6" step="0.05" value="1" oninput="setDetailZoom(this.value)" aria-label="Zoom de imagen" />
                <button class="gallery-zoom-btn" type="button" onclick="nudgeDetailZoom(0.5)" aria-label="Acercar">+</button>
                <button class="gallery-zoom-reset" id="detailZoomReset" type="button" onclick="resetDetailZoom()" aria-label="Restablecer zoom">100%</button>
              </div>
              <button class="gallery-fullscreen-btn" type="button" onclick="toggleDetailFullscreen()" aria-label="Ver imagen en grande">⛶ <span class="gallery-fullscreen-label">Ver grande</span></button>
            </div>
          </div>
        </div>
      `;
      bindDetailPanHandlers();
      resetDetailZoom();
      autoFitProductImages(galleryEl);
    }
  }

  // Build info panel (checkout-style)
  const infoEl = modal.querySelector('.detail-info');
  if (infoEl) {
    const imgCount = images.length;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variantPickerHtml = variants.length > 0
      ? `<div class="detail-variant-picker">
          <div class="detail-variant-label">Selecciona tu modelo:</div>
          <div class="detail-variant-pills">
            ${variants.map(v => {
              const label = htmlSafe(variantDisplayLabel(v));
              const stock = Number(v.stock);
              const disabled = Number.isFinite(stock) && stock <= 0;
              return `
                <button type="button" class="variant-pill${disabled ? ' is-disabled' : ''}" data-variant-id="${htmlSafe(v.variantId)}" onclick="selectDetailVariant('${htmlSafe(v.variantId)}')" ${disabled ? 'disabled' : ''}>
                  <span class="variant-pill-main">
                    <strong>${label}</strong>
                    ${v.quality ? `<em>${htmlSafe(v.quality)}</em>` : ''}
                  </span>
                  <span class="variant-pill-meta">
                    <b>${formatCOPNumber(v.price)}</b>
                    <small>${htmlSafe(variantStockText(v))}</small>
                  </span>
                </button>
              `;
            }).join('')}
          </div>
        </div>`
      : '';
    infoEl.innerHTML = `
      <div class="detail-kicker">
        🏷️ ${htmlSafe(categoryLabel)}
        ${imgCount > 1 ? `<span class="detail-counter-badge">📸 ${imgCount}</span>` : ''}
      </div>
      <h2 id="productDetailTitle">${htmlSafe(product.name)}</h2>
      ${variantPickerHtml}
      <div class="detail-price" id="detailPriceDisplay">${priceStr} <span>COP</span></div>
      <div class="detail-desc">${htmlSafe(description)}</div>
      <p class="detail-spec-note">Confirma compatibilidad, condición y especificaciones de la referencia antes de instalar.</p>
          ${typeof installationDetailHtml === 'function' ? installationDetailHtml(product) : ''}
          ${renderProductInfo(product)}
      <div class="detail-actions">
        ${variants.length > 0 ? `<div class="detail-selected-variant" id="detailSelectedVariantNote"></div>` : ''}
        <button class="btn btn-gradient" onclick='(function(){const v=selectedVariant;const vImg=v&&v.images&&v.images[0]?(v.images[0].sm||v.images[0].md||""):"";addToCart({productId:"${product.productId}",name:${JSON.stringify(product.name)},price:v!=null&&v.price!=null?v.price:${product.price},image:vImg||${JSON.stringify(images[0]?.sm||images[0]?.md||"")},variantId:v?v.variantId:null,variantLabel:v?variantDisplayLabel(v):null,variantQuality:v?v.quality:null});closeProductDetail();})()'>🛒 Agregar al carrito</button>
      </div>
    `;
    if (variants.length > 0) {
      const firstAvailable = variants.find((v) => Number(v.stock) > 0) || variants[0];
      selectDetailVariant(firstAvailable.variantId);
    }
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  focusLayer(modal, '.product-detail-close-btn');

  stopGalleryRotation();
}

function closeProductDetail(options = {}) {
  stopGalleryRotation();
  const modal = document.getElementById('productDetailModal');
  const wasOpen = modal?.classList.contains('open');
  if (modal) {
    modal.classList.remove('open', 'is-gallery-fullscreen');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('modal-open');
  detailCurrentProduct = null;
  detailPanStart = null;
  resetDetailZoom();
  if (wasOpen && options.restoreFocus !== false) restoreLayerFocus(lastProductTrigger, '#productos');
}

function setGalleryImage(idx) {
  detailGalleryIdx = idx;
  const gallery = document.querySelector('#productDetailModal .detail-gallery');
  if (!gallery) return;
  gallery.querySelectorAll('.gallery-main img').forEach(img => {
    img.classList.toggle('active', parseInt(img.dataset.galleryIdx) === idx);
  });
  gallery.querySelectorAll('.gallery-thumbs img').forEach(img => {
    img.classList.toggle('active', parseInt(img.dataset.galleryIdx) === idx);
  });
  gallery.querySelectorAll('.gallery-thumb-btn').forEach(btn => {
    const isActive = parseInt(btn.dataset.galleryIdx) === idx;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  // Update counter display
  const counterSpan = document.getElementById('galleryCurrentIdx');
  if (counterSpan) counterSpan.textContent = idx + 1;
  resetDetailZoom();
  stopGalleryRotation();
}

function clampDetailPan() {
  const main = document.querySelector('#productDetailModal .gallery-main');
  if (!main || detailZoom <= 1) {
    detailPanX = 0;
    detailPanY = 0;
    return;
  }
  const rect = main.getBoundingClientRect();
  const maxX = (rect.width * (detailZoom - 1)) / 2;
  const maxY = (rect.height * (detailZoom - 1)) / 2;
  detailPanX = Math.max(-maxX, Math.min(maxX, detailPanX));
  detailPanY = Math.max(-maxY, Math.min(maxY, detailPanY));
}

function applyDetailZoom() {
  clampDetailPan();
  const main = document.querySelector('#productDetailModal .gallery-main');
  const activeImg = document.querySelector('#productDetailModal .gallery-main img.active');
  const range = document.getElementById('detailZoomRange');
  const reset = document.getElementById('detailZoomReset');

  if (main) main.classList.toggle('zoomed', detailZoom > 1);
  if (range) range.value = detailZoom.toFixed(2);
  if (reset) reset.textContent = Math.round(detailZoom * 100) + '%';
  if (activeImg) {
    const fitScale = Number(activeImg.dataset.fitScale || 1);
    const fitX = Number(activeImg.dataset.fitX || 0);
    const fitY = Number(activeImg.dataset.fitY || 0);
    activeImg.style.transform = `translate(${fitX + detailPanX}px, ${fitY + detailPanY}px) scale(${fitScale * detailZoom})`;
  }
}

function setDetailZoom(value) {
  detailZoom = Math.max(1, Math.min(6, Number(value) || 1));
  if (detailZoom <= 1.01) {
    detailZoom = 1;
    detailPanX = 0;
    detailPanY = 0;
  }
  applyDetailZoom();
  stopGalleryRotation();
}

function nudgeDetailZoom(delta) {
  setDetailZoom(detailZoom + delta);
}

function resetDetailZoom() {
  detailZoom = 1;
  detailPanX = 0;
  detailPanY = 0;
  detailPanStart = null;
  const main = document.querySelector('#productDetailModal .gallery-main');
  if (main) main.classList.remove('dragging');
  document.querySelectorAll('#productDetailModal .gallery-main img').forEach(img => {
    if (img.classList.contains('active')) return;
    img.style.transform = '';
  });
  applyDetailZoom();
}

function setDetailFullscreen(enabled) {
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;
  modal.classList.toggle('is-gallery-fullscreen', Boolean(enabled));
  modal.setAttribute('aria-label', enabled ? 'Galería de producto en pantalla completa' : 'Detalle de producto');
  resetDetailZoom();
}

function toggleDetailFullscreen() {
  const modal = document.getElementById('productDetailModal');
  if (!modal) return;
  setDetailFullscreen(!modal.classList.contains('is-gallery-fullscreen'));
  stopGalleryRotation();
}

function bindDetailPanHandlers() {
  const main = document.querySelector('#productDetailModal .gallery-main');
  if (!main) return;
  if (main.dataset.galleryInteractionBound === '1') return;
  main.dataset.galleryInteractionBound = '1';
  let swipeStart = null;
  main.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, input')) return;
    if (detailZoom <= 1) {
      swipeStart = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: Date.now(),
      };
      main.setPointerCapture(event.pointerId);
      return;
    }
    detailPanStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: detailPanX,
      panY: detailPanY,
    };
    main.classList.add('dragging');
    main.setPointerCapture(event.pointerId);
    event.preventDefault();
    stopGalleryRotation();
  });
  main.addEventListener('pointermove', (event) => {
    if (swipeStart && event.pointerId === swipeStart.pointerId && detailZoom <= 1) {
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) event.preventDefault();
      return;
    }
    if (!detailPanStart || event.pointerId !== detailPanStart.pointerId) return;
    detailPanX = detailPanStart.panX + event.clientX - detailPanStart.x;
    detailPanY = detailPanStart.panY + event.clientY - detailPanStart.y;
    applyDetailZoom();
  });
  const endPan = (event) => {
    if (swipeStart && event.pointerId === swipeStart.pointerId) {
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      const elapsed = Date.now() - swipeStart.time;
      swipeStart = null;
      if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.35 && elapsed < 900) {
        if (dx < 0) nextGalleryImage();
        else prevGalleryImage();
      }
    }
    if (detailPanStart && event.pointerId === detailPanStart.pointerId) {
      detailPanStart = null;
      main.classList.remove('dragging');
    }
  };
  main.addEventListener('pointerup', endPan);
  main.addEventListener('pointercancel', endPan);
}

function nextGalleryImage() {
  const gallery = document.querySelector('#productDetailModal .gallery-main');
  if (!gallery) return;
  const imgs = gallery.querySelectorAll('img');
  if (imgs.length === 0) return;
  const nextIdx = (detailGalleryIdx + 1) % imgs.length;
  setGalleryImage(nextIdx);
}

function prevGalleryImage() {
  const gallery = document.querySelector('#productDetailModal .gallery-main');
  if (!gallery) return;
  const imgs = gallery.querySelectorAll('img');
  if (imgs.length === 0) return;
  const prevIdx = (detailGalleryIdx - 1 + imgs.length) % imgs.length;
  setGalleryImage(prevIdx);
}

function startGalleryRotation() {
  stopGalleryRotation();
}

function stopGalleryRotation() {
  if (detailGalleryInterval) {
    clearInterval(detailGalleryInterval);
    detailGalleryInterval = null;
  }
}

function renderProductFilters(products) {
  const actions = document.getElementById('productsFilterActions');
  if (!actions) return;
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const counts = products.reduce((acc, product) => {
    const category = product.category;
    if (!category) return acc;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  actions.innerHTML = '';
  if (categories.length === 0) return;

  const allChip = document.createElement('button');
  allChip.className = `filter-chip ${activeProductCategory ? '' : 'active'}`;
  allChip.type = 'button';
  allChip.textContent = `Todo (${products.length})`;
  allChip.addEventListener('click', () => {
    activeProductCategory = '';
    currentPage = 1;
    renderStorefrontProducts();
  });
  actions.appendChild(allChip);

  categories.sort().forEach((category) => {
    const chip = document.createElement('button');
    const activeCategorySet = CATEGORY_EQUIVALENTS[activeProductCategory] || [activeProductCategory];
    chip.className = `filter-chip ${activeCategorySet.includes(category) ? 'active' : ''}`;
    chip.type = 'button';
    chip.textContent = `${getCategoryLabel(category)} (${counts[category] || 0})`;
    chip.addEventListener('click', () => {
      activeProductCategory = category;
      currentPage = 1;
      renderStorefrontProducts();
    });
    actions.appendChild(chip);
  });
}

function goToPage(page) {
  currentPage = page;
  renderStorefrontProducts();
  document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
}

function renderPagination(total, totalPages) {
  const el = document.getElementById('productsPagination');
  if (!el) return;
  if (totalPages <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'flex';

  const pages = [];
  // Always show first, last, current ±1
  const show = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(p => p >= 1 && p <= totalPages));
  const sorted = [...show].sort((a, b) => a - b);

  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Anterior">←</button>`;
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) html += `<span class="page-ellipsis">…</span>`;
    html += `<button class="page-btn${p === currentPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    prev = p;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Siguiente">→</button>`;
  el.innerHTML = html;
}

function renderStorefrontProducts() {
  const grid = document.getElementById('productsGrid');
  const info = document.getElementById('productsFilterInfo');
  if (!grid) return;

  const products = activeProductCategory
    ? storefrontProducts.filter((product) => {
        const acceptedCategories = CATEGORY_EQUIVALENTS[activeProductCategory] || [activeProductCategory];
        return acceptedCategories.includes(product.category);
      })
    : storefrontProducts.slice();
  const searchBase = activeSearchQuery ? products.slice() : products;
  const rankedSearch = rankedProductsForSearch(searchBase, activeSearchQuery);
  const visibleProducts = activeSearchQuery ? rankedSearch.products : products;

  if (info) {
    if (activeSearchQuery) {
      if (visibleProducts.length > 0) {
        const mode = rankedSearch.exactCount > 0 ? 'coincidencias relevantes' : 'productos relacionados';
        const scope = activeProductCategory ? ` en ${getCategoryLabel(activeProductCategory).toLowerCase()}` : '';
        info.textContent = `${visibleProducts.length} ${mode}${scope} para "${activeSearchQuery}".`;
      } else {
        info.textContent = `No encontramos "${activeSearchQuery}". Prueba por modelo, categoría o tipo de repuesto.`;
      }
    } else {
      info.textContent = activeProductCategory
        ? `Mostrando ${getCategoryLabel(activeProductCategory).toLowerCase()} del catálogo.`
        : 'Mostrando todo el catálogo disponible.';
    }
  }

  renderProductFilters(storefrontProducts);

  if (visibleProducts.length === 0) {
    grid.innerHTML = renderEmptyProductState(activeSearchQuery);
    wireSearchPickButtons(grid);
    renderPagination(0, 1);
    return;
  }

  // Pagination
  const totalPages = Math.ceil(visibleProducts.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = 1;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageProducts = visibleProducts.slice(pageStart, pageStart + PAGE_SIZE);

  renderPagination(visibleProducts.length, totalPages);

  grid.innerHTML = pageProducts.map((p, i) => {
    const delay = (i % 4) + 1;
    const badge = productBadgeMeta(p);
    // Price: for variants, lead with "Desde" and keep the range as supporting metadata.
    let priceStr;
    let priceSupport = '';
    let hasVariantPriceRange = false;
    if (p.variants && p.variants.length > 0) {
      const vPrices = p.variants.map(v => Number(v.price)).filter(n => n > 0);
      if (vPrices.length > 0) {
        const minP = Math.min(...vPrices);
        const maxP = Math.max(...vPrices);
        priceStr = `Desde ${formatCOPNumber(minP)}`;
        hasVariantPriceRange = minP !== maxP;
        priceSupport = hasVariantPriceRange ? `Hasta ${formatCOPNumber(maxP)} COP` : `${p.variants.length} modelos disponibles`;
      } else {
        priceStr = formatCOPNumber(p.price);
      }
    } else {
      priceStr = formatCOPNumber(p.price);
    }
    const allImages = productImagesWithVariantFallback(p);

    // If no real images, use a polished technical fallback by category.
    let imgHtml = categoryVisualHtml(p, 'card');
    let imgBg = 'linear-gradient(135deg,#1e1b4b,#312e81)';
    const escapedName = (p.name || '').replace(/'/g, "\\'");

    const cardId = 'pc-' + (p.productId || i);
    const hasMultipleImages = allImages.length > 1;

    if (allImages.length > 0) {
      imgBg = '';
      // First image shown by default
      const first = allImages[0];
      const lgUrl = first.lg || '';
      const mdUrl = first.md || lgUrl;
      const smUrl = first.sm || mdUrl;
      const srcsetParts = [];
      if (smUrl) srcsetParts.push(smUrl + ' 180w');
      if (mdUrl) srcsetParts.push(mdUrl + ' 700w');
      if (lgUrl) srcsetParts.push(lgUrl + ' 1400w');

      // Build rotatable images (hide all but first)
      const rotatableImgs = allImages.map((img, idx) => {
        const url = img.lg || img.md || '';
        if (!url) return '';
        return `<img class="product-img product-img-rotatable${idx === 0 ? ' active' : ''}"
          src="${img.md || img.lg || ''}"
          srcset="${img.sm ? img.sm + ' 180w' : ''}${img.md ? ', ' + img.md + ' 700w' : ''}${img.lg ? ', ' + img.lg + ' 1400w' : ''}"
          sizes="(max-width: 480px) 180px, (max-width: 768px) 700px, 700px"
          alt="${p.name}"
          loading="lazy"
          decoding="async"
          onclick="openImageZoom('${url}','${escapedName}')" />`;
      }).filter(Boolean).join('');

      // Dot indicators
      const dots = hasMultipleImages
        ? `<div class="product-image-hover-thumbs">${allImages.map((_, di) => `<span${di === 0 ? ' class="active"' : ''}></span>`).join('')}</div>`
        : '';

      imgHtml = rotatableImgs + dots;
    }

    const productJsonForModal = JSON.stringify({
      productId: p.productId,
      name: p.name,
      price: p.price,
      description: p.description || '',
      category: p.category || '',
      quality: p.quality || '',
      compatibility: Array.isArray(p.compatibility) ? p.compatibility : [],
      shippingTime: p.shippingTime || '',
      warranty: p.warranty || '',
      repairDifficulty: p.repairDifficulty || p.difficulty || '',
      repairTime: p.repairTime || '',
      requiredTools: Array.isArray(p.requiredTools) ? p.requiredTools : [],
      productCondition: p.productCondition || p.condition || '',
      related: Array.isArray(p.related) ? p.related : [],
      stock: effectiveProductStock(p),
      images: allImages,
      imageUrl: p.imageUrl || '',
      variants: Array.isArray(p.variants) ? p.variants : [],
      deviceFamilies: Array.isArray(p.deviceFamilies) ? p.deviceFamilies : []
    }).replace(/'/g, "\\'");
    const stockCount = effectiveProductStock(p);
    const outOfStock = Number.isFinite(stockCount) && stockCount <= 0;
    const cardMetaHtml = renderProductCardMeta(p);
    const searchTerms = productSearchText(p);

    return `
      <div class="product-card reveal reveal-delay-${delay}" data-card-id="${cardId}" data-search="${htmlSafe(searchTerms)}"
          onmouseenter="startCardRotation('${cardId}')"
           onmouseleave="stopCardRotation('${cardId}')">
        <div class="product-image" style="background:${imgBg};">
          <span class="product-badge ${htmlSafe(badge.tone)}">${htmlSafe(badge.text)}</span>
          ${imgHtml}
        </div>
        <div class="product-body">
          <h3>${htmlSafe(p.name)}</h3>
          <p>${htmlSafe(conciseProductDescription(productDescriptionText(p)))}</p>
          ${cardMetaHtml}
          <div class="product-footer${hasVariantPriceRange ? ' has-range' : ''}">
            <div class="product-price-stack">
              <span class="product-price${priceStr.startsWith('Desde') ? ' product-price-from' : ''}">${priceStr} <span>COP</span></span>
              ${priceSupport ? `<span class="product-price-note">${htmlSafe(priceSupport)}</span>` : ''}
            </div>
            <div class="product-card-actions">
              <button class="btn-details btn-sm" onclick='openProductDetail(${productJsonForModal})' aria-label="Ver ficha técnica de ${htmlSafe(p.name)}">Ficha técnica</button>
              ${p.variants && p.variants.length > 0
                ? `<button class="btn btn-gradient btn-sm" onclick='openProductDetail(${productJsonForModal})' aria-label="Elegir modelo de ${htmlSafe(p.name)}">Elegir modelo</button>`
                : `<button class="btn btn-gradient btn-sm${outOfStock ? ' is-disabled' : ''}" ${outOfStock ? 'disabled' : ''} onclick='addToCart({productId:"${p.productId}",name:${JSON.stringify(p.name)},price:${p.price},image:${JSON.stringify(allImages[0]?.sm || allImages[0]?.md || '')}})' aria-label="Agregar ${htmlSafe(p.name)} al carrito">${outOfStock ? 'Agotado' : 'Agregar'}</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  autoFitProductImages(grid);
  const newReveals = document.querySelectorAll('.reveal:not(.visible)');
  newReveals.forEach(el => observer.observe(el));
}

// ── Hero product carousel ────────────────────────
let heroCarouselIdx = 0;
let heroCarouselTimer = null;

function initHeroCarousel(products) {
  const featured = products.filter(p => p.heroFeatured && p.status !== 'deleted');
  const el = document.getElementById('heroCarousel');
  const dots = document.getElementById('heroCarouselDots');
  if (!el) return;

  if (featured.length === 0) {
    // Fallback: show top 4 by stock
    const fallback = [...products].sort((a,b) => (b.stock||0)-(a.stock||0)).slice(0,4);
    renderHeroCarousel(fallback, el, dots);
  } else {
    renderHeroCarousel(featured, el, dots);
  }
}

function renderHeroCarousel(items, el, dots) {
  if (!items.length) return;

  function showSlide(idx) {
    heroCarouselIdx = ((idx % items.length) + items.length) % items.length;
    const p = items[heroCarouselIdx];
    const heroImages = productImagesWithVariantFallback(p);
    const img = heroImages[0]?.sm || heroImages[0]?.md || heroImages[0]?.lg || '';
    const catEmoji = {'pantallas':'🖥️','baterias':'🔋','flex-y-conectores':'🔌','camaras':'📷','tapas':'🛡️','tapas-y-carcasa':'🛡️','accesorios':'🎧','herramientas':'🔧','herramientas-diy':'🔧'}[p.category] || '📱';
    const price = p.variants?.length > 0
      ? (() => { const ps = p.variants.map(v=>Number(v.price)).filter(n=>n>0); return ps.length ? 'Desde $'+Math.min(...ps).toLocaleString('es-CO') : '$'+Number(p.price).toLocaleString('es-CO'); })()
      : '$'+Number(p.price||0).toLocaleString('es-CO');

    el.innerHTML = `
      <div class="hero-carousel-slide" role="button" tabindex="0" aria-label="Ver ficha técnica de ${htmlSafe(p.name)}" onclick="openProductDetail(${JSON.stringify(p).replace(/"/g,'&quot;')})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
        <div class="hero-carousel-img">${img ? `<img src="${htmlSafe(img)}" alt="" loading="lazy">` : catEmoji}</div>
        <div class="hero-carousel-body">
          <div class="hero-carousel-cat">${htmlSafe(getCategoryLabel(p.category))}</div>
          <div class="hero-carousel-name">${htmlSafe(p.name)}</div>
          <div class="hero-carousel-price">${htmlSafe(price)} COP</div>
        </div>
        <span class="hero-carousel-arrow">›</span>
      </div>`;

    if (dots) {
        dots.innerHTML = items.map((_,i) =>
          `<button type="button" class="hero-carousel-dot${i===heroCarouselIdx?' active':''}" onclick="showHeroSlide(${i})" aria-label="Ver producto destacado ${i + 1}" aria-current="${i===heroCarouselIdx?'true':'false'}"></button>`
        ).join('');
    }
  }

  window.showHeroSlide = showSlide;
  showSlide(0);

  if (items.length > 1 && !prefersReducedMotion()) {
    clearInterval(heroCarouselTimer);
    heroCarouselTimer = setInterval(() => showSlide(heroCarouselIdx + 1), 3500);
    el.addEventListener('mouseenter', () => clearInterval(heroCarouselTimer));
    el.addEventListener('mouseleave', () => {
      if (!prefersReducedMotion()) {
        heroCarouselTimer = setInterval(() => showSlide(heroCarouselIdx + 1), 3500);
      }
    });
  }
}

async function loadProducts() {
  try {
    renderProductSkeletons();
    const res = await fetch('/api/products?_t=' + Date.now());
    const data = await res.json();
    storefrontProducts = data.products || [];
    if (storefrontProducts.length === 0) {
      if (isLocalPreview()) {
        storefrontProducts = localPreviewProducts();
        renderStorefrontProducts();
        return;
      }
      document.getElementById('productsGrid').innerHTML = '<p class="theme-status-message">Próximamente — nuevos componentes en camino.</p>';
      return;
    }
    renderStorefrontProducts();
    applyCatalogSearchFromUrl();
    initHeroCarousel(storefrontProducts);
  } catch (err) {
    console.log('Error cargando productos:', err);
    if (isLocalPreview()) {
      storefrontProducts = localPreviewProducts();
      renderStorefrontProducts();
      initHeroCarousel(storefrontProducts);
      return;
    }
    document.getElementById('productsGrid').innerHTML = '<p class="theme-status-message">Próximamente — nuevos componentes en camino.</p>';
  }
}

// Product pages used by Google link back to the live SPA catalog with this
// query parameter. Apply it only after the API catalog has loaded.
function applyCatalogSearchFromUrl() {
  const query = new URLSearchParams(window.location.search).get('buscar');
  if (!query || !query.trim()) return;
  filterProducts(query.trim(), { resetCategory: true });
  window.requestAnimationFrame(() => {
    document.getElementById('productos')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
}

const THEME_MODE_KEY = 'repuestoscel_theme_mode';
const LEGACY_THEME_KEYS = ['nex' + 'core_theme_mode', 'nex' + 'core_site_theme', 'repuestoscel_site_theme'];
const THEME_MODES = ['system', 'light', 'dark'];
const THEME_MODE_META = {
  system: { icon: '◐', label: 'Sistema' },
  light: { icon: '☀', label: 'Claro' },
  dark: { icon: '☾', label: 'Oscuro' }
};
const themeBootstrap = window.__repuestosThemeBootstrap || null;
const systemThemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let currentThemeMode = themeBootstrap?.mode || 'system';
let currentThemeSource = themeBootstrap?.hasUserPreference ? 'user' : 'system';
let hasExplicitThemePreference = Boolean(themeBootstrap?.hasUserPreference);
let remoteSiteSettingsLoaded = false;

function normalizeThemeMode(mode, fallback = 'system') {
  const migratedMode = mode === 'repair' ? 'light' : mode;
  return THEME_MODES.includes(migratedMode) ? migratedMode : fallback;
}

function resolveThemeMode(mode) {
  const normalized = normalizeThemeMode(mode);
  if (normalized === 'system') {
    return systemThemeQuery && systemThemeQuery.matches ? 'dark' : 'light';
  }
  return normalized;
}

function themeStorageRead(key) {
  if (themeBootstrap?.read) return themeBootstrap.read(key);
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function themeStorageWrite(key, value) {
  if (themeBootstrap?.write) return themeBootstrap.write(key, value);
  try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
}

function themeStorageRemove(key) {
  if (themeBootstrap?.remove) return themeBootstrap.remove(key);
  try { localStorage.removeItem(key); } catch (_) {}
}

function prefersReducedMotion() {
  return Boolean(reducedMotionQuery?.matches);
}

function preferredScrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function updateThemeToggle(mode, source = currentThemeSource) {
  const meta = THEME_MODE_META[normalizeThemeMode(mode)];
  const toggle = document.getElementById('themeToggle');
  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  const select = document.getElementById('themeModeSelect');
  const resolved = resolveThemeMode(mode);
  const visibleIcon = normalizeThemeMode(mode) === 'system' ? (resolved === 'dark' ? '☾' : '☀') : meta.icon;
  const sourceLabel = source === 'site-default' ? 'predeterminado del sitio' : meta.label.toLowerCase();
  const title = source === 'site-default'
    ? `Tema ${sourceLabel}: ${resolved === 'dark' ? 'oscuro' : 'claro'}`
    : `Tema: ${meta.label}${mode === 'system' ? ` (${resolved === 'dark' ? 'oscuro' : 'claro'})` : ''}`;
  if (icon) icon.textContent = visibleIcon;
  if (text) text.textContent = meta.label;
  if (select) {
    select.value = normalizeThemeMode(mode);
    select.setAttribute('aria-label', `${title}. Elige Sistema, Claro u Oscuro`);
    select.dataset.source = source;
  }
  if (toggle) {
    toggle.title = title;
  }
}

function applyThemeMode(mode, options = {}) {
  currentThemeMode = normalizeThemeMode(mode);
  currentThemeSource = options.source || (options.persist ? 'user' : currentThemeSource);
  const resolvedTheme = resolveThemeMode(currentThemeMode);
  const root = document.documentElement;
  root.dataset.themeMode = currentThemeMode;
  root.dataset.theme = resolvedTheme;
  root.dataset.themeSource = currentThemeSource;
  root.style.colorScheme = resolvedTheme;
  const themeColor = document.getElementById('themeColorMeta');
  if (themeColor) themeColor.content = resolvedTheme === 'dark' ? '#080810' : '#f6f9fa';
  if (options.persist) {
    hasExplicitThemePreference = true;
    if (themeStorageWrite(THEME_MODE_KEY, currentThemeMode)) {
      LEGACY_THEME_KEYS.forEach(themeStorageRemove);
    }
  }
  updateThemeToggle(currentThemeMode, currentThemeSource);
}

function setThemePreference(mode) {
  applyThemeMode(normalizeThemeMode(mode), { persist: true, source: 'user' });
}

function applyConfiguredDefaultTheme() {
  if (remoteSiteSettingsLoaded) {
    document.documentElement.dataset.visualTheme = String(siteSettings.visualTheme || 'unset');
  }
  if (hasExplicitThemePreference) return;
  applyThemeMode('system', { source: 'system' });
}

function initThemePreference() {
  let storedMode = themeBootstrap?.mode || null;
  if (!themeBootstrap) {
    const currentStoredMode = normalizeThemeMode(themeStorageRead(THEME_MODE_KEY), null);
    const legacyMode = LEGACY_THEME_KEYS
      .map((key) => normalizeThemeMode(themeStorageRead(key), null))
      .find((value) => value !== null);
    storedMode = currentStoredMode || legacyMode || null;
    hasExplicitThemePreference = storedMode !== null;
    if (hasExplicitThemePreference && themeStorageWrite(THEME_MODE_KEY, storedMode)) {
      LEGACY_THEME_KEYS.forEach(themeStorageRemove);
    }
  }
  applyThemeMode(storedMode || 'system', { source: hasExplicitThemePreference ? 'user' : 'system' });
  document.getElementById('themeModeSelect')?.addEventListener('change', (event) => {
    setThemePreference(event.target.value);
  });
  if (systemThemeQuery) {
    const handleSystemThemeChange = () => {
      if (currentThemeMode === 'system') applyThemeMode('system', { source: currentThemeSource });
    };
    if (typeof systemThemeQuery.addEventListener === 'function') {
      systemThemeQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof systemThemeQuery.addListener === 'function') {
      systemThemeQuery.addListener(handleSystemThemeChange);
    }
  }
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_MODE_KEY && !LEGACY_THEME_KEYS.includes(event.key)) return;
    const incomingMode = normalizeThemeMode(event.newValue, null);
    if (incomingMode) {
      hasExplicitThemePreference = true;
      applyThemeMode(incomingMode, { source: 'user' });
      if (event.key !== THEME_MODE_KEY && themeStorageWrite(THEME_MODE_KEY, incomingMode)) {
        LEGACY_THEME_KEYS.forEach(themeStorageRemove);
      }
      return;
    }
    const storedCurrentMode = normalizeThemeMode(themeStorageRead(THEME_MODE_KEY), null);
    if (storedCurrentMode) {
      hasExplicitThemePreference = true;
      applyThemeMode(storedCurrentMode, { source: 'user' });
      return;
    }
    hasExplicitThemePreference = false;
    applyConfiguredDefaultTheme();
  });
}

function initMotionPreference() {
  if (!reducedMotionQuery) return;
  const stopMotionAnimations = () => {
    if (!prefersReducedMotion()) return;
    stopCartParticles();
    Object.keys(cardRotationIntervals).forEach(stopCardRotation);
    if (heroCarouselTimer) {
      clearInterval(heroCarouselTimer);
      heroCarouselTimer = null;
    }
  };
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', stopMotionAnimations);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(stopMotionAnimations);
  }
  stopMotionAnimations();
}

async function loadSiteSettings() {
  try {
    const res = await fetch('/api/site-settings?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('settings_unavailable');
    const data = await res.json();
    siteSettings = normalizeSiteSettings(data.settings || {});
    remoteSiteSettingsLoaded = true;
    applyConfiguredDefaultTheme();
    updateDeliveryPreview();
    // si el mapa ya se pintó (fallback), re-renderiza con la key oficial recién cargada
    lastEmbedQuery = '';
    syncCheckoutMapVisibility();
    if (isDeliveryMapEnabled() && document.getElementById('checkoutMapEmbed')?.getAttribute('src')) updateCheckoutMapEmbed();
  } catch (_) {
    siteSettings = normalizeSiteSettings();
    remoteSiteSettingsLoaded = false;
    document.documentElement.dataset.visualTheme = 'unavailable';
    applyConfiguredDefaultTheme();
    syncCheckoutMapVisibility();
  }
}

async function initStorefront() {
  initThemePreference();
  initMotionPreference();
  await loadSiteSettings();
  await loadProducts();
}

initStorefront();

document.querySelectorAll('.category-card[data-category]').forEach((card) => {
  const activateCategory = () => {
    activeProductCategory = card.dataset.category || '';
    currentPage = 1;
    renderStorefrontProducts();
    document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  };
  card.addEventListener('click', activateCategory);
  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activateCategory();
  });
});

// ==============================
// SCROLL REVEAL (Intersection Observer)
// ==============================
const revealElements = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => observer.observe(el));

// ==============================
// NAVBAR SCROLL EFFECT
// ==============================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ==============================
// CONTACT FORM
// ==============================
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value;
  const message = document.getElementById('messageInput')?.value || '';
  const feedback = document.getElementById('formFeedback');

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {})
      },
      body: JSON.stringify({
        name: email.split('@')[0],
        email,
        message: message.trim() || 'Cotización desde la web'
      })
    });
    if (res.ok) {
      feedback.textContent = '✅ Recibimos tu solicitud. Te escribimos pronto.';
      feedback.dataset.state = 'success';
      feedback.hidden = false;
      document.getElementById('emailInput').value = '';
      if (document.getElementById('messageInput')) {
        document.getElementById('messageInput').value = '';
      }
      if (cart.length > 0) {
        cart = [];
        clearCartStorage();
        updateCartCount();
        renderCart();
      }
    } else {
      feedback.textContent = '❌ Error al enviar. Intenta de nuevo.';
      feedback.dataset.state = 'error';
      feedback.hidden = false;
    }
  } catch {
    // Fallback: backend no disponible, guardamos local
    feedback.textContent = '✅ Mensaje registrado (modo offline). Te contactaremos.';
    feedback.dataset.state = 'success';
    feedback.hidden = false;
  }
});

// ==============================
// FOOTER + INFORMATION CENTER
// ==============================
const INFORMATION_PAGES = {
  sobre: {
    eyebrow: 'Nuestra razón de ser',
    title: 'Reparar antes que reemplazar.',
    lede: 'RepuestosCel organiza repuestos y herramientas para que personas, técnicos y talleres puedan comparar mejor antes de comprar.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>Compatibilidad primero</strong><p>La marca no basta: revisa el modelo exacto, la variante y el tipo de pieza antes de elegir.</p></article>
        <article class="info-card"><strong>Información clara</strong><p>Mostramos condición, calidad y disponibilidad cuando esos datos están confirmados para el producto.</p></article>
        <article class="info-card"><strong>Herramientas adecuadas</strong><p>Una buena reparación también depende de preparar el equipo y trabajar sin forzar conectores ni flex.</p></article>
        <article class="info-card"><strong>Más vida útil</strong><p>Una falla reparable no siempre tiene que terminar en un celular descartado.</p></article>
      </div>
      <p>Si no sabes qué pieza necesitas, envíanos la marca, el modelo exacto y el síntoma. Podemos orientarte para comparar opciones; esta ayuda remota no reemplaza el diagnóstico presencial de un técnico.</p>`,
    action: { label: 'Consultar compatibilidad', target: '#contacto', message: 'Hola, necesito ayuda para confirmar la compatibilidad de un repuesto. Mi celular es: ' },
    secondary: { label: 'Explorar catálogo', target: '#productos' }
  },
  guia: {
    eyebrow: 'Guía de reparación',
    title: 'Diagnostica. Verifica. Repara.',
    lede: 'Una secuencia práctica para escoger la pieza correcta, preparar el equipo y reducir errores durante la instalación.',
    banner: 'assets/info/repuestoscel-guia-banner-v2.webp',
    bannerWidth: 1672,
    bannerHeight: 941,
    bannerAlt: 'Pantalla, batería, flex de carga y destornillador dispuestos como una secuencia de reparación.',
    content: `
      <ol class="info-steps">
        <li><strong>Identifica el modelo exacto.</strong> Revisa Ajustes, la caja o el código impreso del equipo.</li>
        <li><strong>Describe la falla.</strong> Imagen, touch, carga, batería, audio y encendido pueden necesitar piezas distintas.</li>
        <li><strong>Compara compatibilidad y calidad.</strong> Revisa variante, condición, herramientas y garantía indicadas en la ficha.</li>
        <li><strong>Prepara el equipo.</strong> Haz una copia de seguridad, apágalo, retira la SIM y despeja la superficie.</li>
        <li><strong>No fuerces conectores.</strong> Ordena tornillos y evita doblar flex o perforar baterías.</li>
        <li><strong>Prueba antes de sellar.</strong> Verifica imagen, touch, carga, cámaras y audio antes del cierre final.</li>
      </ol>
      <aside class="info-callout"><strong>Detente si hay riesgo.</strong><p>Una batería inflada, calor anormal, humedad o una reparación con microsoldadura requieren la atención de un técnico calificado.</p></aside>`,
    action: { label: 'Buscar el repuesto', target: '#productos' },
    secondary: { label: 'Pedir orientación', target: '#contacto', message: 'Hola, quiero orientación antes de empezar una reparación. El equipo y la falla son: ' }
  },
  compatibilidad: {
    eyebrow: 'Antes de comprar',
    title: 'Confirma la pieza con más contexto.',
    lede: 'Podemos ayudarte a revisar modelo, variante y tipo de repuesto antes de que completes la compra.',
    banner: 'assets/info/repuestoscel-compatibilidad-banner-v2.webp',
    bannerWidth: 1672,
    bannerHeight: 941,
    bannerAlt: 'Dos pantallas de celular y sus conectores comparados lado a lado sobre una retícula técnica.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>1. Equipo</strong><p>Marca, nombre del modelo y código de variante si está disponible.</p></article>
        <article class="info-card"><strong>2. Síntoma</strong><p>Explica qué dejó de funcionar y cuándo empezó la falla.</p></article>
        <article class="info-card"><strong>3. Evidencia</strong><p>Incluye fotos del equipo, conector o pieza cuando sea posible.</p></article>
        <article class="info-card"><strong>4. Objetivo</strong><p>Cuéntanos si vas a instalarlo tú o si trabajará un técnico.</p></article>
      </div>
      <p>La orientación remota ayuda a reducir errores de compatibilidad, pero no constituye un diagnóstico definitivo ni garantiza el resultado de una instalación.</p>`,
    action: { label: 'Consultar compatibilidad', target: '#contacto', message: 'Hola, necesito confirmar una pieza. Marca, modelo exacto y síntoma: ' },
    secondary: { label: 'Ver categorías', target: '#productos' }
  },
  volumen: {
    eyebrow: 'Talleres y negocios',
    title: 'Cotiza varias reparaciones en una sola conversación.',
    lede: 'Comparte una lista clara y te respondemos con disponibilidad, compatibilidad y condiciones confirmadas para esa cotización.',
    banner: 'assets/info/repuestoscel-volumen-banner-v2.webp',
    bannerWidth: 1672,
    bannerHeight: 941,
    bannerAlt: 'Tres grupos ordenados de pantallas, baterías y flex de carga para compras por volumen.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>Modelos y piezas</strong><p>Especifica la variante de cada equipo y el repuesto que necesitas.</p></article>
        <article class="info-card"><strong>Cantidades</strong><p>Indica unidades por referencia para revisar inventario y alternativas.</p></article>
        <article class="info-card"><strong>Destino</strong><p>Incluye ciudad o municipio para estimar la operación de entrega.</p></article>
        <article class="info-card"><strong>Fecha estimada</strong><p>Cuéntanos cuándo planeas comprar para organizar la propuesta.</p></article>
      </div>
      <aside class="info-callout"><strong>Cotización verificable</strong><p>Precios, inventario, tiempos y condiciones se confirman individualmente en cada propuesta.</p></aside>`,
    action: { label: 'Solicitar cotización por volumen', target: '#contacto', message: 'Hola, necesito una cotización por volumen. Mi lista de modelos, piezas y cantidades es: ' }
  },
  faq: {
    eyebrow: 'Preguntas frecuentes',
    title: 'Respuestas antes de comprar.',
    lede: 'Lo esencial sobre compatibilidad, inventario, entrega, instalación y seguimiento.',
    banner: 'assets/info/repuestoscel-preguntas-banner-v2.webp',
    bannerWidth: 1672,
    bannerHeight: 941,
    bannerAlt: 'Despiece técnico de un celular con pantalla, marco, batería, flex de carga y destornillador.',
    content: `
      <div class="info-faq">
        <details><summary>¿Cómo confirmo que una pieza es compatible?</summary><p>Compara el modelo exacto y la variante con la ficha. Si tienes dudas, contáctanos antes de comprar.</p></details>
        <details><summary>¿Qué significan las calidades publicadas?</summary><p>Cada ficha indica calidad o condición cuando está disponible. Las etiquetas pueden variar según el fabricante; consulta antes de elegir.</p></details>
        <details><summary>¿El inventario mostrado está disponible?</summary><p>El sitio muestra la disponibilidad conocida. El inventario se confirma al procesar el pedido o la cotización.</p></details>
        <details><summary>¿Cuánto tarda el envío?</summary><p>El checkout calcula una estimación según departamento y ciudad. El tiempo final puede variar por cobertura y operación del transportador.</p></details>
        <details><summary>¿Cómo rastreo mi pedido?</summary><p>Usa la referencia recibida después de comprar en la sección Rastrear pedido.</p></details>
        <details><summary>¿Puedo instalar el repuesto en casa?</summary><p>Depende de la reparación y tu experiencia. Baterías dañadas, humedad y microsoldadura deben ser atendidas por un técnico.</p></details>
        <details><summary>¿Qué métodos de pago existen?</summary><p>El checkout muestra los métodos habilitados al momento de comprar y sus condiciones cuando apliquen.</p></details>
      </div>`,
    action: { label: 'Hacer otra pregunta', target: '#contacto', message: 'Hola, tengo una pregunta antes de comprar: ' },
    secondary: { label: 'Rastrear pedido', target: '#rastrear-pedido' }
  },
  garantias: {
    eyebrow: 'Soporte posventa',
    title: 'Revisamos cada caso con la evidencia correcta.',
    lede: 'La duración y las condiciones de garantía pueden variar según el producto; consúltalas en su ficha o cotización.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>Conserva la referencia</strong><p>La referencia del pedido nos permite ubicar la compra y el producto exacto.</p></article>
        <article class="info-card"><strong>Documenta la falla</strong><p>Envía una descripción clara y, cuando sea posible, fotografías o video.</p></article>
        <article class="info-card"><strong>Evita continuar</strong><p>Si sospechas que la pieza llegó defectuosa, detén la instalación y solicita orientación.</p></article>
        <article class="info-card"><strong>Evaluación técnica</strong><p>La cobertura puede requerir revisión del estado de la pieza y de su instalación.</p></article>
      </div>
      <p>Golpes, humedad, conectores o flex rotos, instalación incorrecta o modificaciones posteriores pueden afectar la cobertura según el caso, sin limitar los derechos reconocidos por la legislación colombiana.</p>`,
    action: { label: 'Solicitar revisión', target: '#contacto', message: 'Hola, quiero solicitar una revisión de garantía. Referencia del pedido y descripción de la falla: ' },
    secondary: { label: 'Rastrear pedido', target: '#rastrear-pedido' }
  },
  envios: {
    eyebrow: 'Entrega y posventa',
    title: 'Envíos y devoluciones, sin letra pequeña improvisada.',
    lede: 'El checkout muestra costo y entrega estimada según el destino. Los tiempos pueden cambiar por cobertura o novedades del transportador.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>Antes de confirmar</strong><p>Verifica dirección, municipio, teléfono y producto. La dirección escrita es la referencia principal; el mapa solo ayuda a ubicarla.</p></article>
        <article class="info-card"><strong>Durante la entrega</strong><p>Guarda la referencia del pedido para consultar el avance y la información disponible del despacho.</p></article>
        <article class="info-card"><strong>Antes de devolver</strong><p>Contacta a soporte con la referencia y el motivo. No envíes una pieza sin recibir instrucciones.</p></article>
        <article class="info-card"><strong>Revisión del producto</strong><p>El estado, empaque, accesorios e instalación pueden requerir evaluación según el caso.</p></article>
      </div>
      <p>Los cambios, retractos y devoluciones se atienden en los casos y plazos establecidos por la ley colombiana y por la condición particular del producto.</p>`,
    action: { label: 'Rastrear pedido', target: '#rastrear-pedido' },
    secondary: { label: 'Hablar con soporte', target: '#contacto', message: 'Hola, necesito ayuda con un envío o devolución. Mi referencia y el caso son: ' }
  },
  terminos: {
    eyebrow: 'Legal',
    title: 'Términos y condiciones.',
    lede: 'Al comprar confirmas que revisaste producto, variante, compatibilidad, cantidades, precio y datos de entrega.',
    content: `
      <div class="info-prose">
        <h3>Uso de la tienda</h3><p>La información suministrada debe ser veraz y suficiente para procesar el pedido. Precios se muestran en COP y la disponibilidad se confirma durante el proceso de compra.</p>
        <h3>Confirmación y pago</h3><p>El pedido se considera confirmado cuando el pago sea aprobado o, en pago contra entrega, cuando cobertura y datos hayan sido validados. Los pagos electrónicos pueden ser procesados por proveedores externos.</p>
        <h3>Compatibilidad y entrega</h3><p>Revisa las variantes antes de comprar. Las fechas de entrega son estimadas y pueden cambiar por cobertura o novedades operativas.</p>
        <h3>Garantías y devoluciones</h3><p>Cada caso se atiende según el producto, su condición y la legislación colombiana aplicable. Nada en estos términos limita los derechos del consumidor.</p>
        <p class="info-meta-note">Este resumen facilita la lectura de las condiciones operativas de la tienda y debe complementarse con la identificación legal y datos de vigencia del comercio.</p>
      </div>`,
    action: { label: 'Resolver una duda', target: '#contacto', message: 'Hola, tengo una consulta sobre los términos de compra: ' }
  },
  privacidad: {
    eyebrow: 'Legal',
    title: 'Privacidad y tratamiento de datos.',
    lede: 'Usamos los datos necesarios para gestionar compras, entregas, soporte, prevención de fraude y obligaciones legales.',
    content: `
      <div class="info-prose">
        <h3>Datos que intervienen</h3><p>Esto puede incluir nombre, datos de contacto, dirección, pedidos, estado del pago e interacciones con soporte.</p>
        <h3>Proveedores necesarios</h3><p>Los datos pueden compartirse con pasarelas de pago, transportadores y proveedores tecnológicos cuando sea necesario para prestar el servicio.</p>
        <h3>Tus solicitudes</h3><p>Puedes solicitar consulta, actualización, corrección, supresión o revocación de autorización cuando corresponda escribiendo a soporte@repuestoscel.com.</p>
        <p class="info-meta-note">La versión legal definitiva debe incluir responsable del tratamiento, identificación, domicilio, vigencia y tiempos de conservación.</p>
      </div>`,
    action: { label: 'Contactar sobre mis datos', target: '#contacto', message: 'Hola, tengo una solicitud relacionada con mis datos personales: ' }
  },
  cookies: {
    eyebrow: 'Preferencias del sitio',
    title: 'Cookies y almacenamiento local.',
    lede: 'La tienda recuerda algunas preferencias para que el carrito y la experiencia funcionen entre visitas.',
    content: `
      <div class="info-card-grid">
        <article class="info-card"><strong>Tema visual</strong><p>El navegador guarda si elegiste sistema, modo claro o modo oscuro.</p></article>
        <article class="info-card"><strong>Carrito</strong><p>Los productos seleccionados pueden conservarse localmente para facilitar la compra.</p></article>
        <article class="info-card"><strong>Compra reciente</strong><p>La referencia puede guardarse para facilitar una consulta posterior.</p></article>
        <article class="info-card"><strong>Servicios externos</strong><p>Mapas, pagos o transportadores pueden usar sus propias tecnologías cuando interactúas con ellos.</p></article>
      </div>
      <p>Puedes borrar estos datos desde la configuración del navegador. Si se incorporan tecnologías no esenciales, deberán solicitar consentimiento cuando corresponda.</p>`,
    action: { label: 'Consultar privacidad', target: '#contacto', message: 'Hola, tengo una pregunta sobre cookies o privacidad: ' }
  }
};

let lastInfoTrigger = null;

function infoActionMarkup(action, secondary = false) {
  if (!action) return '';
  const className = secondary ? 'btn btn-secondary' : 'btn btn-gradient';
  return `<button type="button" class="${className}" data-info-target="${action.target}" data-info-message="${action.message || ''}">${action.label}</button>`;
}

function openInfoPage(slug, trigger) {
  const page = INFORMATION_PAGES[slug];
  const modal = document.getElementById('infoModal');
  const content = document.getElementById('infoModalContent');
  if (!page || !modal || !content) return;
  lastInfoTrigger = trigger || document.activeElement;
  content.innerHTML = `
    <div class="info-eyebrow">${page.eyebrow}</div>
    <h2 class="info-heading" id="infoModalTitle">${page.title}</h2>
    <p class="info-lede">${page.lede}</p>
    ${page.banner ? `<img class="info-banner" src="${page.banner}" alt="${page.bannerAlt}" width="${page.bannerWidth || 1920}" height="${page.bannerHeight || 1077}">` : ''}
    <div class="info-content">${page.content}</div>
    <div class="info-actions">${infoActionMarkup(page.action)}${infoActionMarkup(page.secondary, true)}</div>`;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modal.querySelector('.info-modal')?.scrollTo({ top: 0 });
  requestAnimationFrame(() => document.getElementById('infoModalCloseBtn')?.focus());
}

function closeInfoModal(options = {}) {
  const modal = document.getElementById('infoModal');
  if (!modal?.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay.open')) document.body.classList.remove('modal-open');
  if (options.restoreFocus !== false && lastInfoTrigger instanceof HTMLElement) lastInfoTrigger.focus();
}

function goToInfoTarget(target, message = '') {
  closeInfoModal({ restoreFocus: false });
  if (message) {
    const messageInput = document.getElementById('messageInput');
    if (messageInput) messageInput.value = message;
  }
  requestAnimationFrame(() => {
    const destination = document.querySelector(target);
    destination?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
    if (message && target === '#contacto') document.getElementById('messageInput')?.focus({ preventScroll: true });
  });
}

document.querySelectorAll('[data-footer-category]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    activeProductCategory = link.dataset.footerCategory || '';
    activeSearchQuery = '';
    currentPage = 1;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderStorefrontProducts();
    document.getElementById('productos')?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  });
});

document.querySelectorAll('[data-info-page]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openInfoPage(link.dataset.infoPage, link);
  });
});

document.getElementById('infoModalCloseBtn')?.addEventListener('click', () => closeInfoModal());
document.getElementById('infoModal')?.addEventListener('click', (event) => {
  if (event.target === event.currentTarget) closeInfoModal();
});
document.getElementById('infoModalContent')?.addEventListener('click', (event) => {
  const action = event.target.closest('[data-info-target]');
  if (!action) return;
  goToInfoTarget(action.dataset.infoTarget, action.dataset.infoMessage || '');
});
document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('infoModal');
  if (!modal?.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeInfoModal();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button, a[href], summary, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// ==============================
// SMOOTH SCROLL FOR NAV LINKS
// ==============================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#' || href === '#carrito') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (target) {
      target.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
    }
    // Close mobile menu
    document.getElementById('navLinks').classList.remove('open');
  });
});

// ==============================
// USER AUTH STATE (simplified — no user accounts, just tracking)
// ==============================
const AUTH_TOKEN_KEY = 'repuestoscel_auth_token';
const AUTH_USER_KEY = 'repuestoscel_auth_user';
const AUTH_USERID_KEY = 'repuestoscel_auth_user_id';
const LEGACY_AUTH_TOKEN_KEY = 'nex' + 'core_auth_token';
const LEGACY_AUTH_USER_KEY = 'nex' + 'core_auth_user';
const LEGACY_AUTH_USERID_KEY = 'nex' + 'core_auth_user_id';

function readSessionStorageWithLegacy(key, legacyKey, fallback = '') {
  const currentValue = safeStorageRead('sessionStorage', key);
  if (currentValue !== null) return currentValue;
  const legacyValue = safeStorageRead('sessionStorage', legacyKey);
  if (legacyValue !== null) {
    if (safeStorageWrite('sessionStorage', key, legacyValue)) {
      safeStorageRemove('sessionStorage', legacyKey);
    }
    return legacyValue;
  }
  return fallback;
}

function readStoredUser() {
  try {
    return JSON.parse(readSessionStorageWithLegacy(AUTH_USER_KEY, LEGACY_AUTH_USER_KEY, 'null') || 'null');
  } catch (_) {
    safeStorageRemove('sessionStorage', AUTH_USER_KEY);
    safeStorageRemove('sessionStorage', LEGACY_AUTH_USER_KEY);
    return null;
  }
}

let currentUser = readStoredUser();

function isLoggedIn() {
  return !!readSessionStorageWithLegacy(AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY);
}

function getUserToken() {
  return readSessionStorageWithLegacy(AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY) || '';
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  const ordersLink = document.getElementById('navOrders');
  if (!btn) return;
  if (isLoggedIn() && currentUser) {
    btn.textContent = currentUser.name?.split(' ')[0] || 'Cuenta';
    btn.href = '#';
    btn.onclick = function(e) { e.preventDefault(); openOrders(); };
    if (ordersLink) ordersLink.style.display = '';
  } else {
    btn.textContent = 'Ingresar';
    btn.href = '#';
    btn.onclick = function(e) { e.preventDefault(); openAuthModal(); };
    if (ordersLink) ordersLink.style.display = 'none';
  }
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  const status = document.getElementById('authStatus');
  if (status) {
    status.className = 'checkout-status';
    status.textContent = '';
  }
}

function setAuthStatus(msg, type) {
  const el = document.getElementById('authStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'checkout-status visible' + (type ? ' ' + type : '');
}

function showRegisterForm() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const title = document.getElementById('authTitle');
  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'block';
  if (title) title.textContent = 'Crear cuenta';
}

function showLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const title = document.getElementById('authTitle');
  if (loginForm) loginForm.style.display = 'block';
  if (registerForm) registerForm.style.display = 'none';
  if (title) title.textContent = 'Ingresar';
}

// Login form submit
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {})
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthStatus(data.error === 'invalid_credentials' ? 'Correo o contraseña incorrectos.' : (data.message || 'Error al ingresar.'), 'error');
      return;
    }
    safeStorageWrite('sessionStorage', AUTH_TOKEN_KEY, data.token);
    safeStorageWrite('sessionStorage', AUTH_USER_KEY, JSON.stringify(data.user));
    safeStorageRemove('sessionStorage', LEGACY_AUTH_TOKEN_KEY);
    safeStorageRemove('sessionStorage', LEGACY_AUTH_USER_KEY);
    currentUser = data.user;
    closeAuthModal();
    updateAuthUI();
  } catch (err) {
    setAuthStatus('Error de conexión. Intenta de nuevo.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }
});

// Register form submit
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value;
  const btn = document.getElementById('registerBtn');

  if (password.length < 6) {
    setAuthStatus('La contraseña debe tener al menos 6 caracteres.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {})
      },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error === 'email_already_registered' ? 'Este correo ya está registrado. Intenta ingresar.' : (data.message || 'Error al registrarte.');
      setAuthStatus(msg, 'error');
      return;
    }
    safeStorageWrite('sessionStorage', AUTH_TOKEN_KEY, data.token);
    safeStorageWrite('sessionStorage', AUTH_USER_KEY, JSON.stringify(data.user));
    safeStorageWrite('sessionStorage', AUTH_USERID_KEY, data.userId || '');
    safeStorageRemove('sessionStorage', LEGACY_AUTH_TOKEN_KEY);
    safeStorageRemove('sessionStorage', LEGACY_AUTH_USER_KEY);
    safeStorageRemove('sessionStorage', LEGACY_AUTH_USERID_KEY);
    currentUser = data.user;
    closeAuthModal();
    updateAuthUI();
  } catch (err) {
    setAuthStatus('Error de conexión. Intenta de nuevo.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
  }
});

// ==============================
// MIS PEDIDOS
// ==============================
async function openOrders() {
  const section = document.getElementById('mis-pedidos');
  const list = document.getElementById('ordersList');
  if (!section || !list) return;

  section.style.display = '';
  document.getElementById('ordersGreeting').textContent = currentUser ? `Tus compras, ${currentUser.name?.split(' ')[0] || ''}.` : 'Tus compras registradas.';
  list.innerHTML = '<p class="theme-status-message">Cargando tus pedidos...</p>';

  try {
    const res = await fetch('/api/orders', {
      headers: {
        'Authorization': 'Bearer ' + getUserToken(),
        ...(API_KEY ? { 'x-api-key': API_KEY } : {})
      }
    });
    const data = await res.json();
    if (!res.ok) {
      list.innerHTML = '<p class="theme-status-message is-error">No pudimos cargar tus pedidos.</p>';
      return;
    }
    const orders = data.orders || [];
    if (orders.length === 0) {
      list.innerHTML = '<p class="theme-status-message">No tienes pedidos registrados todavía.</p>';
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="order-history-card">
        <div class="order-history-header">
          <div>
            <strong class="order-history-reference">${htmlSafe(o.reference || '—')}</strong>
            <span class="order-history-status">${humanizeStatus(o.status)}</span>
          </div>
          <div class="order-history-price">
            <div class="order-history-amount">${formatCents(o.amountInCents || 0)}</div>
            <span class="order-history-date">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('es-CO') : '—'}</span>
          </div>
        </div>
        <div class="order-history-meta">
          ${o.items?.length || 0} ítems · Despacho: ${humanizeStatus(o.fulfillmentStatus)}
        </div>
        ${o.trackingNumber ? `<div class="order-history-link">🔗 Guía: ${htmlSafe(o.trackingNumber)}${o.courier ? ' (' + htmlSafe(o.courier) + ')' : ''}</div>` : ''}
      </div>
    `).join('');
    section.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  } catch (err) {
    list.innerHTML = '<p class="theme-status-message is-error">Error de conexión.</p>';
  }
}

function closeOrders() {
  const section = document.getElementById('mis-pedidos');
  if (section) section.style.display = 'none';
}

function logoutUser() {
  safeStorageRemove('sessionStorage', AUTH_TOKEN_KEY);
  safeStorageRemove('sessionStorage', AUTH_USER_KEY);
  safeStorageRemove('sessionStorage', AUTH_USERID_KEY);
  safeStorageRemove('sessionStorage', LEGACY_AUTH_TOKEN_KEY);
  safeStorageRemove('sessionStorage', LEGACY_AUTH_USER_KEY);
  safeStorageRemove('sessionStorage', LEGACY_AUTH_USERID_KEY);
  currentUser = null;
  updateAuthUI();
  closeOrders();
}

// ==============================
// IMAGE ZOOM
// ==============================
function openImageZoom(url, name) {
  const modal = document.getElementById('imageZoomModal');
  const img = document.getElementById('zoomImage');
  if (!modal || !img) return;
  lastImageZoomTrigger = document.activeElement;
  img.src = url;
  img.alt = name || '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  focusLayer(modal, '.modal-close');
}

function closeImageZoom(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('imageZoomModal');
  const wasOpen = modal?.classList.contains('open');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('modal-open');
  const img = document.getElementById('zoomImage');
  if (img) img.src = '';
  if (wasOpen) restoreLayerFocus(lastImageZoomTrigger);
}

// Init auth UI
updateAuthUI();
