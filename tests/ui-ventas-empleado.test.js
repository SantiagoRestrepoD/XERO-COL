'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');

// La vista usa un documento aislado; las pruebas no modifican el navegador del usuario.
function crearVista() {
  function elemento() {
    return {hidden: false, disabled: false, textContent: '', className: '', hijos: [],
      replaceChildren(...hijos) { this.hijos = hijos; }, appendChild(hijo) { this.hijos.push(hijo); }};
  }
  const nodos = Object.fromEntries(['camposDetalleEmpleado', 'agregarProductoEmpleado', 'confirmarVentaEmpleado',
    'sinComprasClienteVenta', 'tablaHistorialClienteVenta', 'relojesClienteVenta'].map((id) => [id, elemento()]));
  const document = {getElementById: (id) => nodos[id], createElement: () => elemento()};
  const contexto = vm.createContext({document});
  const codigo = fs.readFileSync(path.join(raiz, 'js/vista/vista.js'), 'utf8');
  vm.runInContext(codigo + '\n;globalThis.vistaPrueba = Vista;', contexto);
  return {vista: contexto.vistaPrueba, nodos};
}

test('los controles para agregar y confirmar se ocultan en una venta cerrada', () => {
  const {vista, nodos} = crearVista();
  vista.presentarControlesVentaEmpleado({estado: 'confirmado', detalles: [{}]}, false);
  assert.equal(nodos.agregarProductoEmpleado.hidden, true);
  assert.equal(nodos.confirmarVentaEmpleado.hidden, true);
  assert.equal(nodos.camposDetalleEmpleado.disabled, true);
  vista.presentarControlesVentaEmpleado({estado: 'anulado', detalles: [{}]}, false);
  assert.equal(nodos.agregarProductoEmpleado.hidden, true);
  assert.equal(nodos.confirmarVentaEmpleado.hidden, true);
  vista.presentarControlesVentaEmpleado({estado: 'borrador', detalles: [{}]}, true);
  assert.equal(nodos.agregarProductoEmpleado.hidden, false);
  assert.equal(nodos.confirmarVentaEmpleado.hidden, false);
  assert.equal(nodos.confirmarVentaEmpleado.disabled, false);
  vista.presentarControlesVentaEmpleado({estado: 'borrador', detalles: []}, true);
  assert.equal(nodos.confirmarVentaEmpleado.disabled, true);
});

test('la vista presenta el historial recibido y lo limpia cuando está vacío', () => {
  const {vista, nodos} = crearVista();
  const fecha = '2026-01-05T12:00:00.000Z';
  vista.dibujarHistorialClienteVenta([{nombre: 'Reloj ficticio', fecha, precio: 12000}]);
  const fila = nodos.relojesClienteVenta.hijos[0];
  assert.equal(fila.hijos[0].textContent, 'Reloj ficticio');
  assert.equal(fila.hijos[1].textContent, new Date(fecha).toLocaleDateString('es-CO'));
  assert.equal(fila.hijos[2].textContent, vista.moneda(12000));
  assert.equal(nodos.tablaHistorialClienteVenta.hidden, false);
  vista.dibujarHistorialClienteVenta([]);
  assert.equal(nodos.relojesClienteVenta.hijos.length, 0);
  assert.equal(nodos.tablaHistorialClienteVenta.hidden, true);
  assert.equal(nodos.sinComprasClienteVenta.textContent, 'Este cliente aún no tiene compras.');
  assert.equal(nodos.sinComprasClienteVenta.hidden, false);
});

test('el controlador consulta solo el cliente seleccionado y limpia el historial al quitar la selección', () => {
  const solicitudes = [];
  const dibujos = [];
  const contenedor = {hidden: true};
  const selector = {value: '', addEventListener(tipo, funcion) { this.tipo = tipo; this.funcion = funcion; }};
  const Modelo = {relojesCompradosPorCliente(id) { solicitudes.push(id); return [{nombre: 'Reloj de ' + id}]; }};
  const Vista = {dibujarHistorialClienteVenta(relojes) { dibujos.push(relojes); }, mensaje() {}};
  const document = {getElementById: () => contenedor};
  const contexto = vm.createContext({Modelo, Vista, document, AbortController});
  const codigo = fs.readFileSync(path.join(raiz, 'js/controlador/controlador.js'), 'utf8');
  vm.runInContext(codigo + '\n;globalThis.controladorPrueba = Controlador;', contexto);
  const refrescar = contexto.controladorPrueba.iniciarHistorialVentaEmpleado(selector);
  assert.equal(selector.tipo, 'change');
  selector.value = 'cliente-a'; refrescar();
  assert.equal(dibujos.at(-1)[0].nombre, 'Reloj de cliente-a');
  assert.equal(contenedor.hidden, false);
  selector.value = 'cliente-b'; refrescar();
  assert.equal(dibujos.at(-1)[0].nombre, 'Reloj de cliente-b');
  assert.deepEqual(solicitudes, ['cliente-a', 'cliente-b']);
  selector.value = ''; refrescar();
  assert.equal(dibujos.at(-1).length, 0);
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(solicitudes, ['cliente-a', 'cliente-b']);
});
