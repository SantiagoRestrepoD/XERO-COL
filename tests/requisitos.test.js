'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

// Los datos de prueba no acceden al almacenamiento real del navegador.
const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');
function crearEntorno() {
  const valores = new Map();
  const localStorage = {
    getItem: (clave) => valores.has(clave) ? valores.get(clave) : null,
    setItem: (clave, valor) => valores.set(clave, String(valor)),
    removeItem: (clave) => valores.delete(clave),
    clear: () => valores.clear()
  };
  const location = { pathname: '/index.html' };
  const entorno = vm.createContext({ localStorage, location, crypto: webcrypto, TextEncoder, URL,
    ServicioImagenes: { borrarTodas: async () => {} } });
  const archivo = path.join(raiz, 'js', 'modelo', 'modelo.js');
  vm.runInContext(fs.readFileSync(archivo, 'utf8') + '\n;globalThis.modeloPrueba = Modelo;', entorno, { filename: archivo });
  const modelo = entorno.modeloPrueba;
  async function entrar(rol, pagina) {
    const cuentas = {
      administrador: ['admin.demo', 'DemoAdmin123!', 'admin.html'],
      empleado: ['empleado.demo', 'DemoEmpleado123!', 'empleado.html'],
      cliente: ['cliente.demo', 'DemoCliente123!', 'cliente.html']
    };
    const [usuario, clave, destino] = cuentas[rol];
    location.pathname = '/login.html';
    const resultado = await modelo.iniciarSesionDemo(usuario, clave);
    assert.equal(resultado.valido, true, resultado.mensaje);
    assert.equal(resultado.destino, destino);
    location.pathname = '/' + (pagina || destino);
  }
  function sembrar(fn) {
    const clave = 'xeroUniversidadDemoV1';
    const estado = JSON.parse(localStorage.getItem(clave));
    fn(estado);
    localStorage.setItem(clave, JSON.stringify(estado));
    assert.equal(modelo.sincronizar(), true);
  }
  return { modelo, location, localStorage, entrar, sembrar };
}
function sinDatos(consulta) {
  try {
    const resultado = consulta();
    return resultado == null || Array.isArray(resultado) && resultado.length === 0;
  } catch { return true; }
}

test('las rutas JS y los formularios no contienen la propiedad retirada', () => {
  function archivos(carpeta) { return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? archivos(path.join(carpeta, e.name)) : [path.join(carpeta, e.name)]); }
  for (const archivo of archivos(path.join(raiz, 'js')).filter((p) => p.endsWith('.js'))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /especificaciones/i, archivo);
  }
  const inicio = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.doesNotMatch(inicio, /especificaciones/i);
  const productos = fs.readFileSync(path.join(raiz, 'admin-productos.html'), 'utf8');
  const form = productos.match(/<form\b[^>]*id="formProducto"[\s\S]*?<\/form>/i);
  assert.ok(form, 'No se encontró el formulario en admin-productos.html');
  assert.doesNotMatch(form[0], /especificaciones/i);
});

test('la cuenta cliente sin vínculo mantiene clienteId vacío', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const cuenta = e.modelo.listarCuentasCliente().find((c) => c.usuario === 'cliente.demo');
  e.modelo.vincularCuentaCliente(cuenta.id, '');
  await e.entrar('cliente');
  assert.ok(!e.modelo.sesionActual().clienteId);
});

test('el administrador vincula expresamente una cuenta a un perfil', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const perfil = e.modelo.guardarPersona('clientes', { nombre: 'Perfil de prueba', correo: 'prueba@example.org', telefono: '1234567', direccion: '' });
  const cuenta = e.modelo.listarCuentasCliente().find((c) => c.usuario === 'cliente.demo');
  assert.ok(cuenta, 'No existe la cuenta demo de cliente');
  e.modelo.vincularCuentaCliente(cuenta.id, perfil.id);
  await e.entrar('cliente');
  assert.equal(e.modelo.sesionActual().clienteId, perfil.id);
});

test('una venta nueva guarda la referencia del perfil de cliente', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const perfil = e.modelo.guardarPersona('clientes', { nombre: 'Cliente venta', correo: '', telefono: '1234567', direccion: '' });
  e.location.pathname = '/admin-ventas.html';
  const venta = e.modelo.guardarDocumento('ventas', { clienteId: perfil.id, contacto: perfil.nombre, observaciones: '' });
  assert.equal(venta.clienteId, perfil.id);
  assert.equal(e.modelo.documento('ventas', venta.id).clienteId, perfil.id);
});

