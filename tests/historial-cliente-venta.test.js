'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

const raiz = path.resolve(__dirname, '..');
const claveEstado = 'xeroUniversidadDemoV1';
function crearEntorno() {
  const almacen = new Map();
  const localStorage = {getItem: (k) => almacen.get(k) ?? null, setItem: (k, v) => almacen.set(k, String(v))};
  const location = {pathname: '/login.html'};
  const contexto = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL});
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8') + '\n;globalThis.modeloPrueba = Modelo;', contexto);
  const modelo = contexto.modeloPrueba;
  async function entrar(usuario, clave, destino) {
    location.pathname = '/login.html';
    const resultado = await modelo.iniciarSesionDemo(usuario, clave);
    assert.equal(resultado.valido, true, resultado.mensaje);
    location.pathname = '/' + destino;
  }
  async function sembrar() {
    await entrar('admin.demo', 'DemoAdmin123!', 'admin.html');
    const estado = JSON.parse(almacen.get(claveEstado));
    estado.clientes.push({id:'cliente-a', nombre:'Persona A', activo:true}, {id:'cliente-b', nombre:'Persona B', activo:true}, {id:'inactivo', nombre:'Persona inactiva', activo:false});
    estado.usuariosDemo.find((u) => u.usuario === 'cliente.demo').clienteId = 'cliente-a';
    const venta = (id, clienteId, estadoVenta, detalles) => ({id, clienteId, estado:estadoVenta, fecha:'2025-01-02T00:00:00.000Z', detalles});
    const linea = (nombre, centavos) => ({id:'linea', productoId:'demo-01', nombre, cantidad:1, centavos});
    estado.ventas.push(venta('a-confirmada','cliente-a','confirmado',[linea('Reloj A',18990000),linea('Reloj A2',0)]),
      venta('b-confirmada','cliente-b','confirmado',[linea('Reloj B',25000000)]),
      venta('a-borrador','cliente-a','borrador',[linea('Reloj borrador',100)]),
      venta('a-anulada','cliente-a','anulado',[linea('Reloj anulado',100)]),
      venta('antigua',undefined,'confirmado',[linea('Reloj antiguo',100)]),
      venta('sin-detalles','cliente-a','confirmado',null));
    almacen.set(claveEstado, JSON.stringify(estado));
    assert.equal(modelo.sincronizar(), true);
  }
  return {modelo, location, entrar, sembrar};
}

test('el empleado obtiene solo los relojes confirmados del cliente elegido y su precio unitario', async () => {
  const e=crearEntorno(); await e.sembrar(); await e.entrar('empleado.demo','DemoEmpleado123!','empleado.html');
  const filas=JSON.parse(JSON.stringify(e.modelo.relojesCompradosPorCliente('cliente-a')));
  assert.deepEqual(filas,[{nombre:'Reloj A',fecha:'2025-01-02T00:00:00.000Z',precio:189900},{nombre:'Reloj A2',fecha:'2025-01-02T00:00:00.000Z',precio:0}]);
  assert.deepEqual(JSON.parse(JSON.stringify(e.modelo.relojesCompradosPorCliente('cliente-b'))),[{nombre:'Reloj B',fecha:'2025-01-02T00:00:00.000Z',precio:250000}]);
  assert.deepEqual(Array.from(e.modelo.relojesCompradosPorCliente('')),[]);
  assert.throws(() => e.modelo.relojesCompradosPorCliente('inactivo'), /cliente activo/);
  assert.throws(() => e.modelo.relojesCompradosPorCliente('no-existe'), /cliente activo/);
  assert.throws(() => e.modelo.listar('compras'), /acceso/);
  assert.equal(e.modelo.listar('ventas').length,0);
});

test('el nuevo historial no permite el acceso desde otros roles ni páginas', async () => {
  const e=crearEntorno();
  assert.throws(() => e.modelo.relojesCompradosPorCliente('cliente-a'), /acceso/);
  await e.sembrar();
  assert.throws(() => e.modelo.relojesCompradosPorCliente('cliente-a'), /acceso/);
  await e.entrar('cliente.demo','DemoCliente123!','cliente.html');
  assert.throws(() => e.modelo.relojesCompradosPorCliente('cliente-a'), /acceso/);
  assert.deepEqual(Array.from(e.modelo.listar('ventas'),v=>v.id).sort(),['a-anulada','a-borrador','a-confirmada','sin-detalles']);
  await e.entrar('empleado.demo','DemoEmpleado123!','empleado.html');
  e.location.pathname='/catalogo.html';
  assert.throws(() => e.modelo.relojesCompradosPorCliente('cliente-a'), /acceso/);
});
