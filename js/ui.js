/* Utilidades de interfaz compartidas: formato, modales, avisos. */
const UI = (() => {
  const fmtMoney = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('es-AR');
  const money = n => fmtMoney.format(n);
  const num = n => fmtNum.format(n);
  const hora = iso => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fecha = iso => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fechaLarga = d => d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const medioLabel = m => m === 'efectivo' ? 'Efectivo' : 'Transferencia';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nombre = id => esc(Store.empleado(id)?.nombre ?? '—');
  const primerNombre = id => esc((Store.empleado(id)?.nombre ?? '—').split(' ')[0]);

  const pill = medio => `<span class="pill pill--${medio}"><span class="pill__lg">${medioLabel(medio)}</span><span class="pill__sm">${medio === 'efectivo' ? 'Efect.' : 'Transf.'}</span></span>`;

  // ---------- modal ----------
  let lastFocus = null;
  function modal({ title, body, actions = '', onMount, wide = false }) {
    lastFocus = document.activeElement;
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-close>
        <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <header class="modal__head">
            <h2 id="modal-title">${title}</h2>
            <button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button>
          </header>
          <div class="modal__body">${body}</div>
          ${actions ? `<footer class="modal__foot">${actions}</footer>` : ''}
        </div>
      </div>`;
    const el = root.querySelector('.modal');
    // el fondo cierra solo si se toca fuera del cuadro; los botones de cerrar, siempre
    root.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    root.querySelectorAll('button[data-close]').forEach(b => b.addEventListener('click', closeModal));
    document.addEventListener('keydown', escHandler);
    onMount && onMount(el);
    const first = el.querySelector('input, select, textarea, button:not([data-close])');
    first && first.focus();
    return el;
  }
  function escHandler(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
    document.removeEventListener('keydown', escHandler);
    lastFocus && lastFocus.focus && lastFocus.focus();
  }

  // ---------- avisos ----------
  function toast(msg, tipo = 'ok') {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = `toast toast--${tipo}`;
    t.innerHTML = msg;
    while (root.children.length >= 2) root.firstElementChild.remove();
    root.appendChild(t);
    setTimeout(() => t.classList.add('toast--out'), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  // ---------- íconos (trazos simples) ----------
  const paths = {
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 4v4.7h4.7M12 8v4l3 2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.5.8 2.6 2.6 3 5.2"/>',
    logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    del: '<path d="M9 6h11v12H9l-6-6z"/><path d="M12 10l4 4M16 10l-4 4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

  return { money, num, hora, fecha, fechaLarga, medioLabel, esc, nombre, primerNombre, pill, modal, closeModal, toast, icon };
})();