test('empleado confirma venta sin anularla ni editarla, y no accede a compras ni administra cuentas', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const perfil = e.modelo.guardarPersona('clientes', { nombre: 'Cliente empleado', correo: '', telefono: '1234567', direccion: '' });
  e.location.pathname = '/admin-compras.html';
  const compra = e.modelo.guardarDocumento('compras', { contacto: 'Proveedor prueba', observaciones: '' });
  await e.entrar('empleado');
  assert.ok(sinDatos(() => e.modelo.listar('compras')), 'El empleado recibió compras desde listar');
  assert.ok(sinDatos(() => e.modelo.documento('compras', compra.id)), 'El empleado recibió una compra por ID');
  assert.throws(() => e.modelo.guardarDocumento('compras', { contacto: 'Proveedor prueba' }));
  const producto = e.modelo.listar('productos').find((p) => p.activo && p.cantidad > 0 && p.cantidad !== 42);
  assert.ok(producto);
  const anterior = producto.cantidad;
  const venta = e.modelo.guardarDocumento('ventas', { clienteId: perfil.id, contacto: perfil.nombre, observaciones: '' });
  // Una entrada de precio alterada debe rechazarse o conservar el precio del producto.
  try {
    e.modelo.guardarDetalle('ventas', venta.id, { productoId: producto.id, cantidad: 1, precio: '0.01' });
  } catch {
    e.modelo.guardarDetalle('ventas', venta.id, { productoId: producto.id, cantidad: 1, precio: producto.precio });
  }
  const detalle = e.modelo.documento('ventas', venta.id).detalles[0];
  assert.equal(detalle.centavos, Math.round(Number(producto.precio) * 100), 'El empleado alteró el precio de la línea');
  e.modelo.transicion('ventas', venta.id, 'confirmar');
  assert.equal(e.modelo.producto(producto.id).cantidad, anterior - 1);
  assert.throws(() => e.modelo.transicion('ventas', venta.id, 'anular', 'Prueba de permiso'));
  assert.throws(() => e.modelo.guardarDocumento('ventas', { clienteId: perfil.id, contacto: 'Cambio no autorizado' }, venta.id));
  assert.throws(() => e.modelo.guardarDetalle('ventas', venta.id, { productoId: producto.id, cantidad: 1, precio: '2000' }));
  assert.throws(() => e.modelo.guardarProducto({ nombre: producto.nombre, precio: '1', cantidad: producto.cantidad, categoria: producto.categoria, imagen: producto.imagen }, producto.id));
  assert.throws(() => e.modelo.vincularCuentaCliente('acceso-cliente-demo', perfil.id));
  assert.throws(() => e.modelo.guardarPersona('empleados', { nombre: 'Empleado indebido' }));
  await assert.rejects(async () => e.modelo.restablecer());
  assert.equal(e.modelo.producto(producto.id).cantidad, anterior - 1);
});

// La página de cliente recibe datos de ejemplo y entrega el resultado a una vista espía.
function ejecutarPaginaCliente({ sesion, clientes, ventas }) {
  const recibido = [];
  let consultasVentas = 0;
  const entorno = vm.createContext({
    document: {},
    Controlador: { iniciarModulo: (iniciar) => iniciar(), puedeIniciarPagina: () => true, escuchar: () => {} },
    Modelo: {
      imagenes: [], sesionActual: () => sesion,
      listar: (tipo) => {
        if (tipo === 'clientes') return clientes;
        if (tipo === 'ventas') { consultasVentas++; return ventas; }
        if (tipo === 'productos') return [];
        throw new Error('Colección inesperada en la prueba: ' + tipo);
      }
    },
    Vista: { dibujarCliente: (...argumentos) => recibido.push(argumentos) }
  });
  const archivo = path.join(raiz, 'js', 'paginas', 'cliente.js');
  vm.runInContext(fs.readFileSync(archivo, 'utf8'), entorno, { filename: archivo });
  return { recibido, consultasVentas };
}

test('una cuenta sin vínculo no recibe compras en su vista', () => {
  const resultado = ejecutarPaginaCliente({ sesion: { clienteId: null }, clientes: [], ventas: [{ id: 'venta-ajena', clienteId: 'cliente-2' }] });
  assert.equal(resultado.consultasVentas, 0);
  assert.equal(resultado.recibido.length, 1);
  assert.equal(resultado.recibido[0][1], null);
  assert.equal(resultado.recibido[0][2].length, 0);
});

