'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

async function preparar() {
  const valores = new Map();
  const localStorage = {getItem: (clave) => valores.get(clave) ?? null, setItem: (clave, valor) => valores.set(clave, String(valor)), removeItem: (clave) => valores.delete(clave)};
  const location = {pathname: '/index.html'};
  const contexto = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL, ServicioImagenes: {borrarTodas: async () => {}}});
  const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8') + '\n;globalThis.modeloPrueba = Modelo;', contexto);
  const modelo = contexto.modeloPrueba;
  async function entrar(rol, pagina) {
    const cuentas = {administrador: ['admin.demo', 'DemoAdmin123!', 'admin.html'], empleado: ['empleado.demo', 'DemoEmpleado123!', 'empleado.html']};
    const [usuario, clave, destino] = cuentas[rol];
    location.pathname = '/login.html';
    assert.equal((await modelo.iniciarSesionDemo(usuario, clave)).valido, true);
    location.pathname = '/' + (pagina || destino);
  }
  await entrar('administrador', 'admin-clientes.html');
  const cliente = modelo.guardarPersona('clientes', {nombre:'Cliente Prueba', telefono:'1234567'});
  await entrar('empleado');
  const venta = modelo.guardarDocumento('ventas', {contacto:cliente.nombre, clienteId:cliente.id});
  modelo.guardarDetalle('ventas', venta.id, {productoId:'demo-01', cantidad:1});
  const lineaId = modelo.documento('ventas', venta.id).detalles[0].id;
  return {modelo, localStorage, entrar, venta, lineaId};
}

function modificarDatos(entorno, cambiar) {
  const clave = 'xeroUniversidadDemoV1';
  const estado = JSON.parse(entorno.localStorage.getItem(clave));
  cambiar(estado);
  entorno.localStorage.setItem(clave, JSON.stringify(estado));
  assert.equal(entorno.modelo.sincronizar(), true);
}

test('empleado quita una línea de su propio borrador sin alterar el inventario', async () => {
  const e = await preparar();
  const cantidad = e.modelo.producto('demo-01').cantidad;
  e.modelo.quitarDetalle('ventas', e.venta.id, e.lineaId);
  assert.equal(e.modelo.documento('ventas', e.venta.id).detalles.length, 0);
  assert.equal(e.modelo.producto('demo-01').cantidad, cantidad);
});

test('empleado no quita una línea de una venta ajena', async () => {
  const e = await preparar();
  modificarDatos(e, (estado) => { estado.ventas.find((venta) => venta.id === e.venta.id).empleadoId = 'otra-cuenta'; });
  const antes = e.localStorage.getItem('xeroUniversidadDemoV1');
  assert.throws(() => e.modelo.quitarDetalle('ventas', e.venta.id, e.lineaId), {message:'Solo puedes modificar las ventas que creaste.'});
  assert.equal(e.localStorage.getItem('xeroUniversidadDemoV1'), antes);
});

for (const estado of ['confirmado', 'anulado']) {
  test('empleado no quita una línea de una venta propia en estado ' + estado, async () => {
    const e = await preparar();
    modificarDatos(e, (datos) => { datos.ventas.find((venta) => venta.id === e.venta.id).estado = estado; });
    const antes = e.localStorage.getItem('xeroUniversidadDemoV1');
    assert.throws(() => e.modelo.quitarDetalle('ventas', e.venta.id, e.lineaId), {message:'Solo puedes quitar líneas de borradores abiertos.'});
    assert.equal(e.localStorage.getItem('xeroUniversidadDemoV1'), antes);
  });
}

test('administrador conserva el permiso de quitar líneas de borradores y el rechazo anterior de cerrados', async () => {
  const e = await preparar();
  await e.entrar('administrador', 'admin-ventas.html');
  modificarDatos(e, (datos) => { datos.ventas.find((venta) => venta.id === e.venta.id).estado = 'confirmado'; });
  assert.throws(() => e.modelo.quitarDetalle('ventas', e.venta.id, e.lineaId), {message:'Los detalles están cerrados.'});
  modificarDatos(e, (datos) => { datos.ventas.find((venta) => venta.id === e.venta.id).estado = 'borrador'; });
  e.modelo.quitarDetalle('ventas', e.venta.id, e.lineaId);
  assert.equal(e.modelo.documento('ventas', e.venta.id).detalles.length, 0);
});
