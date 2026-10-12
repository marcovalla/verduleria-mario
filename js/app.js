/* Enrutador, sesión y estructura de las pantallas. */
const App = (() => {
  const SESION = 'verduleria-sesion';
  const USUARIOS = {
    mostrador: { clave: '1234', rol: 'empleado' },
    admin: { clave: 'admin', rol: 'admin' },
  };

  const getSesion = () => { try { return JSON.parse(localStorage.getItem(SESION)); } catch (e) { return null; } };
  const setSesion = s => { try { s ? localStorage.setItem(SESION, JSON.stringify(s)) : localStorage.removeItem(SESION); } catch (e) { /* ignorar */ } };

  const RUTAS = {
    '/login': { rol: null, view: () => loginView() },
    '/venta': { rol: 'empleado', view: () => Empleado.nuevaVenta() },
    '/hoy': { rol: 'empleado', view: () => Empleado.ventasHoy() },
    '/admin/ventas': { rol: 'admin', view: () => Admin.ventas() },
    '/admin/movimientos': { rol: 'admin', view: () => Admin.movimientos() },
    '/admin/estadisticas': { rol: 'admin', view: () => Admin.estadisticas() },
    '/admin/empleados': { rol: 'admin', view: () => Admin.empleados() },
  };
  const INICIO = { empleado: '/venta', admin: '/admin/ventas' };

  function go(path) { location.hash = '#' + path; }

  function render() {
    const path = location.hash.slice(1) || '/login';
    const sesion = getSesion();
    const ruta = RUTAS[path];
    if (!ruta) return go(sesion ? INICIO[sesion.rol] : '/login');
    if (ruta.rol && (!sesion || sesion.rol !== ruta.rol)) return go(sesion ? INICIO[sesion.rol] : '/login');
    if (!ruta.rol && sesion) return go(INICIO[sesion.rol]);

    UI.closeModal();
    const { html, mount, title } = ruta.view();
    const app = document.getElementById('app');
    const wrapped = !ruta.rol ? html : ruta.rol === 'empleado' ? shellEmpleado(path, html) : shellAdmin(path, html, title);
    app.innerHTML = wrapped;
    app.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', salir));
    app.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', restablecer));
    mount && mount(app);
    window.scrollTo(0, 0);
  }

  function salir() { setSesion(null); document.getElementById('toast-root').innerHTML = ''; go('/login'); }

  function restablecer() {
    UI.modal({
      title: 'Restablecer datos de demostración',
      body: '<p>Se borran las ventas, movimientos y cambios hechos en esta prueba y se vuelven a generar los datos de ejemplo.</p>',
      actions: '<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--danger" id="ok-reset">Restablecer datos</button>',
      onMount: el => el.querySelector('#ok-reset').addEventListener('click', () => {
        Store.reset(); UI.closeModal(); UI.toast('Datos restablecidos'); render();
      }),
    });
  }

  const brand = `<span class="brand">${UI.icon('leaf', 'brand__mark')}<span class="brand__text">Sistema de Gestión<small>Verdulería</small></span></span>`;

  function shellEmpleado(path, html) {
    const tab = (p, label, ic) => `<a href="#${p}" class="tab ${path === p ? 'is-active' : ''}" ${path === p ? 'aria-current="page"' : ''}>${UI.icon(ic)}<span>${label}</span></a>`;
    const tabs = tab('/venta', 'Nueva venta', 'plus') + tab('/hoy', 'Ventas de hoy', 'list');
    return `
      <div class="shell shell--empleado">
        <header class="topbar">
          ${brand}
          <nav class="topbar__tabs" aria-label="Secciones">${tabs}</nav>
          <button class="btn btn--ghost btn--sm" data-logout>${UI.icon('logout')}<span>Salir</span></button>
        </header>
        <main class="main">${html}</main>
        <nav class="bottombar" aria-label="Secciones">${tabs}</nav>
      </div>`;
  }

  function shellAdmin(path, html) {
    const items = [
      ['/admin/ventas', 'Ventas', 'calendar'],
      ['/admin/movimientos', 'Movimientos', 'history'],
      ['/admin/estadisticas', 'Estadísticas', 'chart'],
      ['/admin/empleados', 'Empleados', 'users'],
    ];
    const links = items.map(([p, l, ic]) => `<a href="#${p}" class="tab ${path === p ? 'is-active' : ''}" ${path === p ? 'aria-current="page"' : ''}>${UI.icon(ic)}<span>${l}</span></a>`).join('');
    return `
      <div class="shell shell--admin">
        <aside class="sidebar">
          ${brand}
          <p class="sidebar__role">Administración</p>
          <nav class="sidebar__nav" aria-label="Secciones">${links}</nav>
          <div class="sidebar__foot">
            <button class="btn btn--ghost btn--sm btn--block" data-logout>${UI.icon('logout')}<span>Salir</span></button>
            <button class="linkbtn" data-reset>Restablecer datos de demostración</button>
          </div>
        </aside>
        <header class="topbar topbar--admin">
          ${brand}
          <button class="btn btn--ghost btn--sm" data-logout>${UI.icon('logout')}<span>Salir</span></button>
        </header>
        <main class="main main--admin">${html}</main>
        <nav class="bottombar bottombar--4" aria-label="Secciones">${links}</nav>
      </div>`;
  }

  function loginView() {
    return {
      html: `
        <div class="login">
          <div class="login__board">
            ${UI.icon('leaf', 'login__leaf')}
            <h1>Sistema de Gestión</h1>
            <p>Verdulería</p>
          </div>
          <form class="login__form card" id="login-form" novalidate>
            <h2>Ingresar</h2>
            <label class="field">
              <span>Usuario</span>
              <input name="usuario" autocomplete="username" autocapitalize="none" required>
            </label>
            <label class="field">
              <span>Contraseña</span>
              <input name="clave" type="password" autocomplete="current-password" required>
            </label>
            <p class="form-error" id="login-error" role="alert" hidden></p>
            <button class="btn btn--primary btn--block btn--lg" type="submit">Ingresar</button>
            <details class="login__demo">
              <summary>Usuarios de prueba</summary>
              <div class="login__demo-grid">
                <button type="button" class="demo-user" data-u="mostrador" data-c="1234"><strong>Mostrador</strong><span>mostrador / 1234</span></button>
                <button type="button" class="demo-user" data-u="admin" data-c="admin"><strong>Administrador</strong><span>admin / admin</span></button>
              </div>
            </details>
          </form>
        </div>`,
      mount(root) {
        const form = root.querySelector('#login-form');
        const err = root.querySelector('#login-error');
        form.addEventListener('submit', e => {
          e.preventDefault();
          const u = form.usuario.value.trim().toLowerCase();
          const user = USUARIOS[u];
          if (!user || user.clave !== form.clave.value) {
            err.textContent = 'Usuario o contraseña incorrectos. Revisá los datos e intentá de nuevo.';
            err.hidden = false;
            return;
          }
          setSesion({ usuario: u, rol: user.rol });
          go(INICIO[user.rol]);
        });
        root.querySelectorAll('.demo-user').forEach(b => b.addEventListener('click', () => {
          form.usuario.value = b.dataset.u; form.clave.value = b.dataset.c; form.requestSubmit();
        }));
      },
    };
  }

  window.addEventListener('hashchange', render);
  render();
  return { render, go };
})();
