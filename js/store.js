/* Datos simulados del prototipo. Todo vive en localStorage del navegador. */
const Store = (() => {
  const KEY = 'verduleria-demo-v5';
  const MESES_HISTORIA = 4; // meses completos hacia atrás, más el mes en curso
  let db = null;

  // ---------- utilidades de fecha ----------
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoyKey = () => dateKey(new Date());
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

  // ---------- generador pseudoaleatorio determinístico ----------
  function rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const MOTIVOS_EDICION = ['Monto mal cargado', 'Medio de pago equivocado', 'Vendedor equivocado'];
  const MOTIVOS_BAJA = ['Venta duplicada', 'El cliente devolvió la mercadería', 'Venta cargada por error'];

  function seed() {
    const r = rng(20260930);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const empleados = [
      { id: 'e1', nombre: 'Lucía Fernández', activo: true },
      { id: 'e2', nombre: 'Diego Romero', activo: true },
      { id: 'e3', nombre: 'Carla Benítez', activo: true },
      { id: 'e4', nombre: 'Javier Sosa', activo: true },
      { id: 'e5', nombre: 'Rocío Paredes', activo: true },
      { id: 'e6', nombre: 'Martín Acosta', activo: false },
    ];
    const manana = ['e1', 'e2', 'e3'];
    const tarde = ['e3', 'e4', 'e5'];
    // peso relativo de ventas por hora (8 a 20)
    const pesoHora = { 8: 3, 9: 6, 10: 9, 11: 10, 12: 8, 13: 5, 14: 3, 15: 3, 16: 4, 17: 6, 18: 9, 19: 9, 20: 5 };
    const horas = Object.entries(pesoHora).flatMap(([h, p]) => Array(p).fill(Number(h)));

    const ventas = [], auditoria = [];
    let nv = 1, na = 1;
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - MESES_HISTORIA, 1);
    const diasHistoria = Math.round((new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) - inicio) / 86400000);
    const montoAleatorio = () => {
      const x = r();
      const base = x < 0.45 ? 1500 + r() * 5000 : x < 0.85 ? 6000 + r() * 10000 : 16000 + r() * 30000;
      return Math.round(base / 100) * 100;
    };

    for (let d = diasHistoria; d >= 0; d--) {
      const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - d);
      const dow = dia.getDay();
      const n = dow === 0 ? 22 + Math.floor(r() * 10) : dow === 6 ? 70 + Math.floor(r() * 25) : 40 + Math.floor(r() * 28);
      // Martín trabajó hasta hace 40 días
      const turnoManana = d > 40 ? ['e1', 'e2', 'e6'] : manana;
      const ventasDia = [];
      for (let i = 0; i < n; i++) {
        let h = pick(horas);
        if (dow === 0 && h > 13) h = 8 + Math.floor(r() * 6);
        const f = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, Math.floor(r() * 60), Math.floor(r() * 60));
        if (f > ahora) continue;
        ventasDia.push({
          fecha: f,
          monto: montoAleatorio(),
          medio: r() < 0.56 ? 'efectivo' : 'transferencia',
          vendedorId: pick(h < 14 ? turnoManana : tarde),
        });
      }
      ventasDia.sort((a, b) => a.fecha - b.fecha);
      for (const v of ventasDia) {
        const venta = { id: nv++, monto: v.monto, medio: v.medio, vendedorId: v.vendedorId, fecha: v.fecha.toISOString(), eliminada: false };
        ventas.push(venta);
        auditoria.push({ id: na++, accion: 'crear', ventaId: venta.id, actorId: v.vendedorId, fecha: venta.fecha, antes: null, despues: snapshot(venta), motivo: '' });
        const x = r();
        if (x < 0.02) {
          const antes = snapshot(venta);
          const tipo = pick(MOTIVOS_EDICION);
          if (tipo === 'Monto mal cargado') { venta.monto = Math.round(venta.monto * (0.5 + r()) / 100) * 100; if (venta.monto === antes.monto) venta.monto += 500; }
          else if (tipo === 'Medio de pago equivocado') venta.medio = venta.medio === 'efectivo' ? 'transferencia' : 'efectivo';
          else venta.vendedorId = pick((h(venta) < 14 ? turnoManana : tarde).filter(id => id !== venta.vendedorId));
          const f = new Date(new Date(venta.fecha).getTime() + (3 + r() * 90) * 60000);
          if (f <= ahora) auditoria.push({ id: na++, accion: 'editar', ventaId: venta.id, actorId: venta.vendedorId, fecha: f.toISOString(), antes, despues: snapshot(venta), motivo: tipo });
          else Object.assign(venta, antes);
        } else if (x < 0.03) {
          const f = new Date(new Date(venta.fecha).getTime() + (2 + r() * 60) * 60000);
          if (f <= ahora) {
            venta.eliminada = true;
            auditoria.push({ id: na++, accion: 'eliminar', ventaId: venta.id, actorId: venta.vendedorId, fecha: f.toISOString(), antes: snapshot(venta), despues: null, motivo: pick(MOTIVOS_BAJA) });
          }
        }
      }
    }
    auditoria.sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    return { empleados, ventas, auditoria, nextVenta: nv, nextAudit: na, nextEmpleado: 7 };
  }

  function h(venta) { return new Date(venta.fecha).getHours(); }
  function snapshot(v) { return { monto: v.monto, medio: v.medio, vendedorId: v.vendedorId }; }

  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db) { db = seed(); save(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sin almacenamiento: queda en memoria */ } }
  function reset() { db = seed(); save(); }

  function audit(accion, venta, actorId, antes, despues, motivo) {
    db.auditoria.push({ id: db.nextAudit++, accion, ventaId: venta.id, actorId, fecha: new Date().toISOString(), antes, despues, motivo: motivo || '' });
  }

  // ---------- empleados ----------
  const empleados = ({ soloActivos = false } = {}) => db.empleados.filter(e => !soloActivos || e.activo);
  const empleado = id => db.empleados.find(e => e.id === id);
  function agregarEmpleado(nombre) {
    const e = { id: 'e' + db.nextEmpleado++, nombre: nombre.trim(), activo: true };
    db.empleados.push(e); save(); return e;
  }
  function actualizarEmpleado(id, cambios) { Object.assign(empleado(id), cambios); save(); }

  // ---------- ventas ----------
  const primerDia = () => db.ventas.length ? dateKey(new Date(db.ventas.reduce((m, v) => v.fecha < m ? v.fecha : m, db.ventas[0].fecha))) : hoyKey();
  const ventasDelDia = key => db.ventas.filter(v => dateKey(new Date(v.fecha)) === key).sort((a, b) => b.fecha < a.fecha ? -1 : 1);
  function ventasEnRango(desdeKey, hastaKey) {
    return db.ventas.filter(v => {
      if (v.eliminada) return false;
      const k = dateKey(new Date(v.fecha));
      return k >= desdeKey && k <= hastaKey;
    });
  }
  function crearVenta({ monto, medio, vendedorId }) {
    const v = { id: db.nextVenta++, monto, medio, vendedorId, fecha: new Date().toISOString(), eliminada: false };
    db.ventas.push(v);
    audit('crear', v, vendedorId, null, snapshot(v));
    save(); return v;
  }
  function editarVenta(id, cambios, { actorId, motivo }) {
    const v = db.ventas.find(x => x.id === id);
    const antes = snapshot(v);
    Object.assign(v, cambios);
    audit('editar', v, actorId, antes, snapshot(v), motivo);
    save(); return v;
  }
  function eliminarVenta(id, { actorId, motivo }) {
    const v = db.ventas.find(x => x.id === id);
    v.eliminada = true;
    audit('eliminar', v, actorId, snapshot(v), null, motivo);
    save();
  }

  // ---------- auditoría ----------
  function movimientos({ accion = '', actorId = '', desde = '', hasta = '' } = {}) {
    return db.auditoria.filter(a => {
      if (accion && a.accion !== accion) return false;
      if (actorId && a.actorId !== actorId) return false;
      const k = dateKey(new Date(a.fecha));
      if (desde && k < desde) return false;
      if (hasta && k > hasta) return false;
      return true;
    }).sort((a, b) => b.fecha < a.fecha ? -1 : 1);
  }

  load();
  return {
    dateKey, hoyKey, parseKey, reset,
    empleados, empleado, agregarEmpleado, actualizarEmpleado,
    ventasDelDia, ventasEnRango, primerDia, crearVenta, editarVenta, eliminarVenta,
    movimientos,
    MOTIVOS_EDICION, MOTIVOS_BAJA,
  };
})();
