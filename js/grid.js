/* Grilla reutilizable: búsqueda, orden por columna, paginación y fila de totales.
   Columnas: { key, label, align: 'num', value(row), render(row), sortable, total(rows), className } */
const Grid = (() => {
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function create(el, opts) {
    const o = {
      pageSize: 25, pageSizes: [25, 50, 100], search: true, searchPlaceholder: 'Buscar',
      empty: 'No hay registros.', rowClass: () => '', totalLabel: rows => `Total (${UI.num(rows.length)})`,
      ...opts,
    };
    const cols = o.columns;
    const val = (c, r) => c.value ? c.value(r) : r[c.key];
    const hasTotals = cols.some(c => c.total);
    let rows = o.rows || [];
    let sort = o.defaultSort || null;
    let page = 0, q = '', size = o.pageSize;

    el.innerHTML = `
      <div class="grid">
        ${o.search || o.toolbar ? `<div class="grid__bar">
          ${o.search ? `<label class="grid__search">${UI.icon('search')}<input type="search" placeholder="${UI.esc(o.searchPlaceholder)}" aria-label="${UI.esc(o.searchPlaceholder)}"></label>` : ''}
          ${o.toolbar || ''}
        </div>` : ''}
        <div class="table-wrap">
          <table class="table table--grid">
            <thead><tr>${cols.map(c => c.sortable === false
              ? `<th class="${c.align || ''} ${c.className || ''}">${c.label}</th>`
              : `<th class="${c.align || ''} ${c.className || ''}" data-key="${c.key}"><button type="button" class="grid__sort">${c.label}<span class="grid__arrow" aria-hidden="true"></span></button></th>`).join('')}</tr></thead>
            <tbody></tbody>
            ${hasTotals ? '<tfoot></tfoot>' : ''}
          </table>
        </div>
        ${size ? '<div class="grid__pager"></div>' : ''}
      </div>`;

    const tbody = el.querySelector('tbody');
    const tfoot = el.querySelector('tfoot');
    const pager = el.querySelector('.grid__pager');

    function filtered() {
      let out = rows;
      if (q && o.searchText) out = out.filter(r => norm(o.searchText(r)).includes(q));
      if (sort) {
        const c = cols.find(x => x.key === sort.key);
        const dir = sort.dir === 'asc' ? 1 : -1;
        out = out.slice().sort((a, b) => {
          const va = val(c, a), vb = val(c, b);
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb), 'es') * dir;
        });
      }
      return out;
    }

    function draw() {
      const list = filtered();
      const pages = size ? Math.max(1, Math.ceil(list.length / size)) : 1;
      page = Math.min(page, pages - 1);
      const visibles = size ? list.slice(page * size, page * size + size) : list;

      el.querySelectorAll('th[data-key]').forEach(th => {
        const on = sort && sort.key === th.dataset.key;
        th.setAttribute('aria-sort', on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
        th.classList.toggle('is-sorted', !!on);
      });

      tbody.innerHTML = visibles.length
        ? visibles.map(r => `<tr class="${o.rowClass(r)}">${cols.map(c => `<td class="${c.align || ''} ${c.className || ''}">${c.render ? c.render(r) : UI.esc(val(c, r))}</td>`).join('')}</tr>`).join('')
        : `<tr class="grid__empty"><td colspan="${cols.length}">${q ? 'No hay resultados para esa búsqueda.' : o.empty}</td></tr>`;

      if (tfoot) {
        tfoot.innerHTML = list.length ? `<tr>${cols.map((c, i) => `<td class="${c.align || ''} ${c.className || ''}">${i === 0 ? o.totalLabel(list) : c.total ? c.total(list) : ''}</td>`).join('')}</tr>` : '';
      }

      if (pager) {
        const desde = list.length ? page * size + 1 : 0;
        const hasta = Math.min(list.length, (page + 1) * size);
        pager.innerHTML = `
          <span class="muted">${UI.num(desde)} a ${UI.num(hasta)} de ${UI.num(list.length)}</span>
          <label class="grid__size"><span>Filas</span>
            <select>${o.pageSizes.map(n => `<option ${n === size ? 'selected' : ''}>${n}</option>`).join('')}</select>
          </label>
          <div class="grid__pages">
            <button type="button" class="icon-btn" data-page="prev" ${page === 0 ? 'disabled' : ''} aria-label="Página anterior">${UI.icon('back')}</button>
            <span>Página ${page + 1} de ${pages}</span>
            <button type="button" class="icon-btn icon-btn--flip" data-page="next" ${page >= pages - 1 ? 'disabled' : ''} aria-label="Página siguiente">${UI.icon('back')}</button>
          </div>`;
        pager.querySelector('select').addEventListener('change', e => { size = Number(e.target.value); page = 0; draw(); });
        pager.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { page += b.dataset.page === 'next' ? 1 : -1; draw(); }));
      }
      o.onDraw && o.onDraw(tbody);
    }

    el.querySelectorAll('th[data-key] .grid__sort').forEach(b => b.addEventListener('click', () => {
      const key = b.parentElement.dataset.key;
      const c = cols.find(x => x.key === key);
      sort = sort && sort.key === key
        ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: c.align === 'num' || c.firstDesc ? 'desc' : 'asc' };
      page = 0;
      draw();
    }));
    el.querySelector('.grid__search input')?.addEventListener('input', e => { q = norm(e.target.value.trim()); page = 0; draw(); });

    draw();
    return { setRows(r, reset = false) { rows = r; if (reset) page = 0; draw(); }, draw };
  }

  return { create };
})();
