/**
 * NexCore Backoffice — SPA Router & Page Controllers
 *
 * Hash-based router (#/ruta). Page modules render into #main-content.
 * Protected routes redirect to #/login when no session token exists.
 */

const App = (() => {
  'use strict';

  const PRODUCT_CATEGORY_OPTIONS = [
    { value: 'pantallas', label: 'Pantallas' },
    { value: 'baterias', label: 'Baterías' },
    { value: 'flex-y-conectores', label: 'Flex y conectores' },
    { value: 'camaras-y-modulos', label: 'Cámaras y módulos' },
    { value: 'tapas-y-carcasa', label: 'Tapas y carcasa' },
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'herramientas-diy', label: 'Herramientas DIY' },
  ];

  function getCategoryLabel(value) {
    const match = PRODUCT_CATEGORY_OPTIONS.find((option) => option.value === value);
    return match ? match.label : (value || '—');
  }

  /* ---- DOM references (cached after DOMContentLoaded) ---- */
  let $main, $sidebar, $overlay, $sidebarToggle, $toastContainer;

  /* =========================================================
     UTILITY HELPERS
     ========================================================= */
  function $el(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v);
    });
    children.forEach((c) => el.append(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }

  function showToast(message, type = 'success') {
    const toast = $el('div', { className: `toast toast-${type}` }, [message]);
    $toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3000);
    setTimeout(() => toast.remove(), 3500);
  }

  function showLoading() {
    $main.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Cargando…
      </div>`;
  }

  function closeSidebar() {
    $sidebar.classList.remove('open');
    $overlay.classList.remove('open');
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  const routes = {};

  function registerRoute(hash, handler) {
    routes[hash] = handler;
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function handleRoute() {
    const hash = window.location.hash || '#/login';
    closeSidebar();

    // Protected routes
    const publicRoutes = ['#/login'];
    if (!publicRoutes.includes(hash) && !Auth.isAuthenticated()) {
      navigate('#/login');
      return;
    }

    const handler = routes[hash];
    if (handler) {
      handler();
    } else {
      navigate('#/dashboard');
    }
  }

  /* =========================================================
     PAGES
     ========================================================= */

  // ---- LOGIN ----
  function renderLogin() {
    if (Auth.isAuthenticated()) {
      navigate('#/dashboard');
      return;
    }

    $main.innerHTML = `
      <div class="login-page">
        <div class="login-glow"></div>
        <div class="login-glow-2"></div>
        <div class="login-card">
          <div class="login-logo">
            <div class="login-logo-icon">N</div>
            <h1>NexCore Admin</h1>
            <p>Panel de administración</p>
          </div>
          <div class="login-error" id="loginError"></div>
          <form id="loginForm">
            <div class="form-group">
              <label class="form-label" for="username">Usuario</label>
              <input class="form-input" type="text" id="username" placeholder="admin" autocomplete="username" />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input class="form-input" type="password" id="password" placeholder="••••••••" autocomplete="current-password" />
            </div>
            <button type="submit" class="btn btn-gradient login-btn">Iniciar sesión</button>
          </form>
        </div>
      </div>`;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const errorEl = document.getElementById('loginError');

      if (!username || !password) {
        errorEl.textContent = 'Ingresa usuario y contraseña.';
        errorEl.classList.add('visible');
        return;
      }

      try {
        await Auth.login(username, password);
        navigate('#/dashboard');
      } catch (err) {
        errorEl.textContent = err.message || 'Credenciales inválidas.';
        errorEl.classList.add('visible');
      }
    });
  }

  // ---- DASHBOARD ----
  /* =========================================================
     DASHBOARD HELPERS
     ========================================================= */
  function fmtCOP(cents) {
    return '$' + Number(cents / 100).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function statusLabel(s) {
    const labels = {
      'CHECKOUT_CREATED': 'Creado',
      'PENDING': 'Pendiente',
      'APPROVED': 'Aprobado',
      'DECLINED': 'Rechazado',
      'CANCELLED': 'Cancelado',
      'CHARGEDBACK': 'Contracargo',
      'REFUNDED': 'Reembolsado',
    };
    return labels[s] || s;
  }

  function fulfillmentLabel(s) {
    const labels = {
      'PENDING_PAYMENT': '⏳ Pendiente pago',
      'READY_TO_FULFILL': '📦 Listo',
      'PROCESSING': '⚙️ Procesando',
      'SHIPPED': '🚚 Enviado',
      'DELIVERED': '✅ Entregado',
      'RETURNED': '↩️ Devuelto',
    };
    return labels[s] || s;
  }

  async function renderDashboard() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/dashboard');
      renderDashboardContent(data);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function renderDashboardContent(data) {
    const totalRevenueFormatted = fmtCOP(data.totalRevenueInCents || 0);
    const paidOrders = data.approvedOrders || 0;
    const pendingOrders = data.pendingOrders || 0;
    const totalProducts = data.totalProducts || 0;
    const totalLeads = data.totalLeads || 0;
    const totalUsers = data.totalUsers || 0;

    // ── Today widget greeting ──
    const hour = new Date().getHours();
    let greeting = 'Buenas noches';
    if (hour >= 5 && hour < 12) greeting = 'Buenos días';
    else if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
    const now = new Date();
    const todayStr = now.toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const todayOrders = (data.recentOrders || []).filter(o => {
      if (!o.createdAt) return false;
      return new Date(o.createdAt).toDateString() === now.toDateString();
    }).length;

    // ── Sales chart data ──
    const chartData = data.salesChart || { daily: { labels: [], values: [] }, hourly: { labels: [], values: [] }, monthly: { labels: [], values: [] } };
    let activeChartView = 'daily';

    // ── Sparkline (mock last 7 days) ──
    const sparklineData = chartData.daily.values.length ? chartData.daily.values : [12, 19, 8, 15, 22, 18, 25];
    const sparkMax = Math.max(...sparklineData, 1);

    // ── Status bars builder ──
    const orderStatuses = data.orderStatuses || {};
    const fulfillmentStatuses = data.fulfillmentStatuses || {};
    const maxOrderVal = Math.max(1, ...Object.values(orderStatuses));
    const maxFulfillVal = Math.max(1, ...Object.values(fulfillmentStatuses));

    function statusBar(key, count, maxVal) {
      const label = statusLabel(key);
      const pctWidth = maxVal > 0 ? (count / maxVal) * 100 : 0;
      return `
        <div class="status-bar-row">
          <span class="status-bar-label">${label}</span>
          <div class="status-bar-track">
            <div class="status-bar-fill status-fill-${key.toLowerCase()}" data-width="${pctWidth}" style="width:0%"></div>
          </div>
          <span class="status-bar-count">${count}</span>
        </div>`;
    }

    const orderBars = Object.entries(orderStatuses)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => statusBar(k, v, maxOrderVal))
      .join('');

    const fulfillmentBars = Object.entries(fulfillmentStatuses)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => statusBar(k, v, maxFulfillVal))
      .join('');

    // ── Build the template ──
    $main.innerHTML = `
      <!-- Today Widget -->
      <div class="today-widget">
        <div>
          <div class="today-greeting">${greeting}, Admin</div>
          <div class="today-date">${todayStr}</div>
        </div>
        <div class="today-stat">
          <span class="pulse-dot ${todayOrders > 0 ? 'active' : ''}"></span>
          📦 ${todayOrders} pedido${todayOrders !== 1 ? 's' : ''} hoy
        </div>
      </div>

      <!-- Apple-style Hero Cards -->
      <div class="dash-hero">
        <div class="dash-hero-card dash-hero-revenue">
          <div class="dash-hero-glow"></div>
          <div class="dash-hero-icon">💰</div>
          <div class="dash-hero-content">
            <div class="dash-hero-label">Ingresos (aprobados)</div>
            <div class="dash-hero-value">${totalRevenueFormatted}</div>
          </div>
          <div class="sparkline">
            ${sparklineData.map(v => `
              <div class="sparkline-bar" style="height:${(v / sparkMax) * 100}%"></div>
            `).join('')}
            <span class="sparkline-label">Últimos 7 días</span>
          </div>
        </div>
        <div class="dash-hero-card dash-hero-orders">
          <div class="dash-hero-glow"></div>
          <div class="dash-hero-icon">🛒</div>
          <div class="dash-hero-content">
            <div class="dash-hero-label">Pedidos</div>
            <div class="dash-hero-value">${data.totalOrders || 0}</div>
            <div class="dash-hero-sub">${paidOrders} pagados · ${pendingOrders} pendientes</div>
          </div>
        </div>
        <div class="dash-hero-card dash-hero-products">
          <div class="dash-hero-glow"></div>
          <div class="dash-hero-icon">📦</div>
          <div class="dash-hero-content">
            <div class="dash-hero-label">Catálogo</div>
            <div class="dash-hero-value">${totalProducts} productos</div>
            <div class="dash-hero-sub">${totalLeads} leads · ${totalUsers} usuarios</div>
          </div>
        </div>
      </div>

      <!-- Status sections (side-by-side) -->
      <div class="dash-grid">
        <div class="dash-section card">
          <div class="dash-section-header">
            <h3>📊 Estado de Pedidos</h3>
          </div>
          <div class="status-bar-list">
            ${orderBars || '<div style="color:var(--text-muted);font-size:0.875rem;padding:8px 0;">Sin pedidos aún</div>'}
          </div>
        </div>
        <div class="dash-section card">
          <div class="dash-section-header">
            <h3>🚚 Estado de Despacho</h3>
          </div>
          <div class="status-bar-list">
            ${fulfillmentBars || '<div style="color:var(--text-muted);font-size:0.875rem;padding:8px 0;">Sin pedidos aún</div>'}
          </div>
        </div>
      </div>

      <!-- Sales Chart -->
      <div class="dash-chart card">
        <div class="dash-chart-header">
          <h3>📈 Ventas</h3>
          <div class="dash-chart-tabs" id="chartTabs">
            <button class="chart-tab active" data-view="daily">Día</button>
            <button class="chart-tab" data-view="hourly">Hora</button>
            <button class="chart-tab" data-view="monthly">Mes</button>
          </div>
        </div>
        <div class="chart-bars-wrap">
          <div class="chart-bars" id="chartBars"></div>
        </div>
      </div>

      <!-- Quick Actions (pill chips) -->
      <div class="dash-actions">
        <a class="dash-action-chip" href="#/orders">
          <span class="dash-action-chip-icon">📋</span>
          <span>Ver pedidos</span>
        </a>
        <a class="dash-action-chip" href="#/products">
          <span class="dash-action-chip-icon">➕</span>
          <span>Nuevo producto</span>
        </a>
        <a class="dash-action-chip" href="#/leads">
          <span class="dash-action-chip-icon">👤</span>
          <span>Ver leads</span>
        </a>
        <a class="dash-action-chip" href="#/quotes">
          <span class="dash-action-chip-icon">📋</span>
          <span>Cotizaciones</span>
        </a>
      </div>

      <!-- Recent Orders -->
      <div class="table-container recent-orders-section">
        <div class="table-toolbar">
          <h3 style="font-size:0.9375rem;font-weight:600;">🕐 Últimos Pedidos</h3>
          <a href="#/orders" class="btn btn-secondary btn-sm">Ver todos →</a>
        </div>
        <table class="recent-orders-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Despacho</th>
              <th>Total</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody id="recentOrdersBody"></tbody>
        </table>
        <div id="recentOrdersMobile" class="recent-orders-mobile"></div>
      </div>`;

    // ── Render chart bars ──
    function renderChart(view) {
      activeChartView = view;
      const data = chartData[view] || { labels: [], values: [] };
      const labels = data.labels || [];
      const values = data.values || [];
      const maxVal = Math.max(...values, 1);
      const container = document.getElementById('chartBars');
      if (!container) return;
      container.innerHTML = values.map((v, i) => {
        const pct = (v / maxVal) * 100;
        return `<div class="chart-col" title="${v.toLocaleString()}">
          <div class="chart-bar-wrap">
            <div class="chart-bar chart-bar-inner" data-pct="${pct}" style="height:0%"></div>
          </div>
          <span class="chart-label">${esc(labels[i] || '')}</span>
        </div>`;
      }).join('');
      // Animate bars in next frame
      requestAnimationFrame(() => {
        container.querySelectorAll('.chart-bar-inner').forEach(el => {
          el.style.height = parseFloat(el.dataset.pct || 0) + '%';
        });
      });
    }

    // ── Chart tab switching ──
    const tabsContainer = document.getElementById('chartTabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-tab');
        if (!btn) return;
        tabsContainer.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        renderChart(btn.dataset.view);
      });
    }

    // Render default chart
    renderChart('daily');

    // ── Animate hero numbers & status bars ──
    requestAnimationFrame(() => {
      document.querySelectorAll('.dash-hero-value').forEach(el => el.classList.add('num-visible'));
      document.querySelectorAll('.status-bar-fill').forEach(el => {
        const w = parseFloat(el.dataset.width || 0);
        el.style.width = w + '%';
      });
    });

    // ── Render recent orders (desktop + mobile cards) ──
    const ordersTbody = document.getElementById('recentOrdersBody');
    const mobileContainer = document.getElementById('recentOrdersMobile');
    const recentOrders = data.recentOrders || [];

    if (recentOrders.length === 0) {
      ordersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin pedidos recientes</td></tr>';
      if (mobileContainer) mobileContainer.innerHTML = '<div class="recent-orders-mobile-card" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin pedidos recientes</div>';
    } else {
      recentOrders.forEach((o) => {
        const paymentCls = 'badge-' + (o.status === 'APPROVED' ? 'active' : o.status === 'DECLINED' || o.status === 'CANCELLED' ? 'inactive' : 'pending');
        const fulfillCls = o.fulfillmentStatus === 'DELIVERED' ? 'badge-active' : o.fulfillmentStatus === 'SHIPPED' ? 'badge-contacted' : 'badge-pending';

        // Desktop row
        const tr = $el('tr');
        tr.innerHTML = `
          <td><span class="ref-badge">${esc(o.reference || '—')}</span></td>
          <td>${esc(o.customerName || '—')}</td>
          <td><span class="badge ${paymentCls}">${statusLabel(o.status)}</span></td>
          <td><span class="badge ${fulfillCls}">${fulfillmentLabel(o.fulfillmentStatus)}</span></td>
          <td style="font-weight:600;">${fmtCOP(o.amountInCents || 0)}</td>
          <td style="color:var(--text-secondary);font-size:0.8125rem;white-space:nowrap;">${formatDate(o.createdAt)}</td>`;
        ordersTbody.appendChild(tr);

        // Mobile card
        if (mobileContainer) {
          const card = $el('div', { className: 'recent-orders-mobile-card' });
          card.innerHTML = `
            <div class="romc-header">
              <span class="ref-badge">${esc(o.reference || '—')}</span>
              <span class="romc-total">${fmtCOP(o.amountInCents || 0)}</span>
            </div>
            <div class="romc-customer">${esc(o.customerName || '—')}</div>
            <div class="romc-footer">
              <span class="badge ${paymentCls}">${statusLabel(o.status)}</span>
              <span class="badge ${fulfillCls}">${fulfillmentLabel(o.fulfillmentStatus)}</span>
              <span class="romc-date">${formatDate(o.createdAt)}</span>
            </div>`;
          mobileContainer.appendChild(card);
        }
      });
    }
  }

  // ---- PRODUCTS ----
  async function renderProducts() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/products');
      renderProductsTable(data.products || []);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function getCategories() {
    const cats = new Set();
    document.querySelectorAll('#productsBody tr').forEach((tr) => {
      const cat = tr.dataset.category;
      if (cat) cats.add(cat);
    });
    return [...cats].sort();
  }

  function renderProductsTable(products) {
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Productos</h1>
          <p class="page-subtitle">Gestiona el catálogo de repuestos y herramientas</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary" id="refreshProductsBtn">🔄 Actualizar</button>
          <button class="btn btn-gradient" id="newProductBtn">+ Nuevo Producto</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-filters">
            <select class="form-select" id="categoryFilter" style="min-width:140px;">
              <option value="">Todas las categorías</option>
            </select>
          </div>
          <span style="font-size:0.8125rem;color:var(--text-secondary);" id="productCount"></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="productsBody"></tbody>
        </table>
      </div>

      <!-- Product Modal -->
      <div class="modal-overlay" id="productModal">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title" id="modalTitle">Nuevo Producto</h2>
            <button class="modal-close" id="modalCloseBtn">✕</button>
          </div>
          <form id="productForm">

            <!-- ① Tipo de producto — siempre primero, como Shopify/WooCommerce -->
            <div class="product-form-section">
              <div class="form-section-heading" style="margin-bottom:12px;">
                <span class="form-section-icon">🏷️</span>
                <div><h3>Tipo de producto</h3><p>Define cómo se gestiona el precio y stock.</p></div>
              </div>
              <div class="product-type-grid">
                <label class="product-type-card" id="typeCardSimple">
                  <input type="radio" name="productType" value="simple" checked />
                  <div class="product-type-inner">
                    <span class="product-type-icon">📦</span>
                    <strong>Producto simple</strong>
                    <span>Un precio y un stock único. Ideal para repuestos de un solo modelo.</span>
                  </div>
                </label>
                <label class="product-type-card" id="typeCardVariant">
                  <input type="radio" name="productType" value="variants" />
                  <div class="product-type-inner">
                    <span class="product-type-icon">🗂️</span>
                    <strong>Con variantes por modelo</strong>
                    <span>Precio y stock distintos por cada modelo de dispositivo (iPhone 11, 12, Samsung…).</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- ② Info base — nombre, descripción, categoría (siempre visible) -->
            <div class="product-form-section">
              <div class="form-section-heading">
                <span class="form-section-icon">📝</span>
                <div><h3>Información del producto</h3><p>Datos visibles en catálogo y detalle.</p></div>
              </div>
              <div class="form-group">
                <label class="form-label">Nombre del producto</label>
                <input class="form-input" id="pName" required placeholder="Ej: Pantalla OLED para iPhone" />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción corta</label>
                <textarea class="form-textarea" id="pDesc" placeholder="Describe compatibilidad, calidad, instalación o notas importantes"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Categoría</label>
                  <select class="form-select" id="pCategory"></select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tiempo de envío</label>
                  <input class="form-input" id="pShippingTime" placeholder="Ej: 2-4 días hábiles" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Garantía</label>
                  <input class="form-input" id="pWarranty" placeholder="Ej: 30 días" />
                </div>
                <div class="form-group">
                  <label class="form-label">Compatibilidad general</label>
                  <div class="tag-input-shell" id="pCompatibilityShell">
                    <div class="tag-list" id="pCompatibilityTags"></div>
                    <input class="tag-input" id="pCompatibilityInput" placeholder="Buscar o agregar modelo…" />
                  </div>
                  <div class="form-helper">Enter o coma. Ej: iPhone 11, iPhone XR.</div>
                </div>
              </div>
            </div>

            <!-- Hero featured toggle -->
            <div class="product-form-section">
              <div class="form-section-heading" style="margin-bottom:0;">
                <span class="form-section-icon">⭐</span>
                <div>
                  <h3>Destacar en el hero</h3>
                  <p>Muestra este producto en el carrusel principal de la página de inicio.</p>
                </div>
                <label class="toggle-switch" style="margin-left:auto;flex-shrink:0;">
                  <input type="checkbox" id="pHeroFeatured" />
                  <span class="toggle-track"></span>
                </label>
              </div>
            </div>

            <!-- ③ Modo SIMPLE: precio, stock, calidad, imágenes -->
            <div class="product-form-section" id="simpleFields">
              <div class="form-section-heading">
                <span class="form-section-icon">💰</span>
                <div><h3>Precio, stock e imágenes</h3><p>Aplica a este producto único.</p></div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Precio (COP)</label>
                  <input class="form-input" type="number" step="1" id="pPrice" required placeholder="289000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Stock</label>
                  <input class="form-input" type="number" id="pStock" placeholder="0" />
                  <div class="stock-hint" id="pStockHint">Define unidades disponibles para mostrar confianza.</div>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Calidad del repuesto</label>
                  <select class="form-select" id="pQuality">
                    <option value="">Sin especificar</option>
                    <option value="Original">Original</option>
                    <option value="OEM">OEM</option>
                    <option value="AAA">AAA</option>
                    <option value="GX">GX</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Imágenes</label>
                  <div class="image-upload-area">
                    <input type="file" accept="image/*" id="pImageInput" style="display:none" />
                    <button type="button" class="btn btn-secondary btn-sm" id="pImageUploadBtn">📷 Agregar imagen</button>
                  </div>
                  <div class="product-images" id="pImagesPreview"></div>
                </div>
              </div>
            </div>

            <!-- ③ Modo VARIANTES: tabla con headers -->
            <div class="product-form-section" id="variantFields" style="display:none;">
              <div class="form-section-heading">
                <span class="form-section-icon">🗂️</span>
                <div><h3>Variantes por modelo</h3><p>Cada fila es un dispositivo compatible con su propio precio, stock e imagen.</p></div>
              </div>
              <div class="variant-table-headers">
                <span>Marca</span>
                <span>Modelo</span>
                <span>Sub-modelo</span>
                <span>Precio COP</span>
                <span>Stock</span>
                <span>Calidad</span>
                <span>Imagen</span>
                <span></span>
              </div>
              <div id="variantsList"></div>
              <button type="button" class="btn btn-secondary btn-sm" id="addVariantBtn" style="margin-top:12px;">+ Agregar modelo</button>
            </div>

            <div class="product-form-section product-live-preview">
              <div class="form-section-heading compact">
                <span class="form-section-icon">👁️</span>
                <div>
                  <h3>Preview rápido</h3>
                  <p>Vista resumida de confianza para el cliente.</p>
                </div>
              </div>
              <div class="product-tech-preview" id="pTechPreview"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="modalCancelBtn">Cancelar</button>
              <button type="submit" class="btn btn-gradient" id="modalSaveBtn">Guardar</button>
            </div>
          </form>
        </div>
      </div>`;

    const tbody = document.getElementById('productsBody');
    const filter = document.getElementById('categoryFilter');
    const count = document.getElementById('productCount');

    // Collect unique categories
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    categories.sort().forEach((cat) => {
      const opt = $el('option', { value: cat }, [getCategoryLabel(cat)]);
      filter.appendChild(opt);
    });

    function renderFiltered() {
      const catFilter = filter.value;
      const filtered = catFilter ? products.filter((p) => p.category === catFilter) : products;
      tbody.innerHTML = '';
      count.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;

      filtered.forEach((p) => {
        const statusClass = `badge-${p.status || 'active'}`;
        const isDeleted = p.status === 'deleted';
        const stock = stockLabel(p.stock);
        const tr = $el('tr', { dataset: { productId: p.productId, category: p.category || '' } });
        if (isDeleted) tr.classList.add('deleted');
        const variantChip = (p.variants && p.variants.length > 0)
          ? ` <span class="badge" style="background:var(--info,#3b82f6);color:#fff;font-size:0.7rem;padding:2px 6px;border-radius:10px;">${p.variants.length} var.</span>`
          : '';
        tr.innerHTML = `
          <td><strong>${esc(p.name)}</strong>${variantChip}</td>
          <td>$${Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>${esc(getCategoryLabel(p.category))}</td>
          <td><span class="stock-badge ${stock.tone}">${esc(stock.text)}</span></td>
          <td><span class="badge ${statusClass}">${esc(p.status || 'active')}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm edit-btn" data-id="${p.productId}">✏️ Editar</button>
              ${!isDeleted ? `<button class="btn btn-danger btn-sm delete-btn" data-id="${p.productId}">🗑️ Eliminar</button>` : ''}
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    filter.addEventListener('change', renderFiltered);
    renderFiltered();

    // ---- Modal logic ----
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const productForm = document.getElementById('productForm');
    const pName = document.getElementById('pName');
    const pDesc = document.getElementById('pDesc');
    const pPrice = document.getElementById('pPrice');
    const pStock = document.getElementById('pStock');
    const pCategory = document.getElementById('pCategory');
    const pQuality = document.getElementById('pQuality');
    const pShippingTime = document.getElementById('pShippingTime');
    const pWarranty = document.getElementById('pWarranty');
    const pCompatibilityInput = document.getElementById('pCompatibilityInput');
    const pCompatibilityTags = document.getElementById('pCompatibilityTags');
    const pStockHint = document.getElementById('pStockHint');
    const pTechPreview = document.getElementById('pTechPreview');

    pCategory.innerHTML = PRODUCT_CATEGORY_OPTIONS.map((option) => (
      `<option value="${option.value}">${option.label}</option>`
    )).join('');

    let editingId = null;
    let uploadedImages = [];
    let isUploading = false;
    let compatibilityTags = [];
    let variantRows = []; // [{variantId, deviceBrand, deviceFamily, model, price, stock, quality, images, _uploadingImage}]

    // ---- Variant helpers ----
    function newVariantRow(data = {}) {
      return {
        variantId: data.variantId || ('v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
        deviceBrand: data.deviceBrand || '',
        deviceFamily: data.deviceFamily || '',
        model: data.model || '',
        price: data.price != null ? data.price : '',
        stock: data.stock != null ? data.stock : '',
        quality: data.quality || '',
        images: Array.isArray(data.images) ? data.images.map(img => ({...img})) : [],
        _uploadingImage: false,
      };
    }

    function renderVariantRows() {
      const container = document.getElementById('variantsList');
      if (!container) return;
      if (variantRows.length === 0) {
        container.innerHTML = '<p style="font-size:0.8125rem;color:var(--text-secondary);margin:4px 0 8px;">Sin variantes — el producto usará precio y stock global.</p>';
        return;
      }
      container.innerHTML = '';
      variantRows.forEach((row, idx) => {
        const firstImg = row.images[0];
        const imgPreview = firstImg
          ? `<img src="${esc(firstImg.md || firstImg.lg)}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;vertical-align:middle;" />`
          : '';
        const div = document.createElement('div');
        div.className = 'variant-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 90px 70px auto auto auto;gap:6px;align-items:center;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;';
        div.innerHTML = `
          <input class="form-input variant-brand" style="padding:6px 8px;" placeholder="Apple" value="${esc(row.deviceBrand)}" data-idx="${idx}" data-field="deviceBrand" />
          <input class="form-input variant-family" style="padding:6px 8px;" placeholder="iPhone 12" value="${esc(row.deviceFamily)}" data-idx="${idx}" data-field="deviceFamily" />
          <input class="form-input variant-model" style="padding:6px 8px;" placeholder="Pro Max (opcional)" value="${esc(row.model)}" data-idx="${idx}" data-field="model" />
          <input class="form-input variant-price" type="number" step="1" style="padding:6px 8px;" placeholder="Precio" value="${row.price !== '' ? row.price : ''}" data-idx="${idx}" data-field="price" />
          <input class="form-input variant-stock" type="number" style="padding:6px 8px;" placeholder="Stock" value="${row.stock !== '' ? row.stock : ''}" data-idx="${idx}" data-field="stock" />
          <select class="form-select variant-quality" style="padding:6px 8px;" data-idx="${idx}" data-field="quality">
            <option value="">—</option>
            <option value="Original"${row.quality === 'Original' ? ' selected' : ''}>Original</option>
            <option value="OEM"${row.quality === 'OEM' ? ' selected' : ''}>OEM</option>
            <option value="AAA"${row.quality === 'AAA' ? ' selected' : ''}>AAA</option>
            <option value="GX"${row.quality === 'GX' ? ' selected' : ''}>GX</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm variant-img-btn" data-idx="${idx}" title="Imagen">${imgPreview || '📷'}</button>
          <input type="file" accept="image/*" class="variant-img-input" style="display:none;" data-idx="${idx}" />
          <button type="button" class="btn btn-danger btn-sm variant-remove-btn" data-idx="${idx}" style="padding:6px 8px;" title="Eliminar">✕</button>
        `;
        container.appendChild(div);
      });

      // Bind text/number/select change handlers
      container.querySelectorAll('[data-field]').forEach((input) => {
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const field = e.target.dataset.field;
          variantRows[idx][field] = e.target.value;
          updateTechPreview();
        });
        input.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          const field = e.target.dataset.field;
          variantRows[idx][field] = e.target.value;
          updateTechPreview();
        });
      });

      // Image upload per variant
      container.querySelectorAll('.variant-img-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const fileInput = container.querySelector(`.variant-img-input[data-idx="${idx}"]`);
          if (fileInput) fileInput.click();
        });
      });
      container.querySelectorAll('.variant-img-input').forEach((fileInput) => {
        fileInput.addEventListener('change', async (e) => {
          const idx = parseInt(fileInput.dataset.idx);
          const file = e.target.files[0];
          if (!file || variantRows[idx]._uploadingImage) return;
          variantRows[idx]._uploadingImage = true;
          try {
            const base64 = await fileToBase64(file);
            const cleanB64 = base64.split(',')[1] || base64;
            const tempId = 'temp_variant_' + Date.now();
            const result = await Api.uploadImage(tempId, cleanB64);
            if (result.ok && result.urls) {
              variantRows[idx].images = [{ lg: result.urls.lg, md: result.urls.md, sm: result.urls.sm }];
              renderVariantRows();
              showToast('Imagen de variante subida');
            }
          } catch (err) {
            showToast('Error al subir imagen de variante: ' + err.message, 'error');
          } finally {
            variantRows[idx]._uploadingImage = false;
            e.target.value = '';
          }
        });
      });

      // Remove buttons
      container.querySelectorAll('.variant-remove-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          variantRows.splice(idx, 1);
          renderVariantRows();
          updateTechPreview();
        });
      });
    }

    function collectVariants() {
      return variantRows.map((row) => ({
        variantId: row.variantId,
        deviceBrand: row.deviceBrand,
        deviceFamily: row.deviceFamily,
        model: row.model,
        price: row.price !== '' ? parseFloat(row.price) : null,
        stock: row.stock !== '' ? parseInt(row.stock) : null,
        quality: row.quality,
        images: row.images,
      }));
    }

    function deriveVariantSummary(variants) {
      const prices = variants
        .map((variant) => Number(variant.price))
        .filter((price) => Number.isFinite(price) && price > 0);
      const stocks = variants
        .map((variant) => Number(variant.stock))
        .filter((stock) => Number.isFinite(stock) && stock >= 0);
      const qualities = variants
        .map((variant) => (variant.quality || '').trim())
        .filter(Boolean);
      const uniqueQualities = [...new Set(qualities)];
      return {
        price: prices.length ? Math.min(...prices) : null,
        stock: stocks.reduce((sum, stock) => sum + stock, 0),
        quality: uniqueQualities.length === 1 ? uniqueQualities[0] : '',
      };
    }

    function isVariantMode() {
      return document.querySelector('input[name="productType"]:checked')?.value === 'variants';
    }

    function stockLabel(stock) {
      const count = Number(stock) || 0;
      if (count <= 0) return { text: 'Agotado', tone: 'danger' };
      if (count < 5) return { text: `Últimas ${count} unidades`, tone: 'warning' };
      return { text: `${count} unidades disponibles`, tone: 'success' };
    }

    function renderCompatibilityTags() {
      pCompatibilityTags.innerHTML = compatibilityTags.map((tag, idx) => `
        <span class="compat-tag">${esc(tag)}<button type="button" data-idx="${idx}" aria-label="Eliminar ${esc(tag)}">×</button></span>
      `).join('');
      pCompatibilityTags.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          compatibilityTags.splice(parseInt(btn.dataset.idx), 1);
          renderCompatibilityTags();
          updateTechPreview();
        });
      });
    }

    function addCompatibilityTag(value) {
      const tags = (value || '').split(',').map((item) => item.trim()).filter(Boolean);
      if (tags.length === 0) return;
      tags.forEach((tag) => {
        const exists = compatibilityTags.some((item) => item.toLowerCase() === tag.toLowerCase());
        if (!exists) compatibilityTags.push(tag);
      });
      pCompatibilityInput.value = '';
      renderCompatibilityTags();
      updateTechPreview();
    }

    function updateStockHint() {
      const stock = stockLabel(pStock.value);
      pStockHint.textContent = stock.text;
      pStockHint.className = `stock-hint ${stock.tone}`;
    }

    function updateTechPreview() {
      updateStockHint();
      const variants = isVariantMode() ? collectVariants() : [];
      const variantSummary = variants.length ? deriveVariantSummary(variants) : null;
      const stock = stockLabel(variantSummary ? variantSummary.stock : pStock.value);
      const quality = variantSummary?.quality || pQuality.value || 'Calidad sin especificar';
      const shown = compatibilityTags.slice(0, 3);
      const more = compatibilityTags.length - shown.length;
      pTechPreview.innerHTML = `
        <div class="tech-preview-item ${stock.tone}">
          <span>📦</span>
          <strong>${stock.text}</strong>
        </div>
        <div class="tech-preview-item">
          <span>🏷️</span>
          <strong>${esc(quality)}</strong>
        </div>
        <div class="tech-preview-item">
          <span>📱</span>
          <strong>${shown.length ? shown.map(esc).join(', ') + (more > 0 ? ` +${more} más` : '') : 'Compatibilidad pendiente'}</strong>
        </div>
        <div class="tech-preview-item">
          <span>🚚</span>
          <strong>${esc(pShippingTime.value || 'Tiempo de envío pendiente')}</strong>
        </div>
        <div class="tech-preview-item">
          <span>🛡️</span>
          <strong>${esc(pWarranty.value || 'Garantía pendiente')}</strong>
        </div>
      `;
    }

    function renderImagePreviews() {
      const container = document.getElementById('pImagesPreview');
      container.innerHTML = '';
      uploadedImages.forEach((img, idx) => {
        const src = img.md || img.lg;
        const div = $el('div', { className: 'image-preview-item' });
        div.innerHTML = `
          <img src="${esc(src)}" alt="Imagen ${idx + 1}" />
          <button type="button" class="image-preview-remove" data-idx="${idx}">✕</button>
        `;
        container.appendChild(div);
      });

      // Attach remove handlers
      container.querySelectorAll('.image-preview-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          uploadedImages.splice(idx, 1);
          renderImagePreviews();
        });
      });
    }

    // Image upload via file picker
    document.getElementById('pImageUploadBtn').addEventListener('click', () => {
      document.getElementById('pImageInput').click();
    });

    document.getElementById('pImageInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || isUploading) return;

      // Use temp ID for initial upload, will be replaced on save
      const tempId = 'temp_' + Date.now();
      isUploading = true;
      const btn = document.getElementById('pImageUploadBtn');
      btn.textContent = '⏳ Subiendo…';
      btn.disabled = true;

      try {
        const base64 = await fileToBase64(file);
        // Strip data:image/...;base64, prefix
        const cleanB64 = base64.split(',')[1] || base64;
        const result = await Api.uploadImage(tempId, cleanB64);
        if (result.ok && result.urls) {
          uploadedImages.push({
            lg: result.urls.lg,
            md: result.urls.md,
            sm: result.urls.sm,
          });
          renderImagePreviews();
          showToast('Imagen subida correctamente');
        }
      } catch (err) {
        showToast('Error al subir imagen: ' + err.message, 'error');
      } finally {
        isUploading = false;
        btn.textContent = '📷 Agregar imagen';
        btn.disabled = false;
        e.target.value = ''; // reset file input
      }
    });

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function openModal(product = null) {
      editingId = product ? product.productId : null;
      modalTitle.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
      document.getElementById('modalSaveBtn').textContent = product ? 'Actualizar' : 'Guardar';

      pName.value = product ? product.name : '';
      pDesc.value = product ? (product.description || '') : '';
      pPrice.value = product ? product.price : '';
      pStock.value = product ? product.stock : '';
      pCategory.value = product ? (product.category || 'pantallas') : 'pantallas';
      pQuality.value = product ? (product.quality || '') : '';
      pShippingTime.value = product ? (product.shippingTime || '') : '';
      pWarranty.value = product ? (product.warranty || '') : '';
      const heroToggle = document.getElementById('pHeroFeatured');
      if (heroToggle) heroToggle.checked = product ? !!product.heroFeatured : false;
      compatibilityTags = Array.isArray(product?.compatibility) ? product.compatibility.slice() : [];
      renderCompatibilityTags();
      updateTechPreview();

      // Restore images from existing product
      uploadedImages = [];
      if (product && product.images && product.images.length > 0) {
        uploadedImages = product.images.map(img => ({...img}));
      } else if (product && product.imageUrl) {
        uploadedImages.push({ lg: product.imageUrl, md: product.imageUrl, sm: product.imageUrl });
      }
      renderImagePreviews();

      // Restore variant rows and set product type
      variantRows = Array.isArray(product?.variants) ? product.variants.map(newVariantRow) : [];
      renderVariantRows();
      const isVariants = variantRows.length > 0;
      const typeRadio = document.querySelector(`input[name="productType"][value="${isVariants ? 'variants' : 'simple'}"]`);
      if (typeRadio) typeRadio.checked = true;
      syncVariantToggle();

      modal.classList.add('open');
    }

    function closeModal() {
      modal.classList.remove('open');
      editingId = null;
      compatibilityTags = [];
      variantRows = [];
      productForm.reset();
      const simpleRadio = document.querySelector('input[name="productType"][value="simple"]');
      if (simpleRadio) simpleRadio.checked = true;
      syncVariantToggle();
    }

    document.getElementById('newProductBtn').addEventListener('click', () => openModal());
    document.getElementById('refreshProductsBtn').addEventListener('click', () => renderProducts());
    document.getElementById('addVariantBtn').addEventListener('click', () => {
      variantRows.push(newVariantRow());
      renderVariantRows();
      updateTechPreview();
    });

    function syncVariantToggle() {
      const isVariants = isVariantMode();
      const simpleFields = document.getElementById('simpleFields');
      const variantFields = document.getElementById('variantFields');
      const pPrice = document.getElementById('pPrice');
      if (simpleFields) simpleFields.style.display = isVariants ? 'none' : 'block';
      if (variantFields) variantFields.style.display = isVariants ? 'block' : 'none';
      if (pPrice) pPrice.required = !isVariants;
      // Highlight selected type card
      document.getElementById('typeCardSimple')?.classList.toggle('active', !isVariants);
      document.getElementById('typeCardVariant')?.classList.toggle('active', isVariants);
      updateTechPreview();
    }

    document.querySelectorAll('input[name="productType"]').forEach(r => r.addEventListener('change', syncVariantToggle));

    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    pCompatibilityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addCompatibilityTag(pCompatibilityInput.value);
      } else if (e.key === 'Backspace' && !pCompatibilityInput.value && compatibilityTags.length) {
        compatibilityTags.pop();
        renderCompatibilityTags();
        updateTechPreview();
      }
    });
    pCompatibilityInput.addEventListener('blur', () => addCompatibilityTag(pCompatibilityInput.value));
    [pStock, pQuality, pShippingTime, pWarranty].forEach((input) => {
      input.addEventListener('input', updateTechPreview);
      input.addEventListener('change', updateTechPreview);
    });

    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Wait for any ongoing upload to finish
      if (isUploading) {
        showToast('Espera a que termine la subida de imagen', 'error');
        return;
      }
      const usingVariants = isVariantMode();
      const variants = usingVariants ? collectVariants() : [];
      if (usingVariants) {
        if (!variants.length) {
          showToast('Agrega al menos una variante por modelo', 'error');
          return;
        }
        const incompleteVariant = variants.find((variant) => (
          !String(variant.deviceFamily || '').trim()
          || !Number.isFinite(Number(variant.price))
          || Number(variant.price) <= 0
          || variant.stock === null
          || !Number.isFinite(Number(variant.stock))
          || Number(variant.stock) < 0
        ));
        if (incompleteVariant) {
          showToast('Revisa las variantes: cada modelo necesita modelo, precio y stock válido', 'error');
          return;
        }
      }
      const variantSummary = usingVariants ? deriveVariantSummary(variants) : null;
      const payload = {
        name: pName.value.trim(),
        description: pDesc.value.trim(),
        price: usingVariants ? variantSummary.price : parseFloat(pPrice.value),
        stock: usingVariants ? variantSummary.stock : parseInt(pStock.value) || 0,
        category: pCategory.value,
        quality: usingVariants ? (variantSummary.quality || pQuality.value) : pQuality.value,
        compatibility: compatibilityTags,
        shippingTime: pShippingTime.value.trim(),
        warranty: pWarranty.value.trim(),
        images: uploadedImages,
        variants,
        heroFeatured: document.getElementById('pHeroFeatured')?.checked || false,
      };

      try {
        if (editingId) {
          await Api.put(`/api/admin/products/${editingId}`, payload);
          showToast('Producto actualizado correctamente');
        } else {
          const result = await Api.post('/api/admin/products', payload);
          // Re-upload images with the real productId
          if (result.product && result.product.productId && uploadedImages.length > 0) {
            const realId = result.product.productId;
            for (let i = 0; i < uploadedImages.length; i++) {
              const img = uploadedImages[i];
              // Only re-upload if it uses the temp ID pattern
              if (img.lg && img.lg.includes('/images/products/temp_')) {
                // Image was uploaded with temp ID — we need to re-upload with real ID
                // For now, update the product with correct image paths
                await Api.put(`/api/admin/products/${realId}`, { images: uploadedImages });
                break;
              }
            }
          }
          showToast('Producto creado correctamente');
        }
        closeModal();
        renderProducts();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Edit buttons (delegated)
    tbody.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-btn');
      const deleteBtn = e.target.closest('.delete-btn');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const product = products.find((p) => p.productId === id);
        if (product) openModal(product);
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
        try {
          await Api.delete(`/api/admin/products/${id}`);
          showToast('Producto eliminado');
          renderProducts();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  }

  // ---- DESIGN SETTINGS ----
  async function renderDesignSettings() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/site-settings');
      renderDesignSettingsContent(data.settings || { visualTheme: 'dark' });
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function renderDesignSettingsContent(settings) {
    const currentTheme = settings.visualTheme || 'dark';
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Diseño del sitio</h1>
          <p class="page-subtitle">Cambia la dirección visual del ecommerce sin tocar código.</p>
        </div>
        <a class="btn btn-secondary" href="/" target="_blank" rel="noopener">Abrir tienda</a>
      </div>

      <div class="settings-layout">
        <section class="settings-panel">
          <div class="form-section-heading">
            <span class="form-section-icon">🎨</span>
            <div>
              <h3>Estilo visual público</h3>
              <p>Escoge cómo se verá la tienda para los clientes.</p>
            </div>
          </div>

          <form id="designSettingsForm">
            <div class="theme-choice-grid">
              <label class="theme-choice-card ${currentTheme === 'dark' ? 'active' : ''}">
                <input type="radio" name="visualTheme" value="dark" ${currentTheme === 'dark' ? 'checked' : ''} />
                <span class="theme-preview theme-preview-dark">
                  <span></span><span></span><span></span>
                </span>
                <strong>Dark premium</strong>
                <small>La versión actual: modo oscuro, glassmorphism suave y acento morado.</small>
              </label>

              <label class="theme-choice-card ${currentTheme === 'repair' ? 'active' : ''}">
                <input type="radio" name="visualTheme" value="repair" ${currentTheme === 'repair' ? 'checked' : ''} />
                <span class="theme-preview theme-preview-repair">
                  <span></span><span></span><span></span>
                </span>
                <strong>Repair catalog</strong>
                <small>Inspirado en tienda técnica tipo iFixit: más claro, directo y orientado a piezas.</small>
              </label>
            </div>

            <div class="settings-note">
              <strong>Recomendación:</strong> usa Repair catalog si quieres que el sitio se sienta menos IA/SaaS y más tienda especializada en repuestos.
            </div>

            <div class="modal-footer settings-footer">
              <button type="submit" class="btn btn-gradient" id="saveDesignSettingsBtn">Guardar diseño</button>
            </div>
          </form>
        </section>

        <aside class="settings-preview-card">
          <span class="settings-preview-kicker">Preview conceptual</span>
          <h2 id="settingsPreviewTitle">${currentTheme === 'repair' ? 'Repair catalog' : 'Dark premium'}</h2>
          <p id="settingsPreviewCopy">${currentTheme === 'repair'
            ? 'Catálogo técnico, fondos claros, bordes limpios y señales de compatibilidad.'
            : 'Experiencia oscura, premium, con tarjetas glass y acentos morados.'}</p>
          <div class="settings-mini-card">
            <span id="settingsPreviewBadge">${currentTheme === 'repair' ? 'Compatible' : 'GX'}</span>
            <strong>Display iPhone 12</strong>
            <small>Stock, calidad y modelo visibles antes de comprar.</small>
          </div>
        </aside>
      </div>`;

    const form = document.getElementById('designSettingsForm');
    const cards = [...document.querySelectorAll('.theme-choice-card')];
    const syncCards = () => {
      const selected = form.querySelector('input[name="visualTheme"]:checked')?.value || 'dark';
      cards.forEach((card) => {
        card.classList.toggle('active', card.querySelector('input')?.value === selected);
      });
      document.getElementById('settingsPreviewTitle').textContent = selected === 'repair' ? 'Repair catalog' : 'Dark premium';
      document.getElementById('settingsPreviewCopy').textContent = selected === 'repair'
        ? 'Catálogo técnico, fondos claros, bordes limpios y señales de compatibilidad.'
        : 'Experiencia oscura, premium, con tarjetas glass y acentos morados.';
      document.getElementById('settingsPreviewBadge').textContent = selected === 'repair' ? 'Compatible' : 'GX';
    };

    form.querySelectorAll('input[name="visualTheme"]').forEach((input) => {
      input.addEventListener('change', syncCards);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const visualTheme = form.querySelector('input[name="visualTheme"]:checked')?.value || 'dark';
      const button = document.getElementById('saveDesignSettingsBtn');
      button.disabled = true;
      button.textContent = 'Guardando…';
      try {
        await Api.put('/api/admin/site-settings', { visualTheme });
        showToast('Diseño actualizado. La tienda tomará este estilo al cargar.');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Guardar diseño';
      }
    });
  }

  // ---- LEADS ----
  async function renderLeads() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/leads');
      renderLeadsTable(data.leads || []);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function renderLeadsTable(leads) {
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Leads</h1>
          <p class="page-subtitle">Solicitudes de contacto de la landing page</p>
        </div>
        <span style="font-size:0.875rem;color:var(--text-secondary);">${leads.length} total</span>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Mensaje</th>
              <th>Contactado</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="leadsBody"></tbody>
        </table>
      </div>`;

    const tbody = document.getElementById('leadsBody');

    if (leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin leads aún</td></tr>`;
      return;
    }

    leads.forEach((lead) => {
      const tr = $el('tr', { dataset: { leadId: lead.id || lead.leadId } });
      const contacted = !!lead.contacted;
      tr.innerHTML = `
        <td><strong>${esc(lead.name || '—')}</strong></td>
        <td style="color:var(--info);">${esc(lead.email || '—')}</td>
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);">${esc(lead.message || '—')}</td>
        <td>
          <span class="status-dot ${contacted ? 'contacted' : 'pending'}"></span>
          <span style="font-size:0.8125rem;color:var(--text-secondary);">${contacted ? 'Contactado' : 'Pendiente'}</span>
        </td>
        <td style="color:var(--text-secondary);font-size:0.8125rem;">${formatDate(lead.createdAt)}</td>
        <td>
          ${!contacted ? `<button class="btn btn-secondary btn-sm contact-btn" data-id="${lead.id || lead.leadId}">✅ Marcar Contactado</button>` : `<span style="color:var(--success);font-size:0.8125rem;">✓ Completado</span>`}
        </td>`;
      tbody.appendChild(tr);
    });

    // Mark contacted (delegated)
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('.contact-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      try {
        await Api.put(`/api/admin/leads/${id}`, { contacted: true });
        showToast('Lead marcado como contactado');
        renderLeads();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ---- QUOTES ----
  async function renderQuotes() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/quotes');
      renderQuotesTable(data.quotes || []);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function renderQuotesTable(quotes) {
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Cotizaciones</h1>
          <p class="page-subtitle">Solicitudes de cotización de planes</p>
        </div>
        <span style="font-size:0.875rem;color:var(--text-secondary);">${quotes.length} total</span>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Notas</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="quotesBody"></tbody>
        </table>
      </div>`;

    const tbody = document.getElementById('quotesBody');

    if (quotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin cotizaciones aún</td></tr>`;
      return;
    }

    quotes.forEach((q) => {
      const tr = $el('tr', { dataset: { quoteId: q.quoteId } });
      tr.innerHTML = `
        <td><strong>${esc(q.name || '—')}</strong></td>
        <td style="color:var(--info);">${esc(q.email || '—')}</td>
        <td>${esc(q.plan || '—')}</td>
        <td><span class="badge badge-${q.status || 'pending'}">${esc(q.status || 'pending')}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);">${esc(q.notes || '—')}</td>
        <td style="color:var(--text-secondary);font-size:0.8125rem;">${formatDate(q.createdAt)}</td>
        <td>
          <select class="form-select status-select" data-id="${q.quoteId}" style="min-width:100px;padding:6px 30px 6px 10px;font-size:0.8125rem;">
            <option value="pending" ${q.status === 'pending' ? 'selected' : ''}>Pendiente</option>
            <option value="contacted" ${q.status === 'contacted' ? 'selected' : ''}>Contactado</option>
            <option value="closed" ${q.status === 'closed' ? 'selected' : ''}>Cerrada</option>
          </select>
        </td>`;
      tbody.appendChild(tr);
    });

    // Status change handler (delegated)
    tbody.addEventListener('change', async (e) => {
      const sel = e.target.closest('.status-select');
      if (!sel) return;
      const quoteId = sel.dataset.id;
      const status = sel.value;

      try {
        await Api.put(`/api/admin/quotes/${quoteId}`, { status });
        showToast(`Cotización actualizada a "${status}"`);
        // Update badge
        const row = sel.closest('tr');
        const badge = row.querySelector('.badge');
        if (badge) {
          badge.className = `badge badge-${status}`;
          badge.textContent = status;
        }
      } catch (err) {
        showToast(err.message, 'error');
        renderQuotes(); // Re-render on error to reset selects
      }
    });
  }

  // ---- ORDERS ----
  let allOrdersCache = [];
  let activeOrderFilter = 'ALL';
  let orderSortDir = 'desc'; // 'desc' = más recientes primero

  const ORDER_FILTERS = [
    { key: 'ALL',              label: 'Todos' },
    { key: 'APPROVED',         label: '✅ Aprobados' },
    { key: 'READY_TO_FULFILL', label: '📦 Por despachar' },
    { key: 'SHIPPED',          label: '🚚 En camino' },
    { key: 'DELIVERED',        label: '🏠 Entregados' },
    { key: 'CHECKOUT_CREATED', label: '⏳ Pendientes' },
    { key: 'CANCELLED',        label: '❌ Cancelados' },
  ];

  async function renderOrders() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/orders');
      allOrdersCache = data.orders || [];
      activeOrderFilter = 'ALL';
      orderSortDir = 'desc';
      renderOrdersTable(allOrdersCache);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function getFilteredSortedOrders() {
    const filtered = activeOrderFilter === 'ALL'
      ? allOrdersCache.slice()
      : allOrdersCache.filter(o =>
          o.status === activeOrderFilter || o.fulfillmentStatus === activeOrderFilter
        );
    filtered.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return orderSortDir === 'desc' ? tb - ta : ta - tb;
    });
    return filtered;
  }

  function refreshOrderTable() {
    const orders = getFilteredSortedOrders();
    const tbody = document.getElementById('ordersBody');
    const countEl = document.getElementById('ordersCount');
    const sortBtn = document.getElementById('orderSortBtn');
    if (countEl) countEl.textContent = orders.length + ' total';
    if (sortBtn) sortBtn.textContent = orderSortDir === 'desc' ? '↓ Más recientes' : '↑ Más antiguos';
    if (tbody) { tbody.innerHTML = ''; renderOrderRows(orders, tbody); }
  }

  function applyOrderFilter(key) {
    activeOrderFilter = key;
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === key);
    });
    refreshOrderTable();
  }

  function toggleOrderSort() {
    orderSortDir = orderSortDir === 'desc' ? 'asc' : 'desc';
    refreshOrderTable();
  }


  function formatCurrencyCopFromCents(cents) {
    return '$' + Number((Number(cents) || 0) / 100).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' COP';
  }

  function paymentBadge(status) {
    return ({
      APPROVED: 'badge-active',
      PENDING: 'badge-pending',
      DECLINED: 'badge-inactive',
      CHECKOUT_CREATED: 'badge-pending',
    })[status] || 'badge-pending';
  }

  function fulfillmentBadge(status) {
    return ({
      READY_TO_FULFILL: 'badge-pending',
      PROCESSING: 'badge-contacted',
      SHIPPED: 'badge-active',
      DELIVERED: 'badge-active',
      CANCELLED: 'badge-inactive',
      PENDING_PAYMENT: 'badge-pending',
    })[status] || 'badge-pending';
  }

  function renderOrderRows(orders, tbody) {
    orders.forEach((order) => {
      const tr = $el('tr', { dataset: { reference: order.reference || '' } });
      tr.innerHTML = `
        <td><span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:9999px;background:rgba(99,102,241,0.14);border:1px solid rgba(99,102,241,0.28);color:#c4b5fd;font-size:0.75rem;font-weight:700;">${esc(order.reference || '—')}</span><br><span style="color:var(--text-secondary);font-size:0.75rem;">${esc(order.provider || '—')}</span></td>
        <td>${esc(order.customer?.fullName || '—')}<br><span style="color:var(--text-secondary);font-size:0.75rem;">${esc(order.customer?.email || '—')}</span></td>
        <td><span class="badge ${paymentBadge(order.status)}">${esc(order.status || '—')}</span></td>
        <td><span class="badge ${fulfillmentBadge(order.fulfillmentStatus)}">${esc(order.fulfillmentStatus || '—')}</span></td>
        <td>${formatCurrencyCopFromCents(order.amountInCents || 0)}</td>
        <td style="color:var(--text-secondary);font-size:0.8125rem;">${formatDate(order.createdAt)}</td>
        <td><button class="btn btn-secondary btn-sm order-manage-btn" data-reference="${order.reference}">Gestionar</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderOrdersTable(orders) {
    const filterBtns = ORDER_FILTERS.map(f =>
      `<button class="btn btn-sm order-filter-btn${f.key === activeOrderFilter ? ' active' : ''}" data-filter="${f.key}">${f.label}</button>`
    ).join('');

    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Pedidos</h1>
          <p class="page-subtitle">Pedidos aprobados, preparación y despacho</p>
        </div>
        <span id="ordersCount" style="font-size:0.875rem;color:var(--text-secondary);">${orders.length} total</span>
      </div>

      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px;">
        ${filterBtns}
        <button id="orderSortBtn" class="order-filter-btn order-sort-btn" style="margin-left:auto;">↓ Más recientes</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th>Despacho</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="ordersBody"></tbody>
        </table>
      </div>

      <div class="modal-overlay" id="orderModal">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">Gestionar pedido</h2>
            <button class="modal-close" id="orderModalCloseBtn">✕</button>
          </div>
          <div id="orderModalContent"></div>
        </div>
      </div>`;

    const tbody = document.getElementById('ordersBody');
    const modal = document.getElementById('orderModal');
    const modalContent = document.getElementById('orderModalContent');

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin pedidos aún</td></tr>`;
      return;
    }

    function notificationLabel(order) {
      const status = order?.notifications?.customerConfirmation?.status || '';
      if (status === 'SENT') return 'Enviado';
      if (status === 'FAILED') return 'Falló';
      return 'Pendiente';
    }

    function closeModal() {
      modal.classList.remove('open');
      modalContent.innerHTML = '';
    }

    function openModal(order) {
      const itemsHtml = (order.items || []).map((item) => `
        <tr>
          <td>${esc(item.name || 'Producto')}</td>
          <td>${item.quantity || 0}</td>
          <td>${formatCurrencyCopFromCents(item.subtotalCents || 0)}</td>
        </tr>
      `).join('');

      modalContent.innerHTML = `
        <div class="form-group">
          <label class="form-label">Referencia</label>
          <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:9999px;background:rgba(99,102,241,0.14);border:1px solid rgba(99,102,241,0.28);color:#c4b5fd;font-weight:700;">${esc(order.reference || '—')}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <div>${esc(order.customer?.fullName || '—')}<br>
            <span style="color:var(--text-secondary);">${esc(order.customer?.email || '—')}</span><br>
            ${order.customer?.phoneNumber ? `<span style="color:var(--text-secondary);">${esc(order.customer.phoneNumber)}</span>` : ''}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Total</label>
            <div>${formatCurrencyCopFromCents(order.amountInCents || 0)}</div>
          </div>
        </div>
        ${order.customer?.shippingAddress ? `
        <div class="form-group">
          <label class="form-label">📍 Dirección de envío</label>
          <div style="padding:10px 14px;border-radius:10px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);color:var(--text-primary);font-size:0.875rem;">
            ${esc(order.customer.shippingAddress)}
          </div>
        </div>` : ''}
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Estado de pago</label>
            <div><span class="badge ${paymentBadge(order.status)}">${esc(order.status || '—')}</span></div>
          </div>
          <div class="form-group">
            <label class="form-label">Correo de confirmación</label>
            <div>${notificationLabel(order)}</div>
          </div>
        </div>
        <div class="table-container" style="margin:16px 0;">
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>
        <form id="orderUpdateForm">
          <div class="form-group">
            <label class="form-label">Estado de despacho</label>
            <select class="form-select" id="orderFulfillmentStatus">
              ${['PENDING_PAYMENT','READY_TO_FULFILL','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map((status) => (
                `<option value="${status}" ${order.fulfillmentStatus === status ? 'selected' : ''}>${status}</option>`
              )).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Transportadora</label>
              <input class="form-input" id="orderCourier" value="${esc(order.courier || '')}" placeholder="Servientrega, Coordinadora…" />
            </div>
            <div class="form-group">
              <label class="form-label">Tracking</label>
              <input class="form-input" id="orderTrackingNumber" value="${esc(order.trackingNumber || '')}" placeholder="Guía o tracking" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notas internas</label>
            <textarea class="form-textarea" id="orderFulfillmentNotes" placeholder="Empacado, pendiente inventario, despacho parcial…">${esc(order.fulfillmentNotes || '')}</textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="orderModalCancelBtn">Cancelar</button>
            <button type="submit" class="btn btn-gradient">Guardar cambios</button>
          </div>
        </form>
      `;
      modal.classList.add('open');

      document.getElementById('orderModalCancelBtn').addEventListener('click', closeModal);
      document.getElementById('orderUpdateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await Api.put(`/api/admin/orders/${order.reference}`, {
            fulfillmentStatus: document.getElementById('orderFulfillmentStatus').value,
            courier: document.getElementById('orderCourier').value.trim(),
            trackingNumber: document.getElementById('orderTrackingNumber').value.trim(),
            fulfillmentNotes: document.getElementById('orderFulfillmentNotes').value.trim(),
          });
          showToast('Pedido actualizado correctamente');
          closeModal();
          renderOrders();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    refreshOrderTable();

    // Filter + sort buttons
    $main.addEventListener('click', (e) => {
      const sortBtn = e.target.closest('#orderSortBtn');
      if (sortBtn) { toggleOrderSort(); return; }
      const filterBtn = e.target.closest('.order-filter-btn');
      if (filterBtn && filterBtn.dataset.filter) { applyOrderFilter(filterBtn.dataset.filter); return; }
      const manageBtn = e.target.closest('.order-manage-btn');
      if (manageBtn) {
        const order = allOrdersCache.find(o => o.reference === manageBtn.dataset.reference);
        if (order) openModal(order);
      }
    });

    document.getElementById('orderModalCloseBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  /* =========================================================
     ACTIVE LINK TRACKING
     ========================================================= */
  function updateActiveLink() {
    const hash = window.location.hash || '#/login';
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });
  }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    $main = document.getElementById('main-content');
    $sidebar = document.querySelector('.sidebar');
    $overlay = document.querySelector('.sidebar-overlay');
    $sidebarToggle = document.querySelector('.sidebar-toggle');
    $toastContainer = document.querySelector('.toast-container');

    // Sidebar toggle
    $sidebarToggle.addEventListener('click', () => {
      $sidebar.classList.toggle('open');
      $overlay.classList.toggle('open');
    });
    $overlay.addEventListener('click', closeSidebar);

    // Register routes
    registerRoute('#/login', renderLogin);
    registerRoute('#/dashboard', renderDashboard);
    registerRoute('#/products', renderProducts);
    registerRoute('#/leads', renderLeads);
    registerRoute('#/quotes', renderQuotes);
    registerRoute('#/orders', renderOrders);
    registerRoute('#/design', renderDesignSettings);

    // Router listening
    window.addEventListener('hashchange', () => {
      handleRoute();
      updateActiveLink();
    });

    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = link.getAttribute('href');
        navigate(hash);
      });
    });

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      Auth.logout();
      showToast('Sesión cerrada');
    });

    // First route
    handleRoute();
    updateActiveLink();
  }

  /* ---- Boot on DOM ready ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    navigate,
    showToast,
  };
})();
