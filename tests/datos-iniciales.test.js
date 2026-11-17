'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');
const claveEstado = 'xeroUniversidadDemoV1';

// Cada modelo comparte solo un almacenamiento simulado y aislado.
function crearEntorno(datos = new Map()) {
  const localStorage = {
    getItem: (clave) => datos.has(clave) ? datos.get(clave) : null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear()
  };
  const location = {pathname: '/index.html'};
  let limpiezas = 0;
  const contexto = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL,
    ServicioImagenes: {borrarTodas: async () => { limpiezas++; }}});
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8') +
    '\n;globalThis.modeloPrueba = Modelo;', contexto);
  return {modelo: contexto.modeloPrueba, datos, location, localStorage,
    estado: () => JSON.parse(datos.get(claveEstado)), limpiezas: () => limpiezas};
}

test('los datos iniciales incluyen tres clientes, dos ventas confirmadas y productos de ejemplo', () => {
  const e = crearEntorno();
  const estado = e.estado();
  assert.deepEqual(estado.clientes.map((cliente) => cliente.nombre),
    ['Cliente Demo Uno', 'Cliente Demo Dos', 'Cliente Demo Tres']);
  for (const cliente of estado.clientes) {
    assert.match(cliente.correo, /^[^@\s]+@example\.com$/);
    assert.match(cliente.telefono, /^\d{7,10}$/);
    assert.ok(cliente.direccion && cliente.ciudad);
    assert.equal(cliente.activo, true);
    assert.equal(e.modelo.validarCliente(cliente).valido, true);
  }
  assert.equal(estado.empleados.length, 1);
  assert.equal(estado.empleados[0].activo, true);
  assert.equal(estado.ventas.length, 2);
  for (const [indice, venta] of estado.ventas.entries()) {
    assert.equal(venta.estado, 'confirmado');
    assert.equal(venta.clienteId, estado.clientes[indice].id);
    assert.match(venta.fecha, /^2026-11-/);
    assert.equal(venta.detalles.length, 2);
    for (const linea of venta.detalles) {
      const producto = estado.productos.find((item) => item.id === linea.productoId);
      assert.ok(producto, 'La línea debe referir a un producto existente');
      assert.match(producto.nombre, /^Demo /);
      assert.equal(linea.nombre, producto.nombre);
      assert.ok(Number.isInteger(linea.centavos) && linea.centavos >= 0);
      assert.equal(linea.centavos, Math.round(Number(producto.precio) * 100));
      assert.ok(Number.isInteger(linea.cantidad) && linea.cantidad > 0);
    }
  }
});

test('el administrador puede anular las ventas iniciales y revertir su inventario', async () => {
  const e = crearEntorno();
  e.location.pathname = '/login.html';
  const acceso = await e.modelo.iniciarSesionDemo('admin.demo', 'DemoAdmin123!');
  assert.equal(acceso.valido, true, acceso.mensaje);
  e.location.pathname = '/admin-ventas.html';
  for (const venta of e.estado().ventas) {
    const antes = Object.fromEntries(venta.detalles.map((linea) => {
      const producto = e.modelo.producto(linea.productoId);
      return [linea.productoId, {cantidad: producto.cantidad, ventas: producto.ventas}];
    }));
    e.modelo.transicion('ventas', venta.id, 'anular', 'Prueba de anulación');
    assert.equal(e.modelo.documento('ventas', venta.id).estado, 'anulado');
    for (const linea of venta.detalles) {
      const producto = e.modelo.producto(linea.productoId);
      assert.equal(producto.cantidad, antes[linea.productoId].cantidad + linea.cantidad);
      assert.equal(producto.ventas, antes[linea.productoId].ventas - linea.cantidad);
    }
  }
});

test('la cuenta cliente.demo está vinculada al primer perfil y solo ve su compra', async () => {
  const e = crearEntorno();
  const resultado = await e.modelo.iniciarSesionDemo('cliente.demo', 'DemoCliente123!');
  assert.equal(resultado.valido, true, resultado.mensaje);
  e.location.pathname = '/cliente.html';
  const estado = e.estado();
  assert.equal(e.modelo.sesionActual().clienteId, estado.clientes[0].id);
  const ventas = e.modelo.listar('ventas');
  assert.equal(ventas.length, 1);
  assert.equal(ventas[0].id, estado.ventas[0].id);
  assert.equal(ventas[0].detalles.length, 2);
  assert.equal(ventas.some((venta) => venta.id === estado.ventas[1].id), false);
  assert.equal(estado.usuariosDemo.some((cuenta) => cuenta.empleadoId === estado.empleados[0].id), false);
});

test('la recarga conserva datos existentes y el restablecimiento repone la semilla', async () => {
  const e = crearEntorno();
  const estadoInicial = e.estado();
  const modificado = e.estado();
  modificado.clientes[0].nombre = 'Cambio local de prueba';
  e.localStorage.setItem(claveEstado, JSON.stringify(modificado));
  const recargado = crearEntorno(e.datos);
  assert.equal(recargado.estado().clientes[0].nombre, 'Cambio local de prueba');
  recargado.location.pathname = '/login.html';
  const acceso = await recargado.modelo.iniciarSesionDemo('admin.demo', 'DemoAdmin123!');
  assert.equal(acceso.valido, true, acceso.mensaje);
  recargado.location.pathname = '/admin.html';
  const resultado = await recargado.modelo.restablecer();
  assert.equal(resultado.imagenesBorradas, true);
  assert.equal(recargado.limpiezas(), 1);
  const restaurado = recargado.estado();
  assert.deepEqual(restaurado.clientes, estadoInicial.clientes);
  assert.deepEqual(restaurado.empleados, estadoInicial.empleados);
  assert.deepEqual(restaurado.ventas, estadoInicial.ventas);
  assert.deepEqual(restaurado.productos, estadoInicial.productos);
  const loginCliente = await recargado.modelo.iniciarSesionDemo('cliente.demo', 'DemoCliente123!');
  assert.equal(loginCliente.valido, true, loginCliente.mensaje);
  recargado.location.pathname = '/cliente.html';
  assert.equal(recargado.modelo.sesionActual().clienteId, estadoInicial.clientes[0].id);
});
