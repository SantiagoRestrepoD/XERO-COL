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
const entrada = (campos = {}) => ({nombre: 'Cliente de prueba', telefono: '3001234567',
  correo: 'cliente@example.org', usuario: 'cliente.nuevo', clave: 'Prueba123!',
  confirmacion: 'Prueba123!', direccion: '', ciudad: '', cedula: '', ...campos});

function crearEntorno(datos = new Map(), opciones = {}) {
  let falloEscritura = false;
  const localStorage = {
    getItem: (clave) => datos.has(clave) ? datos.get(clave) : null,
    setItem: (clave, valor) => { if (falloEscritura) { throw new Error('Sin espacio'); } datos.set(clave, String(valor)); },
    removeItem: (clave) => datos.delete(clave), clear: () => datos.clear()
  };
  const location = {pathname: '/registro.html'};
  const contexto = vm.createContext({localStorage, location, crypto: opciones.crypto || webcrypto, TextEncoder, URL});
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8') + '\n;globalThis.modeloPrueba = Modelo;', contexto);
  return {modelo: contexto.modeloPrueba, datos, localStorage, location,
    fallarEscritura: (valor) => { falloEscritura = valor; },
    estado: () => JSON.parse(datos.get(claveEstado))};
}

test('registro crea cuenta cliente, perfil nuevo y vínculo con credencial PBKDF2', async () => {
  const e = crearEntorno();
  const cuenta = await e.modelo.registrarCliente(entrada({ciudad: 'Medellín', cedula: '123456'}));
  assert.equal(cuenta.rol, 'cliente');
  assert.ok(cuenta.id && cuenta.clienteId);
  assert.equal(Object.hasOwn(cuenta, 'clave'), false);
  assert.equal(Object.hasOwn(cuenta, 'huella'), false);
  const estado = e.estado();
  const perfil = estado.clientes.find((cliente) => cliente.id === cuenta.clienteId);
  const almacenada = estado.usuariosDemo.find((usuario) => usuario.id === cuenta.id);
  assert.equal(perfil.nombre, 'Cliente de prueba');
  assert.equal(perfil.ciudad, 'Medellín');
  assert.equal(perfil.direccion, 'No indicado');
  assert.equal(almacenada.clienteId, perfil.id);
  assert.equal(almacenada.rol, 'cliente');
  assert.equal(almacenada.sal.length, 16);
  assert.match(almacenada.huella, /^[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(almacenada, 'clave'), false);
  assert.equal(e.datos.get(claveEstado).includes('Prueba123!'), false);
  assert.equal(estado.usuariosDemo.filter((usuario) => usuario.rol === 'cliente' && usuario.clienteId === perfil.id).length, 1);
  const recargado = crearEntorno(e.datos);
  const sesion = await recargado.modelo.iniciarSesionDemo('cliente.nuevo', 'Prueba123!');
  assert.equal(sesion.valido, true, sesion.mensaje);
  assert.equal(sesion.destino, 'cliente.html');
  assert.equal(recargado.modelo.sesionActual().clienteId, perfil.id);
});

test('registro rechaza roles distintos de cliente sin crear perfil ni cuenta', async () => {
  const e = crearEntorno();
  const antes = e.datos.get(claveEstado);
  for (const rol of ['administrador', 'empleado', '', null]) {
    await assert.rejects(e.modelo.registrarCliente(entrada({rol})), /solo permite cuentas de cliente/i);
    assert.equal(e.datos.get(claveEstado), antes);
  }
});

test('usuario duplicado se rechaza sin distinción de mayúsculas y reserva cuentas demo', async () => {
  const e = crearEntorno();
  await e.modelo.registrarCliente(entrada());
  const antes = e.datos.get(claveEstado);
  await assert.rejects(e.modelo.registrarCliente(entrada({usuario: ' CLIENTE.NUEVO ', correo: 'otro@example.org'})), /Ya existe ese usuario/);
  assert.equal(e.datos.get(claveEstado), antes);
  await assert.rejects(e.modelo.registrarCliente(entrada({usuario: 'admin.demo', correo: 'otro@example.org'})), /Ya existe ese usuario/);
  assert.equal(e.datos.get(claveEstado), antes);
});

test('correo duplicado se rechaza ignorando mayúsculas y espacios', async () => {
  const e = crearEntorno();
  await e.modelo.registrarCliente(entrada());
  const antes = e.datos.get(claveEstado);
  await assert.rejects(e.modelo.registrarCliente(entrada({usuario: 'otro.cliente', correo: ' CLIENTE@EXAMPLE.ORG '})), /cuenta con ese correo/);
  assert.equal(e.datos.get(claveEstado), antes);
});

test('correo vinculado solo al perfil de empleado cuenta como correo usado', async () => {
  const e = crearEntorno();
  await e.modelo.prepararAccesoDemo();
  const estado = e.estado();
  estado.empleados.push({id:'perfil-empleado', nombre:'Empleado', correo:'empleado@example.org', activo:true});
  estado.usuariosDemo.find((cuenta) => cuenta.usuario === 'empleado.demo').empleadoId = 'perfil-empleado';
  e.datos.set(claveEstado, JSON.stringify(estado));
  const antes = e.datos.get(claveEstado);
  await assert.rejects(e.modelo.registrarCliente(entrada({correo: 'EMPLEADO@example.org'})), /cuenta con ese correo/);
  assert.equal(e.datos.get(claveEstado), antes);
});

test('teléfono y correo obligatorio respetan las reglas del perfil', async () => {
  const e = crearEntorno();
  const antes = e.datos.get(claveEstado);
  for (const valor of ['', '123456', '12345a7', '12345678901']) {
    await assert.rejects(e.modelo.registrarCliente(entrada({telefono: valor})), /teléfono/i);
    assert.equal(e.datos.get(claveEstado), antes);
  }
  for (const valor of ['', 'correo.sin.arroba', 'a'.repeat(115) + '@b.com']) {
    await assert.rejects(e.modelo.registrarCliente(entrada({correo: valor})), /correo/i);
    assert.equal(e.datos.get(claveEstado), antes);
  }
});

test('valida contraseña, confirmación y campos opcionales antes de crear', async () => {
  const e = crearEntorno();
  const antes = e.datos.get(claveEstado);
  for (const campos of [{clave:'corta',confirmacion:'corta'}, {confirmacion:'otra clave'}, {ciudad:'Medellín 1'}, {cedula:'123abc'}, {direccion:'abc'}]) {
    await assert.rejects(e.modelo.registrarCliente(entrada(campos)));
    assert.equal(e.datos.get(claveEstado), antes);
  }
});

test('el registro crea un perfil nuevo aunque haya otro con el mismo nombre', async () => {
  const e = crearEntorno();
  await e.modelo.prepararAccesoDemo();
  const estado = e.estado();
  estado.clientes.push({id:'perfil-previo', nombre:'Cliente de prueba', correo:'sin-vincular@example.org', telefono:'3001234567', activo:true});
  e.datos.set(claveEstado, JSON.stringify(estado));
  const cuenta = await e.modelo.registrarCliente(entrada());
  assert.notEqual(cuenta.clienteId, 'perfil-previo');
  assert.equal(e.estado().clientes.filter((perfil) => perfil.nombre === 'Cliente de prueba').length, 2);
});

test('el perfil registrado no puede vincularse a otra cuenta cliente', async () => {
  const e = crearEntorno();
  const cuenta = await e.modelo.registrarCliente(entrada());
  const sesion = await e.modelo.iniciarSesionDemo('admin.demo', 'DemoAdmin123!');
  assert.equal(sesion.valido, true, sesion.mensaje);
  e.location.pathname = '/admin-clientes.html';
  const demo = e.modelo.listarCuentasCliente().find((usuario) => usuario.usuario === 'cliente.demo');
  const antes = e.datos.get(claveEstado);
  assert.throws(() => e.modelo.vincularCuentaCliente(demo.id, cuenta.clienteId), /Ese perfil ya está vinculado a otra cuenta/);
  assert.equal(e.datos.get(claveEstado), antes);
});

test('error de escritura no guarda ni la cuenta ni el perfil', async () => {
  const e = crearEntorno();
  await e.modelo.prepararAccesoDemo();
  const antes = e.datos.get(claveEstado);
  const clientesAntes = e.estado().clientes.length;
  e.fallarEscritura(true);
  await assert.rejects(e.modelo.registrarCliente(entrada()), /No se pudo guardar/);
  assert.equal(e.datos.get(claveEstado), antes);
  assert.equal(e.estado().clientes.length, clientesAntes);
  assert.equal(e.estado().usuariosDemo.some((u) => u.usuario === 'cliente.nuevo'), false);
});

test('registros simultáneos vuelven a comprobar usuario y correo antes de guardar', async () => {
  const e = crearEntorno();
  await e.modelo.prepararAccesoDemo();
  const estadoAntes = e.estado();
  const resultados = await Promise.allSettled([
    e.modelo.registrarCliente(entrada()),
    e.modelo.registrarCliente(entrada({usuario:'otro.usuario'}))
  ]);
  assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(resultados.filter((r) => r.status === 'rejected').length, 1);
  assert.match(resultados.find((r) => r.status === 'rejected').reason.message, /cuenta con ese correo/);
  assert.equal(e.estado().clientes.length, estadoAntes.clientes.length + 1);
  assert.equal(e.estado().usuariosDemo.filter((u) => u.clienteId).length,
    estadoAntes.usuariosDemo.filter((u) => u.clienteId).length + 1);
});

test('las tres cuentas demo siguen funcionando tras un registro', async () => {
  const e = crearEntorno();
  await e.modelo.registrarCliente(entrada());
  for (const [usuario, clave, destino] of [
    ['cliente.demo','DemoCliente123!','cliente.html'],
    ['empleado.demo','DemoEmpleado123!','empleado.html'],
    ['admin.demo','DemoAdmin123!','admin.html']
  ]) {
    const sesion = await e.modelo.iniciarSesionDemo(usuario, clave);
    assert.equal(sesion.valido, true, sesion.mensaje);
    assert.equal(sesion.destino, destino);
  }
});