test('el historial pasa a la vista solamente ventas del perfil vinculado', () => {
  const resultado = ejecutarPaginaCliente({
    sesion: { clienteId: 'cliente-1' }, clientes: [{ id: 'cliente-1', nombre: 'Cliente 1' }, { id: 'cliente-2', nombre: 'Cliente 2' }],
    ventas: [{ id: 'propia', clienteId: 'cliente-1' }, { id: 'ajena', clienteId: 'cliente-2' }, { id: 'anterior' }]
  });
  assert.equal(resultado.recibido.length, 1);
  assert.deepEqual(Array.from(resultado.recibido[0][2], (venta) => venta.id), ['propia']);
});

test('el servicio compartido muestra USD en las tarjetas de Inicio al recibir una tasa', async () => {
  const insertados = [];
  const precioCop = { insertAdjacentElement: (posicion, nodo) => { assert.equal(posicion, 'afterend'); insertados.push(nodo.textContent); } };
  const estado = { textContent: '' };
  let actualizaciones = 0;
  const document = {
    querySelectorAll: (selector) => { assert.equal(selector, '#tarjetasInicio .tarjeta'); return [{ querySelector: (s) => s === '.tarjeta__precio' ? precioCop : null }]; },
    createElement: (tag) => { assert.equal(tag, 'p'); return { textContent: '' }; }
  };
  const entorno = vm.createContext({ document, Intl, obtenerTasaUSD: async () => 0.00025 });
  const archivo = path.join(raiz, 'js', 'servicios', 'precios-usd.js');
  vm.runInContext(fs.readFileSync(archivo, 'utf8') + '\n;globalThis.preciosPrueba = PreciosUSD;', entorno, { filename: archivo });
  const precios = entorno.preciosPrueba.crear(estado, () => { actualizaciones++; });
  await precios.cargar();
  precios.agregar('tarjetasInicio', [{ precio: '100000' }]);
  assert.equal(actualizaciones, 1);
  assert.match(estado.textContent, /COP.*USD/);
  assert.equal(insertados.length, 1);
  assert.equal(insertados[0], 'Aprox. ' + new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(25) + ' USD');
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const controlador = fs.readFileSync(path.join(raiz, 'js', 'controlador', 'controlador.js'), 'utf8');
  assert.match(html, /js\/servicios\/precios-usd\.js/);
  assert.match(html, /id="tarjetasInicio"/);
  assert.match(controlador, /preciosUSD\.agregar\('tarjetasInicio',\s*lista\)/);
});

test('una tasa no disponible conserva la página y muestra el mensaje de error del catálogo', async () => {
  const estado = { textContent: '' };
  let actualizaciones = 0;
  const entorno = vm.createContext({
    document: { querySelectorAll: () => [], createElement: () => ({ textContent: '' }) },
    Intl,
    obtenerTasaUSD: async () => { throw new Error('Fallo simulado'); }
  });
  const archivo = path.join(raiz, 'js', 'servicios', 'precios-usd.js');
  vm.runInContext(fs.readFileSync(archivo, 'utf8') + '\n;globalThis.preciosPrueba = PreciosUSD;', entorno, { filename: archivo });
  const precios = entorno.preciosPrueba.crear(estado, () => { actualizaciones++; });
  await precios.cargar();
  assert.equal(estado.textContent, 'No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.');
  assert.equal(actualizaciones, 0);
  assert.doesNotThrow(() => precios.agregar('tarjetasInicio', [{ precio: '100000' }]));
});

test('el empleado no puede operar ni leer el borrador de venta creado por otra cuenta', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const perfil = e.modelo.guardarPersona('clientes', { nombre: 'Cliente otra venta', correo: '', telefono: '1234567', direccion: '' });
  e.location.pathname = '/admin-ventas.html';
  const ajena = e.modelo.guardarDocumento('ventas', { clienteId: perfil.id, contacto: perfil.nombre, observaciones: '' });
  const producto = e.modelo.listar('productos').find((p) => p.activo && p.cantidad > 0 && p.cantidad !== 42);
  e.modelo.guardarDetalle('ventas', ajena.id, { productoId: producto.id, cantidad: 1, precio: producto.precio });
  await e.entrar('empleado');
  assert.ok(sinDatos(() => e.modelo.documento('ventas', ajena.id)));
  assert.throws(() => e.modelo.guardarDetalle('ventas', ajena.id, { productoId: producto.id, cantidad: 1, precio: producto.precio }));
  assert.throws(() => e.modelo.transicion('ventas', ajena.id, 'confirmar'));
});

