/* Optional service: deliberately not restored/preselected on a new visit. */
let selectedInstallationKey = '';
const INSTALLATION_PRICE_COP = 100000;
const INSTALLATION_CATEGORIES = new Set(['pantallas', 'baterias', 'flex-y-conectores', 'camaras-y-modulos']);

function supportsInstallation(product) {
  return INSTALLATION_CATEGORIES.has(product?.category);
}

function installationCandidates() {
  return cart.filter(item => supportsInstallation(item) || supportsInstallation(
    storefrontProducts.find(product => product.productId === item.productId)
  ));
}

function selectedInstallation() {
  return installationCandidates().find(item => cartItemKey(item) === selectedInstallationKey) || null;
}

function installationCost() {
  return selectedInstallation() ? INSTALLATION_PRICE_COP : 0;
}

function installationInBogota() {
  const city = checkoutCityValue().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return selectedShippingZone() === 'bogota' && ['bogota', 'bogotadc', 'bogotadistritocapital'].includes(city);
}

function installationOrderRow(order) {
  if (!order?.installation) return '';
  return `<div class="checkout-summary-item installation-order-row"><div><strong>Instalación en Bogotá</strong><p>1 servicio · Agenda por coordinar</p></div><strong>${formatCents(order.installationFeeInCents || 0)}</strong></div>`;
}

function renderInstallationOption() {
  const panel = document.getElementById('cartInstallation');
  const candidates = installationCandidates();
  if (!selectedInstallation()) selectedInstallationKey = '';
  panel.hidden = candidates.length === 0;
  if (!candidates.length) { panel.replaceChildren(); return; }
  panel.innerHTML = `
    <div class="installation-heading"><span class="installation-eyebrow">UN POCO DE AYUDA EXPERTA</span><span class="installation-location">Solo Bogotá</span></div>
    <label class="installation-choice"><input id="installationOptIn" type="checkbox" ${selectedInstallationKey ? 'checked' : ''}><span><strong>Añadir instalación opcional</strong><small>Un servicio para el repuesto que elijas.</small></span><b>${formatCOP(INSTALLATION_PRICE_COP)}</b></label>
    <div id="installationProductWrap" ${selectedInstallationKey ? '' : 'hidden'}><label for="installationProduct">Repuesto a instalar</label><select id="installationProduct">${candidates.map(item => `<option value="${htmlSafe(cartItemKey(item))}" ${cartItemKey(item) === selectedInstallationKey ? 'selected' : ''}>${htmlSafe(item.name)}${item.variantLabel ? ' · ' + htmlSafe(item.variantLabel) : ''}</option>`).join('')}</select></div>
    <p class="installation-help">Una instalación por pedido. Coordinaremos compatibilidad y agenda contigo. El repuesto se cobra por separado.</p>
    ${selectedInstallationKey ? `<div class="installation-line"><span>Instalación · 1 servicio</span><strong>${formatCOP(INSTALLATION_PRICE_COP)}</strong></div>` : ''}`;
  panel.querySelector('#installationOptIn').addEventListener('change', event => {
    selectedInstallationKey = event.target.checked ? cartItemKey(candidates[0]) : '';
    renderCart();
  });
  panel.querySelector('#installationProduct').addEventListener('change', event => {
    selectedInstallationKey = event.target.value;
    renderCart();
  });
}

function renderInstallationCheckout() {
  const panel = document.getElementById('checkoutInstallation');
  const item = selectedInstallation();
  panel.hidden = !item;
  if (!item) { panel.replaceChildren(); return; }
  const covered = installationInBogota();
  panel.innerHTML = `<strong>Instalación opcional · ${formatCOP(INSTALLATION_PRICE_COP)}</strong><p>${htmlSafe(item.name)} · 1 servicio</p><p class="${covered ? '' : 'installation-error'}" role="status">${covered ? 'Solo Bogotá. Coordinaremos compatibilidad y agenda contigo.' : 'La instalación solo está disponible en Bogotá. Retírala o corrige tu ciudad para continuar.'}</p><button type="button" class="installation-remove">Quitar instalación</button>`;
  panel.querySelector('button').addEventListener('click', () => {
    selectedInstallationKey = '';
    renderCheckoutSummary();
  });
  document.getElementById('checkoutCity').setCustomValidity(covered ? '' : 'La instalación solo está disponible en Bogotá.');
}

function installationDetailHtml(product) {
  if (!supportsInstallation(product)) return '';
  return `<aside class="installation-detail"><span class="installation-eyebrow">TÚ ELIGES CÓMO REPARARLO</span><strong>¿Prefieres que lo instalemos?</strong><p>Instalación opcional · $100.000 COP · Solo Bogotá</p><small>Puedes añadir un servicio en el carrito. Compatibilidad y agenda por coordinar.</small></aside>`;
}
