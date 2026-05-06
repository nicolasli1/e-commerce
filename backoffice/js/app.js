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
    $main.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Resumen del negocio NexCore</p>
        </div>
      </div>

      <div class="card-grid">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Total Productos</div>
              <div class="card-value">${data.totalProducts || 0}</div>
            </div>
            <div class="card-icon">📦</div>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Total Leads</div>
              <div class="card-value">${data.totalLeads || 0}</div>
            </div>
            <div class="card-icon">👤</div>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Total Cotizaciones</div>
              <div class="card-value">${data.totalQuotes || 0}</div>
            </div>
            <div class="card-icon">📋</div>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Cotizaciones Recientes</div>
              <div class="card-value">${(data.recentQuotes || []).length}</div>
            </div>
            <div class="card-icon">🕐</div>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Total Pedidos</div>
              <div class="card-value">${data.totalOrders || 0}</div>
            </div>
            <div class="card-icon">🛒</div>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div class="card-title">Listos para despachar</div>
              <div class="card-value">${data.readyToFulfillOrders || 0}</div>
            </div>
            <div class="card-icon">🚚</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-glass);">
          <h3 style="font-size:0.9375rem;font-weight:600;">Últimas Cotizaciones</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody id="recentQuotesBody"></tbody>
        </table>
      </div>`;

    const tbody = document.getElementById('recentQuotesBody');
    const quotes = data.recentQuotes || [];

    if (quotes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-secondary);">Sin cotizaciones recientes</td></tr>`;
    } else {
      quotes.forEach((q) => {
        const statusClass = `badge-${q.status || 'pending'}`;
        const tr = $el('tr');
        tr.innerHTML = `
          <td>${esc(q.name || '—')}</td>
          <td>${esc(q.email || '—')}</td>
          <td>${esc(q.plan || '—')}</td>
          <td><span class="badge ${statusClass}">${esc(q.status || 'pending')}</span></td>
          <td style="color:var(--text-secondary);font-size:0.8125rem;">${formatDate(q.createdAt)}</td>`;
        tbody.appendChild(tr);
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
            <div class="form-group">
              <label class="form-label">Nombre</label>
              <input class="form-input" id="pName" required placeholder="Ej: AMD Ryzen 7 9800X3D" />
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea class="form-textarea" id="pDesc" placeholder="Descripción del producto"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Precio (COP)</label>
                <input class="form-input" type="number" step="1" id="pPrice" required placeholder="289000" />
              </div>
              <div class="form-group">
                <label class="form-label">Stock</label>
                <input class="form-input" type="number" id="pStock" placeholder="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select class="form-select" id="pCategory"></select>
              </div>
              <div class="form-group">
                <label class="form-label">URL de Imagen</label>
                <input class="form-input" id="pImage" placeholder="https://…" />
              </div>
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
        const tr = $el('tr', { dataset: { productId: p.productId, category: p.category || '' } });
        if (isDeleted) tr.classList.add('deleted');
        tr.innerHTML = `
          <td><strong>${esc(p.name)}</strong></td>
          <td>$${Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>${esc(getCategoryLabel(p.category))}</td>
          <td>${p.stock ?? 0}</td>
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
    const pImage = document.getElementById('pImage');

    pCategory.innerHTML = PRODUCT_CATEGORY_OPTIONS.map((option) => (
      `<option value="${option.value}">${option.label}</option>`
    )).join('');

    let editingId = null;

    function openModal(product = null) {
      editingId = product ? product.productId : null;
      modalTitle.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
      document.getElementById('modalSaveBtn').textContent = product ? 'Actualizar' : 'Guardar';

      pName.value = product ? product.name : '';
      pDesc.value = product ? (product.description || '') : '';
      pPrice.value = product ? product.price : '';
      pStock.value = product ? product.stock : '';
      pCategory.value = product ? (product.category || 'pantallas') : 'pantallas';
      pImage.value = product ? (product.imageUrl || '') : '';

      modal.classList.add('open');
    }

    function closeModal() {
      modal.classList.remove('open');
      editingId = null;
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

    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: pName.value.trim(),
        description: pDesc.value.trim(),
        price: parseFloat(pPrice.value),
        stock: parseInt(pStock.value) || 0,
        category: pCategory.value,
        imageUrl: pImage.value.trim(),
      };

      try {
        if (editingId) {
          await Api.put(`/api/admin/products/${editingId}`, payload);
          showToast('Producto actualizado correctamente');
        } else {
          await Api.post('/api/admin/products', payload);
          showToast('Producto creado correctamente');
        }
        closeModal();
        renderProducts(); // Re-render list
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