test('el vínculo se puede retirar y un id inexistente no se acepta', async () => {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  const perfil = e.modelo.guardarPersona('clientes', { nombre: 'Cliente sin asignar', correo: '', telefono: '1234567', direccion: '' });
  const cuenta = e.modelo.listarCuentasCliente().find((c) => c.usuario === 'cliente.demo');
  assert.equal(cuenta.clienteId, 'cliente-demo-01');
  assert.throws(() => e.modelo.vincularCuentaCliente(cuenta.id, 'perfil-inexistente'));
  assert.equal(e.modelo.listarCuentasCliente().find((c) => c.id === cuenta.id).clienteId, cuenta.clienteId);
  e.modelo.vincularCuentaCliente(cuenta.id, perfil.id);
  assert.equal(e.modelo.listarCuentasCliente().find((c) => c.id === cuenta.id).clienteId, perfil.id);
  e.modelo.vincularCuentaCliente(cuenta.id, '');
  assert.ok(!e.modelo.listarCuentasCliente().find((c) => c.id === cuenta.id).clienteId);
});


// Las cuentas de esta prueba son datos sintéticos, aislados del navegador del usuario.
test('ventas de empleados conservan autoría, aíslan borradores y mantienen visibles las ventas anteriores para administración', async () => {
  const entorno = crearEntorno();
  await entorno.entrar('administrador', 'admin-clientes.html');
  const perfilCliente = entorno.modelo.guardarPersona('clientes', { nombre: 'Cliente aislado', correo: '', telefono: '1234567', direccion: '' });
  entorno.location.pathname = '/admin-empleados.html';
  const perfilA = entorno.modelo.guardarPersona('empleados', { nombre: 'Empleado aislado A', correo: '', telefono: '' });
  const perfilB = entorno.modelo.guardarPersona('empleados', { nombre: 'Empleado aislado B', correo: '', telefono: '' });
  const clavePrueba = 'PruebaLocal123!';
  await entorno.modelo.guardarCuentaEmpleado(perfilA.id, { usuario: 'prueba.empleado.a', clave: clavePrueba, confirmacion: clavePrueba });
  await entorno.modelo.guardarCuentaEmpleado(perfilB.id, { usuario: 'prueba.empleado.b', clave: clavePrueba, confirmacion: clavePrueba });
  const cuentaA = entorno.modelo.cuentaEmpleado(perfilA.id);
  const cuentaB = entorno.modelo.cuentaEmpleado(perfilB.id);
  assert.ok(cuentaA?.id && cuentaB?.id && cuentaA.id !== cuentaB.id);

  entorno.location.pathname = '/admin-ventas.html';
  const ventaAdmin = entorno.modelo.guardarDocumento('ventas', { clienteId: perfilCliente.id, contacto: perfilCliente.nombre, observaciones: '' });
  const ventaAnterior = entorno.modelo.guardarDocumento('ventas', { clienteId: perfilCliente.id, contacto: perfilCliente.nombre, observaciones: '' });
  entorno.sembrar((estado) => {
    const anterior = estado.ventas.find((venta) => venta.id === ventaAnterior.id);
    anterior.creadorId = cuentaA.id;
    delete anterior.empleadoId;
  });
  const anteriorSinCambios = JSON.parse(entorno.localStorage.getItem('xeroUniversidadDemoV1')).ventas.find((venta) => venta.id === ventaAnterior.id);

  async function entrarEmpleado(usuario) {
    entorno.location.pathname = '/login.html';
    const respuesta = await entorno.modelo.iniciarSesionDemo(usuario, clavePrueba);
    assert.equal(respuesta.valido, true, respuesta.mensaje);
    assert.equal(respuesta.destino, 'empleado.html');
    entorno.location.pathname = '/empleado.html';
  }
  await entrarEmpleado('prueba.empleado.a');
  assert.equal(entorno.modelo.sesionActual().id, cuentaA.id);
  const ventaA = entorno.modelo.guardarDocumento('ventas', { clienteId: perfilCliente.id, contacto: perfilCliente.nombre, observaciones: '' });
  assert.equal(ventaA.empleadoId, cuentaA.id);
  const producto = entorno.modelo.listar('productos').find((item) => item.activo && item.cantidad > 0 && item.cantidad !== 42);
  assert.ok(producto);
  entorno.modelo.guardarDetalle('ventas', ventaA.id, { productoId: producto.id, cantidad: 1 });
  const lineaA = entorno.modelo.documento('ventas', ventaA.id).detalles[0].id;

  await entrarEmpleado('prueba.empleado.b');
  assert.equal(entorno.modelo.sesionActual().id, cuentaB.id);
  const ventaB = entorno.modelo.guardarDocumento('ventas', { clienteId: perfilCliente.id, contacto: perfilCliente.nombre, observaciones: '' });
  assert.equal(ventaB.empleadoId, cuentaB.id);
  entorno.modelo.guardarDetalle('ventas', ventaB.id, { productoId: producto.id, cantidad: 1 });
  const lineaB = entorno.modelo.documento('ventas', ventaB.id).detalles[0].id;
  const estadoAntes = entorno.localStorage.getItem('xeroUniversidadDemoV1');
  const errorEsperado = { message: 'Solo puedes modificar las ventas que creaste.' };
  assert.throws(() => entorno.modelo.documento('ventas', ventaA.id), errorEsperado);
  assert.throws(() => entorno.modelo.guardarDocumento('ventas', { contacto: perfilCliente.nombre, observaciones: '' }, ventaA.id), errorEsperado);
  assert.throws(() => entorno.modelo.guardarDetalle('ventas', ventaA.id, { productoId: producto.id, cantidad: 1 }), errorEsperado);
  assert.throws(() => entorno.modelo.guardarDetalle('ventas', ventaA.id, { productoId: producto.id, cantidad: 1 }, lineaA), errorEsperado);
  assert.throws(() => entorno.modelo.quitarDetalle('ventas', ventaA.id, lineaA), errorEsperado);
  assert.throws(() => entorno.modelo.transicion('ventas', ventaA.id, 'confirmar'), errorEsperado);
  assert.throws(() => entorno.modelo.transicion('ventas', ventaA.id, 'anular', 'Motivo de prueba'), errorEsperado);
  assert.throws(() => entorno.modelo.guardarDocumento('ventas', { contacto: perfilCliente.nombre, observaciones: '' }, ventaB.id));
  assert.throws(() => entorno.modelo.guardarDetalle('ventas', ventaB.id, { productoId: producto.id, cantidad: 1 }, lineaB));
  assert.throws(() => entorno.modelo.transicion('ventas', ventaB.id, 'anular', 'Motivo de prueba'));
  assert.equal(entorno.localStorage.getItem('xeroUniversidadDemoV1'), estadoAntes, 'Los intentos denegados no deben modificar datos');
  entorno.modelo.quitarDetalle('ventas', ventaB.id, lineaB);
  assert.equal(entorno.modelo.documento('ventas', ventaB.id).detalles.length, 0);
  assert.deepEqual(Array.from(entorno.modelo.ventasDelEmpleado(cuentaB.id), (venta) => venta.id), [ventaB.id]);
  assert.ok(sinDatos(() => entorno.modelo.ventasDelEmpleado(cuentaA.id)), 'La cuenta B no debe consultar las ventas de A');

  await entrarEmpleado('prueba.empleado.a');
  assert.deepEqual(Array.from(entorno.modelo.ventasDelEmpleado(cuentaA.id), (venta) => venta.id), [ventaA.id]);
  assert.ok(!entorno.modelo.ventasDelEmpleado(cuentaA.id).some((venta) => [ventaB.id, ventaAnterior.id, ventaAdmin.id].includes(venta.id)));

  await entorno.entrar('administrador', 'admin-ventas.html');
  const idsAdmin = Array.from(entorno.modelo.listar('ventas'), (venta) => venta.id);
  for (const id of [ventaA.id, ventaB.id, ventaAnterior.id, ventaAdmin.id]) { assert.ok(idsAdmin.includes(id), `Administración no ve ${id}`); }
  const anteriorDespues = JSON.parse(entorno.localStorage.getItem('xeroUniversidadDemoV1')).ventas.find((venta) => venta.id === ventaAnterior.id);
  assert.deepEqual(anteriorDespues, anteriorSinCambios, 'La venta anterior debe conservar exactamente su estructura');
  assert.ok(!Object.hasOwn(anteriorDespues, 'empleadoId'));
});
