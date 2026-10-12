/* Pantallas del rol Administrador: ventas, movimientos, estadísticas y empleados. */
const Admin = (() => {
  const { money, num, esc, nombre, pill, icon } = UI;
  const sum = (arr, f = x => x) => arr.reduce((a, x) => a + f(x), 0);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const K = Store.dateKey;

  // =====================================================================
  // Movimientos (auditoría)
  // =====================================================================
  let movFiltro = null;
  const ACCIONES = { crear: 'Alta', editar: 'Edición', eliminar: 'Eliminación' };

  function movimientos() {
    const hoy = new Date();
    movFiltro ||= { desde: K(addDays(hoy, -6)), hasta: K(hoy), accion: '', actorId: '' };
    const html = `
      <section class="page">
        <header class="page__head">
          <div>
            <h1>Movimientos</h1>
            <p class="page__sub">Cada venta registrada, editada o eliminada, con quién lo hizo y cuándo.</p>
          </div>
        </header>
        <form class="filters" id="filtros">
          <label class="field"><span>Desde</span><input type="date" name="desde" value="${movFiltro.desde}" max="${K(hoy)}"></label>
          <label class="field"><span>Hasta</span><input type="date" name="hasta" value="${movFiltro.hasta}" max="${K(hoy)}"></label>
          <label class="field"><span>Acción</span>
            <select name="accion">
              ${[['', 'Todas'], ['cambios', 'Ediciones y eliminaciones'], ['crear', 'Altas'], ['editar', 'Ediciones'], ['eliminar', 'Eliminaciones']]
                .map(([v, l]) => `<option value="${v}" ${movFiltro.accion === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
          <label class="field"><span>Hecho por</span>
            <select name="actorId"><option value="">Todos</option>
              ${Store.empleados().map(e => `<option value="${e.id}" ${movFiltro.actorId === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}
            </select>
          </label>
        </form>
        <div class="counts" id="counts"></div>
        <div id="grid-movs"></div>
      </section>`;

    function detalle(m) {
      if (m.accion === 'crear') return `<span class="log__sale">${money(m.despues.monto)} ${pill(m.despues.medio)} <span class="muted">vendió ${nombre(m.despues.vendedorId)}</span></span>`;
      if (m.accion === 'eliminar') return `<span class="log__sale log__sale--deleted"><s>${money(m.antes.monto)}</s> ${pill(m.antes.medio)} <span class="muted">vendió ${nombre(m.antes.vendedorId)}</span></span>`;
      const cambios = [];
      const a = m.antes, d = m.despues;
      if (a.monto !== d.monto) cambios.push(`<span class="diff"><span class="diff__k">Monto</span> <s>${money(a.monto)}</s> ${money(d.monto)}</span>`);
      if (a.medio !== d.medio) cambios.push(`<span class="diff"><span class="diff__k">Medio</span> <s>${UI.medioLabel(a.medio)}</s> ${UI.medioLabel(d.medio)}</span>`);
      if (a.vendedorId !== d.vendedorId) cambios.push(`<span class="diff"><span class="diff__k">Vendedor</span> <s>${nombre(a.vendedorId)}</s> ${nombre(d.vendedorId)}</span>`);
      return cambios.join('');
    }

    const detalleTexto = m => {
      const x = m.despues || m.antes;
      return `${money(x.monto)} ${x.monto} ${UI.medioLabel(x.medio)} ${Store.empleado(x.vendedorId)?.nombre ?? ''} ${m.antes ? money(m.antes.monto) : ''}`;
    };

    function mount(root) {
      const form = root.querySelector('#filtros');
      const counts = root.querySelector('#counts');
      let grid = null;

      function pintar(reset) {
        const base = Store.movimientos({ desde: movFiltro.desde, hasta: movFiltro.hasta, actorId: movFiltro.actorId });
        const n = { crear: 0, editar: 0, eliminar: 0 };
        base.forEach(m => n[m.accion]++);
        counts.innerHTML = `
          <span class="count-chip">${num(n.crear)} ${n.crear === 1 ? 'alta' : 'altas'}</span>
          <span class="count-chip count-chip--edit">${num(n.editar)} ${n.editar === 1 ? 'edición' : 'ediciones'}</span>
          <span class="count-chip count-chip--del">${num(n.eliminar)} ${n.eliminar === 1 ? 'eliminación' : 'eliminaciones'}</span>`;
        const lista = base.filter(m => !movFiltro.accion || (movFiltro.accion === 'cambios' ? m.accion !== 'crear' : m.accion === movFiltro.accion));
        if (grid) return grid.setRows(lista, reset);
        grid = Grid.create(root.querySelector('#grid-movs'), {
          rows: lista,
          pageSize: 50,
          searchPlaceholder: 'Buscar monto, persona, motivo o venta',
          searchText: m => `${ACCIONES[m.accion]} ${Store.empleado(m.actorId)?.nombre} ${m.motivo} ${m.ventaId} ${detalleTexto(m)}`,
          defaultSort: { key: 'fecha', dir: 'desc' },
          empty: 'No hay movimientos con estos filtros. Probá ampliar el rango de fechas.',
          rowClass: m => `row--${m.accion}`,
          totalLabel: rows => `${num(rows.length)} ${rows.length === 1 ? 'movimiento' : 'movimientos'}`,
          columns: [
            { key: 'fecha', label: 'Fecha y hora', firstDesc: true, render: m => `<span class="nowrap">${UI.fecha(m.fecha)} <strong>${UI.hora(m.fecha)}</strong></span>` },
            { key: 'accion', label: 'Acción', value: m => ACCIONES[m.accion], render: m => `<span class="badge badge--${m.accion}">${ACCIONES[m.accion]}</span>` },
            { key: 'ventaId', label: 'Venta n.º', align: 'num' },
            { key: 'detalle', label: 'Detalle', sortable: false, render: m => `<div class="log__line">${detalle(m)}</div>` },
            { key: 'motivo', label: 'Motivo', render: m => m.motivo ? esc(m.motivo) : '<span class="muted">—</span>' },
            { key: 'actor', label: 'Hecho por', value: m => Store.empleado(m.actorId)?.nombre ?? '', render: m => nombre(m.actorId) },
          ],
        });
      }

      form.addEventListener('change', () => {
        movFiltro = Object.fromEntries(new FormData(form));
        if (movFiltro.desde > movFiltro.hasta) { movFiltro.hasta = movFiltro.desde; form.hasta.value = movFiltro.desde; }
        pintar(true);
      });
      pintar();
    }
    return { html, mount };
  }

  // =====================================================================
  // Estadísticas
  // =====================================================================
  let rango = null;
  const PRESETS = [
    ['hoy', 'Hoy'], ['7', 'Últimos 7 días'], ['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['90', 'Últimos 90 días'],
  ];
  function calcPreset(p) {
    const h = new Date();
    if (p === 'hoy') return [K(h), K(h)];
    if (p === '7') return [K(addDays(h, -6)), K(h)];
    if (p === '90') return [K(addDays(h, -89)), K(h)];
    if (p === 'mes') return [K(new Date(h.getFullYear(), h.getMonth(), 1)), K(h)];
    if (p === 'mesant') return [K(new Date(h.getFullYear(), h.getMonth() - 1, 1)), K(new Date(h.getFullYear(), h.getMonth(), 0))];
  }
  const diasEntre = (a, b) => Math.round((Store.parseKey(b) - Store.parseKey(a)) / 86400000) + 1;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function estadisticas() {
    rango ||= { preset: '7', desde: calcPreset('7')[0], hasta: calcPreset('7')[1] };
    const { desde, hasta } = rango;
    const dias = diasEntre(desde, hasta);
    const ventas = Store.ventasEnRango(desde, hasta);
    const prevHasta = K(addDays(Store.parseKey(desde), -1));
    const prevDesde = K(addDays(Store.parseKey(desde), -dias));
    const prev = Store.ventasEnRango(prevDesde, prevHasta);

    const total = sum(ventas, v => v.monto);
    const totalPrev = sum(prev, v => v.monto);
    const ef = sum(ventas.filter(v => v.medio === 'efectivo'), v => v.monto);
    const tr = total - ef;
    const ticket = ventas.length ? Math.round(total / ventas.length) : 0;
    const ticketPrev = prev.length ? Math.round(totalPrev / prev.length) : 0;
    const hayPrevio = prevDesde >= Store.primerDia();
    const delta = (a, b) => {
      if (!hayPrevio || !b) return '<span class="delta">Sin datos del período anterior</span>';
      const pct = Math.round((a - b) / b * 100);
      const contra = dias === 1 ? 'contra el día anterior' : `contra los ${dias} días anteriores`;
      return `<span class="delta ${pct > 0 ? 'delta--up' : pct < 0 ? 'delta--down' : ''}">${pct > 0 ? '+' : ''}${pct}% ${contra}</span>`;
    };

    // --- serie diaria
    const porDia = {};
    for (let i = 0; i < dias; i++) porDia[K(addDays(Store.parseKey(desde), i))] = { ef: 0, tr: 0, n: 0 };
    ventas.forEach(v => { const d = porDia[K(new Date(v.fecha))]; d.n++; d[v.medio === 'efectivo' ? 'ef' : 'tr'] += v.monto; });
    const serie = Object.entries(porDia);
    const maxDia = Math.max(1, ...serie.map(([, d]) => d.ef + d.tr));
    const cadaN = Math.ceil(serie.length / 10);

    // --- mensual (últimos 5 meses, independiente del rango)
    const h = new Date();
    const meses = [];
    for (let i = 4; i >= 0; i--) {
      const ini = new Date(h.getFullYear(), h.getMonth() - i, 1);
      const fin = new Date(h.getFullYear(), h.getMonth() - i + 1, 0);
      if (K(fin) < Store.primerDia()) continue;
      const vs = Store.ventasEnRango(K(ini), K(fin < h ? fin : h));
      meses.push({ label: `${MESES[ini.getMonth()]} ${String(ini.getFullYear()).slice(2)}`, ef: sum(vs.filter(v => v.medio === 'efectivo'), v => v.monto), tr: sum(vs.filter(v => v.medio === 'transferencia'), v => v.monto), parcial: i === 0 });
    }
    const maxMes = Math.max(1, ...meses.map(m => m.ef + m.tr));

    // --- por vendedor
    const pv = {};
    ventas.forEach(v => { const p = pv[v.vendedorId] ||= { n: 0, ef: 0, tr: 0 }; p.n++; p[v.medio === 'efectivo' ? 'ef' : 'tr'] += v.monto; });
    const vendedores = Object.entries(pv).map(([id, p]) => ({ id, ...p, t: p.ef + p.tr })).sort((a, b) => b.t - a.t);
    const maxVend = Math.max(1, ...vendedores.map(v => v.t));

    // --- por franja horaria
    const franjas = {};
    for (let hr = 8; hr <= 20; hr++) franjas[hr] = { n: 0, t: 0 };
    ventas.forEach(v => { const hr = new Date(v.fecha).getHours(); (franjas[hr] ||= { n: 0, t: 0 }); franjas[hr].n++; franjas[hr].t += v.monto; });
    const maxFr = Math.max(1, ...Object.values(franjas).map(f => f.t));
    const pico = Object.entries(franjas).sort((a, b) => b[1].t - a[1].t)[0];

    const pctEf = total ? Math.round(ef / total * 100) : 0;
    const bar = (efv, trv, max, label, extra = '') => `
      <div class="col" style="--h:${(efv + trv) / max * 100}%" title="${esc(label)}: ${money(efv + trv)} (efectivo ${money(efv)}, transferencia ${money(trv)})">
        <div class="col__stack" style="height:var(--h)">
          <span class="seg seg--transferencia" style="flex:${trv}"></span>
          <span class="seg seg--efectivo" style="flex:${efv}"></span>
        </div>
        ${extra}
      </div>`;

    const html = `
      <section class="page">
        <header class="page__head">
          <div>
            <h1>Estadísticas</h1>
            <p class="page__sub">${UI.fecha(Store.parseKey(desde))} al ${UI.fecha(Store.parseKey(hasta))}</p>
          </div>
        </header>

        <div class="range">
          <div class="chips chips--scroll" role="radiogroup" aria-label="Período">
            ${PRESETS.map(([v, l]) => `<label class="chip"><input type="radio" name="preset" value="${v}" ${rango.preset === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
          </div>
          <div class="range__custom">
            <label class="field field--inline"><span>Desde</span><input type="date" id="desde" value="${desde}" max="${K(h)}"></label>
            <label class="field field--inline"><span>Hasta</span><input type="date" id="hasta" value="${hasta}" max="${K(h)}"></label>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi kpi--main"><span class="kpi__label">Total vendido</span><span class="kpi__value">${money(total)}</span>${delta(total, totalPrev)}</div>
          <div class="kpi"><span class="kpi__label">Cantidad de ventas</span><span class="kpi__value">${num(ventas.length)}</span>${delta(ventas.length, prev.length)}</div>
          <div class="kpi"><span class="kpi__label">Venta promedio</span><span class="kpi__value">${money(ticket)}</span>${delta(ticket, ticketPrev)}</div>
        </div>

        <div class="stats-grid">
          <article class="panel panel--wide">
            <header class="panel__head"><h2>Ventas por día</h2>${legend()}</header>
            ${dias === 1 ? '<p class="muted">Elegí un período de más de un día para ver la evolución diaria.</p>' : `
            <div class="chart chart--days" style="--cols:${serie.length}">
              <span class="chart__max">${money(maxDia)}</span>
              <div class="chart__cols">
                ${serie.map(([k, d], i) => {
                  const f = Store.parseKey(k);
                  const lbl = i % cadaN === 0 ? `<span class="col__label">${f.getDate()}/${f.getMonth() + 1}</span>` : '<span class="col__label"></span>';
                  return bar(d.ef, d.tr, maxDia, UI.fechaLarga(f), lbl);
                }).join('')}
              </div>
            </div>`}
          </article>

          <article class="panel">
            <header class="panel__head"><h2>Por medio de pago</h2></header>
            <div class="split">
              <div class="split__bar"><span class="seg seg--efectivo" style="flex:${ef || 0}"></span><span class="seg seg--transferencia" style="flex:${tr || 0}"></span></div>
              <dl class="split__legend">
                <div><dt>${pill('efectivo')}</dt><dd><strong>${money(ef)}</strong><span>${pctEf}%</span></dd></div>
                <div><dt>${pill('transferencia')}</dt><dd><strong>${money(tr)}</strong><span>${total ? 100 - pctEf : 0}%</span></dd></div>
              </dl>
            </div>
          </article>

          <article class="panel">
            <header class="panel__head"><h2>Ventas mensuales</h2></header>
            <div class="chart chart--months">
              <div class="chart__cols">
                ${meses.map(m => bar(m.ef, m.tr, maxMes, m.label, `<span class="col__label">${m.label}${m.parcial ? '*' : ''}</span><span class="col__value">${compact(m.ef + m.tr)}</span>`)).join('')}
              </div>
            </div>
            <p class="muted small">* Mes en curso. No depende del período elegido arriba.</p>
          </article>

          <article class="panel">
            <header class="panel__head"><h2>Por vendedor</h2>${legend()}</header>
            ${vendedores.length ? `<ul class="hbars">
              ${vendedores.map(v => `
                <li class="hbar">
                  <div class="hbar__top"><span>${nombre(v.id)}</span><strong>${money(v.t)}</strong></div>
                  <div class="hbar__track"><div class="hbar__fill" style="width:${v.t / maxVend * 100}%"><span class="seg seg--efectivo" style="flex:${v.ef}"></span><span class="seg seg--transferencia" style="flex:${v.tr}"></span></div></div>
                  <span class="hbar__sub">${num(v.n)} ventas, venta promedio ${money(Math.round(v.t / v.n))}</span>
                </li>`).join('')}
            </ul>` : '<p class="muted">No hay ventas en este período.</p>'}
          </article>

          <article class="panel">
            <header class="panel__head"><h2>Por franja horaria</h2></header>
            ${ventas.length ? `<p class="panel__lead">El horario con más ventas es de ${pico[0]} a ${Number(pico[0]) + 1} h.</p>
            <div class="chart chart--hours">
              <div class="chart__cols">
                ${Object.entries(franjas).map(([hr, f]) => `
                  <div class="col" title="${hr} a ${Number(hr) + 1} h: ${money(f.t)} en ${f.n} ventas">
                    <div class="col__stack col__stack--solid ${hr === pico[0] ? 'is-peak' : ''}" style="height:${f.t / maxFr * 100}%"></div>
                    <span class="col__label">${hr}</span>
                  </div>`).join('')}
              </div>
            </div>` : '<p class="muted">No hay ventas en este período.</p>'}
          </article>

          <article class="panel panel--wide">
            <header class="panel__head"><h2>Detalle por día</h2></header>
            <div id="grid-dias"></div>
          </article>
        </div>
      </section>`;

    function mount(root) {
      const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      Grid.create(root.querySelector('#grid-dias'), {
        rows: serie.map(([k, d]) => ({ k, ...d, t: d.ef + d.tr, ticket: d.n ? Math.round((d.ef + d.tr) / d.n) : 0 })),
        search: false, pageSize: 31, pageSizes: [31, 62, 100],
        defaultSort: { key: 'k', dir: 'desc' },
        totalLabel: () => 'Total del período',
        columns: [
          { key: 'k', label: 'Fecha', firstDesc: true, render: r => { const f = Store.parseKey(r.k); return `<span class="nowrap"><span class="muted">${DIAS_SEM[f.getDay()]}</span> ${UI.fecha(f)}</span>`; } },
          { key: 'n', label: 'Ventas', align: 'num', render: r => num(r.n), total: rows => num(sum(rows, r => r.n)) },
          { key: 'ef', label: 'Efectivo', align: 'num', render: r => money(r.ef), total: rows => money(sum(rows, r => r.ef)) },
          { key: 'tr', label: 'Transferencia', align: 'num', render: r => money(r.tr), total: rows => money(sum(rows, r => r.tr)) },
          { key: 't', label: 'Total', align: 'num', render: r => `<strong>${money(r.t)}</strong>`, total: rows => money(sum(rows, r => r.t)) },
          { key: 'ticket', label: 'Venta promedio', align: 'num', render: r => money(r.ticket),
            total: rows => { const n = sum(rows, r => r.n); return n ? money(Math.round(sum(rows, r => r.t) / n)) : money(0); } },
        ],
      });
      root.querySelectorAll('input[name="preset"]').forEach(r => r.addEventListener('change', () => {
        const [d, hh] = calcPreset(r.value);
        rango = { preset: r.value, desde: d, hasta: hh };
        App.render();
      }));
      const d = root.querySelector('#desde'), hh = root.querySelector('#hasta');
      const custom = () => {
        if (!d.value || !hh.value) return;
        rango = { preset: '', desde: d.value <= hh.value ? d.value : hh.value, hasta: d.value <= hh.value ? hh.value : d.value };
        App.render();
      };
      d.addEventListener('change', custom); hh.addEventListener('change', custom);
    }
    return { html, mount };
  }
  const legend = () => `<span class="legend"><span class="legend__dot legend__dot--efectivo"></span>Efectivo <span class="legend__dot legend__dot--transferencia"></span>Transferencia</span>`;
  const compact = n => n >= 1e6 ? `$ ${(n / 1e6).toFixed(1).replace('.', ',')} M` : `$ ${Math.round(n / 1000)} mil`;

  // =====================================================================
  // Empleados
  // =====================================================================
  function empleados() {
    const h = new Date();
    const desde = K(addDays(h, -29));
    const ventas30 = Store.ventasEnRango(desde, K(h));
    const filas = Store.empleados().map(e => ({ ...e, n: ventas30.filter(v => v.vendedorId === e.id).length }));

    const html = `
      <section class="page page--narrow">
        <header class="page__head">
          <div>
            <h1>Empleados</h1>
            <p class="page__sub">Los empleados activos aparecen como vendedores en el mostrador.</p>
          </div>
        </header>
        <form class="add-row card" id="add-form">
          <label class="field">
            <span>Nombre y apellido</span>
            <input name="nombre" placeholder="Por ejemplo, Ana López" autocomplete="off">
          </label>
          <button class="btn btn--primary" type="submit">${icon('plus')}<span>Agregar empleado</span></button>
          <p class="form-error" role="alert" hidden></p>
        </form>
        <div id="grid-emp"></div>
      </section>`;

    function mount(root) {
      const form = root.querySelector('#add-form');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const err = form.querySelector('.form-error');
        const nom = form.nombre.value.trim();
        if (nom.length < 2) { err.textContent = 'Escribí el nombre del empleado.'; err.hidden = false; return; }
        if (Store.empleados().some(x => x.nombre.toLowerCase() === nom.toLowerCase())) { err.textContent = 'Ya hay un empleado con ese nombre.'; err.hidden = false; return; }
        Store.agregarEmpleado(nom);
        UI.toast(`${esc(nom)} agregado`);
        App.render();
      });
      Grid.create(root.querySelector('#grid-emp'), {
        rows: filas,
        searchPlaceholder: 'Buscar empleado',
        searchText: e => e.nombre,
        defaultSort: { key: 'estado', dir: 'asc' },
        rowClass: e => e.activo ? '' : 'is-off',
        totalLabel: rows => `${rows.length} empleados, ${rows.filter(e => e.activo).length} activos`,
        columns: [
          { key: 'nombre', label: 'Nombre', render: e => `<span class="person-cell"><span class="avatar" aria-hidden="true">${esc(e.nombre.split(' ').map(p => p[0]).slice(0, 2).join(''))}</span>${esc(e.nombre)}</span>` },
          { key: 'estado', label: 'Estado', value: e => (e.activo ? '0' : '1') + e.nombre, render: e => e.activo ? '<span class="tag tag--ok">Activo</span>' : '<span class="tag">Inactivo</span>' },
          { key: 'n', label: 'Ventas (30 días)', align: 'num', render: e => num(e.n), total: rows => num(sum(rows, e => e.n)) },
          { key: 'acc', label: '<span class="sr-only">Acciones</span>', sortable: false, className: 'grid__actions',
            render: e => `<button class="btn btn--ghost btn--sm" data-rename="${e.id}">${icon('edit')}<span>Editar</span></button>
                          <button class="btn btn--ghost btn--sm" data-toggle="${e.id}">${e.activo ? 'Desactivar' : 'Activar'}</button>` },
        ],
        onDraw(tbody) {
          tbody.querySelectorAll('[data-rename]').forEach(b => b.addEventListener('click', () => renombrar(b.dataset.rename)));
          tbody.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => alternar(b.dataset.toggle)));
        },
      });
    }

    function renombrar(id) {
        const emp = Store.empleado(id);
        UI.modal({
          title: 'Editar empleado',
          body: `<form id="ren-form" class="stack"><label class="field"><span>Nombre y apellido</span><input name="nombre" value="${esc(emp.nombre)}"></label><p class="form-error" role="alert" hidden></p></form>`,
          actions: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" type="submit" form="ren-form">Guardar cambios</button>',
          onMount(el) {
            const f = el.querySelector('#ren-form');
            f.addEventListener('submit', ev => {
              ev.preventDefault();
              const nom = f.nombre.value.trim();
              if (nom.length < 2) { const er = f.querySelector('.form-error'); er.textContent = 'Escribí el nombre del empleado.'; er.hidden = false; return; }
              Store.actualizarEmpleado(emp.id, { nombre: nom });
              UI.closeModal(); UI.toast('Cambios guardados'); App.render();
            });
          },
        });
    }

    function alternar(id) {
        const emp = Store.empleado(id);
        if (!emp.activo) { Store.actualizarEmpleado(emp.id, { activo: true }); UI.toast(`${esc(emp.nombre)} activado`); App.render(); return; }
        UI.modal({
          title: `¿Desactivar a ${esc(emp.nombre)}?`,
          body: '<p>Deja de aparecer como vendedor en el mostrador. Sus ventas y movimientos anteriores se conservan en el historial y las estadísticas.</p>',
          actions: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" id="ok-off">Desactivar</button>',
          onMount: el => el.querySelector('#ok-off').addEventListener('click', () => {
            Store.actualizarEmpleado(emp.id, { activo: false }); UI.closeModal(); UI.toast(`${esc(emp.nombre)} desactivado`, 'warn'); App.render();
          }),
        });
    }
    return { html, mount };
  }


  // =====================================================================
  // Ventas por día (calendario mensual)
  // =====================================================================
  let calMes = null;   // primer día del mes mostrado
  let calDia = null;   // día seleccionado (YYYY-MM-DD)
  const DIAS_CAL = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function ventas() {
    const hoy = new Date();
    calDia ||= K(hoy);
    calMes ||= new Date(Store.parseKey(calDia).getFullYear(), Store.parseKey(calDia).getMonth(), 1);

    const html = `
      <section class="page">
        <header class="page__head">
          <div>
            <h1>Ventas</h1>
            <p class="page__sub">Elegí un día en el calendario para ver todas sus ventas.</p>
          </div>
        </header>
        <div class="ventas-layout">
          <div class="cal card" id="cal"></div>
          <div class="dia" id="dia"></div>
        </div>
      </section>`;

    function mount(root) {
      const calEl = root.querySelector('#cal');
      const diaEl = root.querySelector('#dia');
      const primer = Store.primerDia();

      function pintarCalendario() {
        const y = calMes.getFullYear(), m = calMes.getMonth();
        const ultimo = new Date(y, m + 1, 0);
        const porDia = {};
        Store.ventasEnRango(K(calMes), K(ultimo)).forEach(v => {
          const d = porDia[K(new Date(v.fecha))] ||= { t: 0, n: 0 };
          d.t += v.monto; d.n++;
        });
        const max = Math.max(1, ...Object.values(porDia).map(d => d.t));
        const totalMes = sum(Object.values(porDia), d => d.t);
        const offset = (calMes.getDay() + 6) % 7; // semana empieza el lunes
        const hayAnterior = K(new Date(y, m, 0)) >= primer;
        const haySiguiente = new Date(y, m + 1, 1) <= hoy;

        let celdas = '';
        for (let i = 0; i < offset; i++) celdas += '<span class="cal__cell cal__cell--pad" aria-hidden="true"></span>';
        for (let d = 1; d <= ultimo.getDate(); d++) {
          const f = new Date(y, m, d);
          const k = K(f);
          const info = porDia[k];
          const futuro = f > hoy;
          const sinDatos = k < primer;
          const nivel = info ? Math.max(1, Math.ceil(info.t / max * 4)) : 0;
          const label = `${UI.fechaLarga(f)}: ${info ? `${money(info.t)} en ${info.n} ventas` : 'sin ventas'}`;
          celdas += `
            <button type="button" class="cal__cell lvl-${nivel} ${k === calDia ? 'is-selected' : ''} ${k === K(hoy) ? 'is-today' : ''}"
              data-day="${k}" ${futuro || sinDatos ? 'disabled' : ''} aria-pressed="${k === calDia}" aria-label="${esc(label)}">
              <span class="cal__num">${d}</span>
              ${info ? `<span class="cal__amt">${compact(info.t)}</span>` : ''}
            </button>`;
        }

        calEl.innerHTML = `
          <div class="cal__head">
            <button type="button" class="icon-btn" data-mes="-1" ${hayAnterior ? '' : 'disabled'} aria-label="Mes anterior">${icon('back')}</button>
            <div class="cal__title">
              <h2>${MESES_LARGO[m].replace(/^./, c => c.toUpperCase())} ${y}</h2>
              <span class="muted">${money(totalMes)} en el mes</span>
            </div>
            <button type="button" class="icon-btn icon-btn--flip" data-mes="1" ${haySiguiente ? '' : 'disabled'} aria-label="Mes siguiente">${icon('back')}</button>
          </div>
          <div class="cal__grid">
            ${DIAS_CAL.map(d => `<span class="cal__dow">${d}</span>`).join('')}
            ${celdas}
          </div>
          <div class="cal__legend"><span>Menos ventas</span><i class="lvl-1"></i><i class="lvl-2"></i><i class="lvl-3"></i><i class="lvl-4"></i><span>Más ventas</span></div>`;

        calEl.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
          calMes = new Date(y, m + Number(b.dataset.mes), 1);
          pintarCalendario();
        }));
        calEl.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
          calDia = b.dataset.day;
          pintarCalendario();
          pintarDia();
          if (diaEl.getBoundingClientRect().top > window.innerHeight * .6) diaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }));
      }

      function pintarDia() {
        const f = Store.parseKey(calDia);
        const todas = Store.ventasDelDia(calDia);
        const activas = todas.filter(v => !v.eliminada);
        const ef = sum(activas.filter(v => v.medio === 'efectivo'), v => v.monto);
        const tr = sum(activas.filter(v => v.medio === 'transferencia'), v => v.monto);

        diaEl.innerHTML = `
          <header class="dia__head">
            <div>
              <h2>${UI.fechaLarga(f).replace(/^./, ch => ch.toUpperCase())}</h2>
            </div>
          </header>
          <dl class="dia__totals">
            <div class="totals__item totals__item--efectivo"><dt>Efectivo</dt><dd>${money(ef)}</dd></div>
            <div class="totals__item totals__item--transferencia"><dt>Transferencia</dt><dd>${money(tr)}</dd></div>
            <div class="totals__item totals__item--total"><dt>Total</dt><dd>${money(ef + tr)}</dd></div>
          </dl>
          <div id="grid-dia"></div>`;

        const gEl = diaEl.querySelector('#grid-dia');
        if (!todas.length) { gEl.innerHTML = '<div class="empty"><p>No hubo ventas este día.</p></div>'; return; }
        Grid.create(gEl, {
          rows: todas,
          searchPlaceholder: 'Buscar por monto, vendedor o n.º de venta',
          searchText: v => `${v.id} ${v.monto} ${money(v.monto)} ${UI.medioLabel(v.medio)} ${Store.empleado(v.vendedorId)?.nombre} ${UI.hora(v.fecha)} ${v.eliminada ? 'eliminada' : ''}`,
          defaultSort: { key: 'hora', dir: 'asc' },
          rowClass: v => v.eliminada ? 'is-deleted' : '',
          totalLabel: rows => { const n = rows.filter(v => !v.eliminada).length; return `Total<span class="tfoot__sub">${n} ${n === 1 ? 'venta' : 'ventas'}</span>`; },
          columns: [
            { key: 'hora', label: 'Hora', value: v => v.fecha, render: v => UI.hora(v.fecha) },
            { key: 'id', label: 'Venta n.º', align: 'num' },
            { key: 'monto', label: 'Monto', align: 'num', render: v => `<strong>${money(v.monto)}</strong>`,
              total: rows => money(sum(rows.filter(v => !v.eliminada), v => v.monto)) },
            { key: 'medio', label: 'Medio', value: v => UI.medioLabel(v.medio), render: v => pill(v.medio) },
            { key: 'vendedor', label: 'Vendedor', value: v => Store.empleado(v.vendedorId)?.nombre ?? '', render: v => `<span class="vend__full">${nombre(v.vendedorId)}</span><span class="vend__short">${UI.primerNombre(v.vendedorId)}</span>` },
            { key: 'estado', label: 'Estado', value: v => v.eliminada ? 1 : 0, render: v => v.eliminada ? '<span class="tag tag--del">Eliminada</span>' : '' },
          ],
        });
      }

      pintarCalendario();
      pintarDia();
    }
    return { html, mount };
  }

  return { ventas, movimientos, estadisticas, empleados };
})();
