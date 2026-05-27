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
          <button class="btn btn-secondary" id="seedProductsBtn">🧪 Poblar ejemplos</button>
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
            <div class="product-form-section">
              <div class="form-section-heading">
                <span class="form-section-icon">📦</span>
                <div>
                  <h3>Información principal</h3>
                  <p>Datos visibles en catálogo y detalle del producto.</p>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Nombre del producto</label>
                <input class="form-input" id="pName" required placeholder="Ej: Pantalla OLED iPhone 11" />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción corta</label>
                <textarea class="form-textarea" id="pDesc" placeholder="Describe calidad, modelo, instalación o notas importantes"></textarea>
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
                  <label class="form-label">Categoría</label>
                  <select class="form-select" id="pCategory"></select>
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

            <div class="product-form-section">
              <div class="form-section-heading">
                <span class="form-section-icon">🧪</span>
                <div>
                  <h3>Información técnica</h3>
                  <p>Ayuda al comprador a validar compatibilidad, calidad y garantía.</p>
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
                  <label class="form-label">Tiempo de envío</label>
                  <input class="form-input" id="pShippingTime" placeholder="Ej: 2-4 días hábiles" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Garantía</label>
                  <input class="form-input" id="pWarranty" placeholder="Ej: Garantía de 30 días" />
                </div>
                <div class="form-group">
                  <label class="form-label">Compatibilidad</label>
                  <div class="tag-input-shell" id="pCompatibilityShell">
                    <div class="tag-list" id="pCompatibilityTags"></div>
                    <input class="tag-input" id="pCompatibilityInput" placeholder="Buscar o agregar modelo…" />
                  </div>
                  <div class="form-helper">Enter o coma para agregar. Ej: iPhone 11, iPhone XR.</div>
                </div>
              </div>
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
        tr.innerHTML = `
          <td><strong>${esc(p.name)}</strong></td>
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
      const stock = stockLabel(pStock.value);
      const shown = compatibilityTags.slice(0, 3);
      const more = compatibilityTags.length - shown.length;
      pTechPreview.innerHTML = `
        <div class="tech-preview-item ${stock.tone}">
          <span>📦</span>
          <strong>${stock.text}</strong>
        </div>
        <div class="tech-preview-item">
          <span>🏷️</span>
          <strong>${esc(pQuality.value || 'Calidad sin especificar')}</strong>
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

      modal.classList.add('open');
    }

    function closeModal() {
      modal.classList.remove('open');
      editingId = null;
      compatibilityTags = [];
      productForm.reset();
    }

    document.getElementById('newProductBtn').addEventListener('click', () => openModal());
    document.getElementById('refreshProductsBtn').addEventListener('click', () => renderProducts());
    document.getElementById('seedProductsBtn').addEventListener('click', async () => {
      if (!confirm('Esto poblará productos de ejemplo para el catálogo. ¿Continuar?')) return;
      try {
        const result = await Api.post('/api/admin/products/seed', {});
        showToast(`Catálogo de ejemplo listo (${result.seeded || 0} productos)`);
        renderProducts();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

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
      const payload = {
        name: pName.value.trim(),
        description: pDesc.value.trim(),
        price: parseFloat(pPrice.value),
        stock: parseInt(pStock.value) || 0,
        category: pCategory.value,
        quality: pQuality.value,
        compatibility: compatibilityTags,
        shippingTime: pShippingTime.value.trim(),
        warranty: pWarranty.value.trim(),
        images: uploadedImages,
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
  async function renderOrders() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/orders');
      renderOrdersTable(data.orders || []);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  async function renderUsers() {
    showLoading();
    try {
      const data = await Api.get('/api/admin/users');
      renderUsersTable(data.users || []);
    } catch (err) {
      $main.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  }

  function renderUsersTable(users) {
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>Usuarios</h2>
          <p>${users.length} cuentas registradas</p>
        </div>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Registro</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.name || '—'}</strong></td>
                <td>${u.email || '—'}</td>
                <td>${u.phone || '—'}</td>
                <td style="font-size:0.8125rem;color:var(--text-secondary);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '—'}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">No hay usuarios registrados.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function formatCurrencyCopFromCents(cents) {
    return '$' + Number((Number(cents) || 0) / 100).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' COP';
  }

  function renderOrdersTable(orders) {
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Pedidos</h1>
          <p class="page-subtitle">Pedidos aprobados, preparación y despacho</p>
        </div>
        <span style="font-size:0.875rem;color:var(--text-secondary);">${orders.length} total</span>
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

    function paymentBadge(status) {
      return ({
        APPROVED: 'badge-active',
        PENDING: 'badge-pending',
        DECLINED: 'badge-inactive',
        CHECKOUT_CREATED: 'badge-pending',
      })[status] || 'badge-pending';
    }

    function notificationLabel(order) {
      const status = order?.notifications?.customerConfirmation?.status || '';
      if (status === 'SENT') return 'Enviado';
      if (status === 'FAILED') return 'Falló';
      return 'Pendiente';
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
            <div>${esc(order.customer?.fullName || '—')}<br><span style="color:var(--text-secondary);">${esc(order.customer?.email || '—')}</span></div>
          </div>
          <div class="form-group">
            <label class="form-label">Total</label>
            <div>${formatCurrencyCopFromCents(order.amountInCents || 0)}</div>
          </div>
        </div>
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

    document.getElementById('orderModalCloseBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.order-manage-btn');
      if (!btn) return;
      const order = orders.find((entry) => entry.reference === btn.dataset.reference);
      if (order) openModal(order);
    });
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
    registerRoute('#/users', renderUsers);

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
