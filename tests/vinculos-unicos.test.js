'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

const claveEstado = 'xeroUniversidadDemoV1';
const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');

async function crearEntorno() {
  const valores = new Map();
  const localStorage = {
    getItem: (clave) => valores.has(clave) ? valores.get(clave) : null,
    setItem: (clave, valor) => valores.set(clave, String(valor)),
    removeItem: (clave) => valores.delete(clave),
    clear: () => valores.clear()
  };
  const location = {pathname: '/login.html'};
  const contexto = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL});
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8') + '\n;globalThis.modeloPrueba = Modelo;', contexto);
  const modelo = contexto.modeloPrueba;
  const acceso = await modelo.iniciarSesionDemo('admin.demo', 'DemoAdmin123!');
  assert.equal(acceso.valido, true, acceso.mensaje);
  location.pathname = '/admin-clientes.html';
  function sembrar(cambiar) {
    const estado = JSON.parse(localStorage.getItem(claveEstado));
    cambiar(estado);
    localStorage.setItem(claveEstado, JSON.stringify(estado));
    assert.equal(modelo.sincronizar(), true);
  }
  const perfil = modelo.guardarPersona('clientes', {nombre: 'Cliente de prueba', telefono: '1234567', correo: ''});
  const cuenta = modelo.listarCuentasCliente().find((registro) => registro.usuario === 'cliente.demo');
  assert.ok(cuenta);
  return {modelo, localStorage, sembrar, perfil, cuenta};
}

test('solo una cuenta cliente puede vincularse a un perfil; desvincular libera el perfil', async () => {
  const e = await crearEntorno();
  e.sembrar((datos) => {
    datos.usuariosDemo.push({id: 'cliente-dos', usuario: 'cliente.dos', rol: 'cliente', activo: true});
    datos.usuariosDemo.push({id: 'empleado-otro', usuario: 'empleado.otro', rol: 'empleado', clienteId: e.perfil.id});
  });
  const vinculada = e.modelo.vincularCuentaCliente(e.cuenta.id, e.perfil.id);
  assert.equal(vinculada.clienteId, e.perfil.id);
  assert.equal(e.modelo.vincularCuentaCliente(e.cuenta.id, e.perfil.id).clienteId, e.perfil.id);
  const antes = e.localStorage.getItem(claveEstado);
  assert.throws(() => e.modelo.vincularCuentaCliente('cliente-dos', e.perfil.id),
    {message: 'Ese perfil ya está vinculado a otra cuenta.'});
  assert.equal(e.localStorage.getItem(claveEstado), antes);
  assert.equal(e.modelo.vincularCuentaCliente(e.cuenta.id, '').clienteId, null);
  assert.equal(e.modelo.vincularCuentaCliente('cliente-dos', e.perfil.id).clienteId, e.perfil.id);
  assert.equal(e.modelo.vincularCuentaCliente('cliente-dos', '').clienteId, null);
  assert.equal(e.modelo.vincularCuentaCliente(e.cuenta.id, e.perfil.id).clienteId, e.perfil.id);
});

test('los vínculos duplicados anteriores permanecen sin cambios, pero no se crean otros', async () => {
  const e = await crearEntorno();
  e.sembrar((datos) => {
    datos.usuariosDemo.find((cuenta) => cuenta.id === e.cuenta.id).clienteId = e.perfil.id;
    datos.usuariosDemo.push({id: 'cliente-dos', usuario: 'cliente.dos', rol: 'cliente', activo: false, clienteId: e.perfil.id});
    datos.usuariosDemo.push({id: 'cliente-tres', usuario: 'cliente.tres', rol: 'cliente', activo: true});
  });
  assert.equal(e.modelo.listarCuentasCliente().filter((cuenta) => cuenta.clienteId === e.perfil.id).length, 2);
  assert.equal(e.modelo.vincularCuentaCliente(e.cuenta.id, e.perfil.id).clienteId, e.perfil.id);
  assert.equal(e.modelo.listarCuentasCliente().filter((cuenta) => cuenta.clienteId === e.perfil.id).length, 2);
  assert.throws(() => e.modelo.vincularCuentaCliente('cliente-tres', e.perfil.id),
    {message: 'Ese perfil ya está vinculado a otra cuenta.'});
  e.modelo.vincularCuentaCliente('cliente-dos', '');
  assert.throws(() => e.modelo.vincularCuentaCliente('cliente-dos', e.perfil.id),
    {message: 'Ese perfil ya está vinculado a otra cuenta.'});
});
