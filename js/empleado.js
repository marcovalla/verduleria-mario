/* Pantallas del rol Empleado: nueva venta y ventas de hoy. */
const Empleado = (() => {
  const ULTIMO = 'verduleria-ultimo-vendedor';
  const MAX_DIGITOS = 7;
  const getUltimo = () => { try { return localStorage.getItem(ULTIMO); } catch (e) { return null; } };
  const setUltimo = id => { try { localStorage.setItem(ULTIMO, id); } catch (e) { /* ignorar */ } };

  const opcionesEmpleados = (sel, placeholder) =>
    (placeholder ? `<option value="">${placeholder}</option>` : '') +
    Store.empleados({ soloActivos: true }).map(e => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${UI.esc(e.nombre)}</option>`).join('');

  // Selector de motivo: opciones frecuentes + "Otro" con texto libre
  const motivoField = (motivos, id) => `
    <fieldset class="field">
      <legend>Motivo <em>(obligatorio)</em></legend>
      <div class="chips chips--wrap" role="radiogroup">
        ${[...motivos, 'Otro'].map(m => `<label class="chip"><input type="radio" name="${id}" value="${UI.esc(m)}"><span>${UI.esc(m)}</span></label>`).join('')}
      </div>
      <input class="motivo-otro" name="${id}-otro" placeholder="Escribí el motivo" hidden>
    </fieldset>`;
  function leerMotivo(form, id) {
    const v = form.querySelector(`input[name="${id}"]:checked`)?.value;
    if (!v) return '';
    return v === 'Otro' ? form.querySelector(`[name="${id}-otro"]`).value.trim() : v;
  }
  function wireMotivo(form, id) {
    form.querySelectorAll(`input[name="${id}"]`).forEach(r => r.addEventListener('change', () => {
      const otro = form.querySelector(`[name="${id}-otro"]`);
      otro.hidden = r.value !== 'Otro' || !r.checked;
      if (!otro.hidden) otro.focus();
    }));
  }

  // ---------------- Nueva venta ----------------
  function nuevaVenta() {
    const activos = Store.empleados({ soloActivos: true });
    let vendedorId = activos.some(e => e.id === getUltimo()) ? getUltimo() : '';
    let digitos = '';
    const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];
    const html = `
      <section class="venta">
        <fieldset class="venta__vendedor">
          <legend>Vendedor</legend>
          <div class="chips" role="radiogroup" aria-label="Vendedor">
            ${activos.map(e => `<label class="chip chip--lg"><input type="radio" name="vendedor" value="${e.id}" ${e.id === vendedorId ? 'checked' : ''}><span>${UI.esc(e.nombre.split(' ')[0])}</span></label>`).join('')}
          </div>
        </fieldset>

        <div class="slate" aria-live="polite">
          <span class="slate__label">Monto</span>
          <output class="slate__amount" id="monto"><span class="slate__cur">$</span><span id="monto-num">0</span></output>
        </div>

        <div class="keypad" role="group" aria-label="Teclado numérico">
          ${teclas.map(k => k === 'del'
            ? `<button class="key key--del" data-k="del" aria-label="Borrar último dígito">${UI.icon('del')}</button>`
            : `<button class="key" data-k="${k}">${k}</button>`).join('')}
        </div>

        <div class="venta__pagos">
          <button class="pay pay--efectivo" data-medio="efectivo" disabled>${UI.icon('cash')}<span>Efectivo</span></button>
          <button class="pay pay--transferencia" data-medio="transferencia" disabled>${UI.icon('phone')}<span>Transferencia</span></button>
        </div>
        <p class="venta__hint" id="hint">Elegí el vendedor e ingresá el monto.</p>
      </section>`;

    function mount(root) {
      const numEl = root.querySelector('#monto-num');
      const hint = root.querySelector('#hint');
      const pays = root.querySelectorAll('.pay');
      const monto = () => parseInt(digitos || '0', 10);

      function update() {
        numEl.textContent = UI.num(monto());
        const listo = monto() > 0 && vendedorId;
        pays.forEach(p => p.disabled = !listo);
        hint.textContent = !vendedorId ? 'Elegí el vendedor.' : monto() === 0 ? 'Ingresá el monto.' : 'Tocá el medio de pago para registrar la venta.';
      }
      function tecla(k) {
        if (k === 'del') digitos = digitos.slice(0, -1);
        else if ((digitos + k).length <= MAX_DIGITOS) digitos = (digitos + k).replace(/^0+/, '');
        update();
      }
      function registrar(medio) {
        if (!(monto() > 0 && vendedorId)) return;
        const v = Store.crearVenta({ monto: monto(), medio, vendedorId });
        UI.toast(`Venta registrada: <strong>${UI.money(v.monto)}</strong> en ${UI.medioLabel(medio).toLowerCase()}, ${UI.primerNombre(vendedorId)}`);
        digitos = '';
        const slate = root.querySelector('.slate');
        slate.classList.remove('slate--ok'); void slate.offsetWidth; slate.classList.add('slate--ok');
        update();
      }

      root.querySelectorAll('input[name="vendedor"]').forEach(r => r.addEventListener('change', () => { vendedorId = r.value; setUltimo(vendedorId); update(); }));
      root.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => tecla(b.dataset.k)));
      pays.forEach(p => p.addEventListener('click', () => registrar(p.dataset.medio)));

      // Teclado físico en escritorio: números, borrar, E = efectivo, T = transferencia
      const onKey = e => {
        if (document.getElementById('modal-root').children.length || e.target.matches('input, select, textarea')) return;
        if (/^[0-9]$/.test(e.key)) tecla(e.key);
        else if (e.key === 'Backspace') tecla('del');
        else if (e.key.toLowerCase() === 'e') registrar('efectivo');
        else if (e.key.toLowerCase() === 't') registrar('transferencia');
        else return;
        e.preventDefault();
      };
      document.addEventListener('keydown', onKey);
      window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });

      update();
    }
    return { html, mount };
  }

  // ---------------- Ventas de hoy ----------------
  function ventasHoy() {
    let filtro = '';
    const html = `
      <section class="page">
        <header class="page__head">
          <div>
            <h1>Ventas de hoy</h1>
            <p class="page__sub">${UI.fechaLarga(new Date())}</p>
          </div>
        </header>
        <div class="chips chips--scroll" id="filtro" role="radiogroup" aria-label="Filtrar por vendedor">
          <label class="chip"><input type="radio" name="f" value="" checked><span>Todos</span></label>
          ${Store.empleados({ soloActivos: true }).map(e => `<label class="chip"><input type="radio" name="f" value="${e.id}"><span>${UI.esc(e.nombre.split(' ')[0])}</span></label>`).join('')}
        </div>
        <div id="lista"></div>
      </section>`;

    function mount(root) {
      const lista = root.querySelector('#lista');
      const datos = () => Store.ventasDelDia(Store.hoyKey()).filter(v => !filtro || v.vendedorId === filtro);
      let grid = null;
      function pintar() {
        if (!Store.ventasDelDia(Store.hoyKey()).length) {
          lista.innerHTML = `<div class="empty"><p>Todavía no hay ventas hoy.</p><a class="btn btn--primary" href="#/venta">Registrar una venta</a></div>`;
          return;
        }
        if (grid) return grid.setRows(datos());
        grid = Grid.create(lista, {
          rows: datos(),
          searchPlaceholder: 'Buscar por monto, vendedor o medio',
          searchText: v => `${v.monto} ${UI.money(v.monto)} ${UI.medioLabel(v.medio)} ${Store.empleado(v.vendedorId)?.nombre} ${UI.hora(v.fecha)} ${v.eliminada ? 'eliminada' : ''}`,
          defaultSort: { key: 'hora', dir: 'desc' },
          empty: 'Este vendedor todavía no tiene ventas hoy.',
          rowClass: v => v.eliminada ? 'is-deleted' : '',
          totalLabel: rows => { const n = rows.filter(v => !v.eliminada).length; return `Total<span class="tfoot__sub">${n} ${n === 1 ? 'venta' : 'ventas'}</span>`; },
          columns: [
            { key: 'hora', label: 'Hora', value: v => v.fecha, render: v => UI.hora(v.fecha), firstDesc: true },
            { key: 'monto', label: 'Monto', align: 'num', render: v => `<strong>${UI.money(v.monto)}</strong>`,
              total: rows => UI.money(rows.filter(v => !v.eliminada).reduce((a, v) => a + v.monto, 0)) },
            { key: 'medio', label: 'Medio', value: v => UI.medioLabel(v.medio), render: v => UI.pill(v.medio) },
            { key: 'vendedor', label: '<span class="lbl__lg">Vendedor</span><span class="lbl__sm">Vend.</span>', value: v => Store.empleado(v.vendedorId)?.nombre ?? '', render: v => `<span class="vend__full">${UI.nombre(v.vendedorId)}</span><span class="vend__short">${UI.primerNombre(v.vendedorId)}</span>` },
            { key: 'acciones', label: '<span class="sr-only">Acciones</span>', sortable: false, className: 'grid__actions',
              render: v => v.eliminada
                ? '<span class="tag tag--del">Eliminada</span>'
                : `<button class="icon-btn" data-edit="${v.id}" aria-label="Editar venta de ${UI.money(v.monto)}">${UI.icon('edit')}</button>
                   <button class="icon-btn icon-btn--danger" data-del="${v.id}" aria-label="Eliminar venta de ${UI.money(v.monto)}">${UI.icon('trash')}</button>` },
          ],
          onDraw(tbody) {
            tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editar(Number(b.dataset.edit), pintar)));
            tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => eliminar(Number(b.dataset.del), pintar)));
          },
        });
      }
      root.querySelectorAll('input[name="f"]').forEach(r => r.addEventListener('change', () => { filtro = r.value; pintar(); }));
      pintar();
    }
    return { html, mount };
  }

  function buscar(id) { return Store.ventasDelDia(Store.hoyKey()).find(v => v.id === id); }

  function editar(id, done) {
    const v = buscar(id);
    UI.modal({
      title: 'Editar venta',
      body: `
        <form id="edit-form" class="stack">
          <p class="muted">Registrada a las ${UI.hora(v.fecha)}</p>
          <label class="field">
            <span>Monto</span>
            <div class="money-input"><span>$</span><input name="monto" inputmode="numeric" value="${v.monto}"></div>
          </label>
          <fieldset class="field">
            <legend>Medio de pago</legend>
            <div class="segmented">
              <label><input type="radio" name="medio" value="efectivo" ${v.medio === 'efectivo' ? 'checked' : ''}><span>Efectivo</span></label>
              <label><input type="radio" name="medio" value="transferencia" ${v.medio === 'transferencia' ? 'checked' : ''}><span>Transferencia</span></label>
            </div>
          </fieldset>
          <label class="field">
            <span>Vendedor</span>
            <select name="vendedor">${opcionesEmpleados(v.vendedorId)}</select>
          </label>
          ${motivoField(Store.MOTIVOS_EDICION, 'motivo')}
          <label class="field">
            <span>¿Quién hace el cambio?</span>
            <select name="actor">${opcionesEmpleados(getUltimo(), 'Elegí tu nombre')}</select>
          </label>
          <p class="form-error" role="alert" hidden></p>
        </form>`,
      actions: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" type="submit" form="edit-form">Guardar cambios</button>',
      onMount(el) {
        const form = el.querySelector('#edit-form');
        const err = form.querySelector('.form-error');
        wireMotivo(form, 'motivo');
        form.addEventListener('submit', e => {
          e.preventDefault();
          const cambios = {
            monto: parseInt(form.monto.value.replace(/\D/g, '') || '0', 10),
            medio: form.medio.value,
            vendedorId: form.vendedor.value,
          };
          const motivo = leerMotivo(form, 'motivo');
          const fail = m => { err.textContent = m; err.hidden = false; };
          if (cambios.monto <= 0) return fail('El monto tiene que ser mayor a $ 0.');
          if (cambios.monto === v.monto && cambios.medio === v.medio && cambios.vendedorId === v.vendedorId) return fail('No cambiaste ningún dato de la venta.');
          if (!motivo) return fail('Indicá el motivo del cambio.');
          if (!form.actor.value) return fail('Elegí quién hace el cambio.');
          Store.editarVenta(id, cambios, { actorId: form.actor.value, motivo });
          setUltimo(form.actor.value);
          UI.closeModal();
          UI.toast('Cambios guardados');
          done();
        });
      },
    });
  }

  function eliminar(id, done) {
    const v = buscar(id);
    UI.modal({
      title: '¿Eliminar esta venta?',
      body: `
        <form id="del-form" class="stack">
          <div class="sale sale--preview">
            <time class="sale__time">${UI.hora(v.fecha)}</time>
            <div class="sale__main">
              <span class="sale__amount">${UI.money(v.monto)}</span>
              <span class="sale__meta">${UI.pill(v.medio)} <span>${UI.nombre(v.vendedorId)}</span></span>
            </div>
          </div>
          <p class="muted">La venta deja de sumar en los totales. El administrador puede ver que fue eliminada, por quién y por qué.</p>
          ${motivoField(Store.MOTIVOS_BAJA, 'motivo')}
          <label class="field">
            <span>¿Quién la elimina?</span>
            <select name="actor">${opcionesEmpleados(getUltimo(), 'Elegí tu nombre')}</select>
          </label>
          <p class="form-error" role="alert" hidden></p>
        </form>`,
      actions: `<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" type="submit" form="del-form">Eliminar venta</button>`,
      onMount(el) {
        const form = el.querySelector('#del-form');
        const err = form.querySelector('.form-error');
        wireMotivo(form, 'motivo');
        form.addEventListener('submit', e => {
          e.preventDefault();
          const motivo = leerMotivo(form, 'motivo');
          const fail = m => { err.textContent = m; err.hidden = false; };
          if (!motivo) return fail('Indicá el motivo para eliminar la venta.');
          if (!form.actor.value) return fail('Elegí quién elimina la venta.');
          Store.eliminarVenta(id, { actorId: form.actor.value, motivo });
          setUltimo(form.actor.value);
          UI.closeModal();
          UI.toast('Venta eliminada', 'warn');
          done();
        });
      },
    });
  }

  return { nuevaVenta, ventasHoy };
})();
