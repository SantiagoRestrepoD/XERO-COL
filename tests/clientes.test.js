'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

const raiz = path.resolve(__dirname, '..');
const fuenteModelo = fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8');
const fuenteVista = fs.readFileSync(path.join(raiz, 'js/vista/vista.js'), 'utf8');
const claveEstado = 'xeroUniversidadDemoV1';

// Cada prueba usa un almacenamiento aislado; recargar crea otra instancia del modelo.
function crearAlmacen() {
  const registros = new Map();
  return {
    getItem: (clave) => registros.has(clave) ? registros.get(clave) : null,
    setItem: (clave, valor) => registros.set(clave, String(valor)),
    removeItem: (clave) => registros.delete(clave)
  };
}
function crearModelo(localStorage, ruta = '/index.html') {
  const location = {pathname: ruta};
  const entorno = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL,
    ServicioImagenes: {borrarTodas: async () => {}}});
  vm.runInContext(fuenteModelo + '\n;globalThis.modeloPrueba = Modelo;', entorno);
  return {modelo: entorno.modeloPrueba, location};
}
async function iniciarAdmin(entorno, pagina = '/admin-clientes.html') {
  entorno.location.pathname = '/login.html';
  const resultado = await entorno.modelo.iniciarSesionDemo('admin.demo', 'DemoAdmin123!');
  assert.equal(resultado.valido, true, resultado.mensaje);
  entorno.location.pathname = pagina;
}
function entrada(cambios = {}) {
  return {nombre: 'Cliente de prueba', telefono: '1234567', direccion: '', ciudad: '', cedula: '', correo: '', ...cambios};
}
function validar(cambios) {
  return crearModelo(crearAlmacen()).modelo.validarCliente(entrada(cambios));
}
function fallo(campo, valor) {
  const resultado = validar({[campo]: valor});
  assert.equal(resultado.valido, false, `Se aceptó ${campo}: ${valor}`);
  assert.ok(resultado.errores[campo], `Falta mensaje para ${campo}: ${valor}`);
  return resultado.errores[campo];
}

// Se ejercitan las reglas reales del modelo, incluidos los extremos de cada rango.
test('teléfono obligatorio y solo dígitos entre 7 y 10', () => {
  assert.equal(fallo('telefono', ''), 'El teléfono es obligatorio.');
  for (const valor of ['123456', '12345678901', '12345a7', '123 4567', '+1234567']) { fallo('telefono', valor); }
  for (const valor of ['1234567', '1234567890']) { assert.equal(validar({telefono: valor}).valido, true); }
});

test('cédula opcional admite solo 6 a 10 dígitos', () => {
  for (const valor of ['123456', '1234567890']) { assert.equal(validar({cedula: valor}).valido, true); }
  for (const valor of ['12345', '12345678901', '12345a']) { fallo('cedula', valor); }
});

test('ciudad admite letras acentuadas y espacios, pero no números', () => {
  for (const valor of ['Medellín', 'San José', 'Ñuñoa']) { assert.equal(validar({ciudad: valor}).valido, true); }
  for (const valor of ['A', 'Medellín 2', 'Ciudad-otra', 'A'.repeat(61)]) { fallo('ciudad', valor); }
});

test('correo opcional comprueba formato y máximo 120 caracteres', () => {
  assert.equal(validar({correo: 'persona@example.com'}).valido, true);
  fallo('correo', 'correo.sin.arroba');
  fallo('correo', 'x'.repeat(115) + '@a.com');
});

test('dirección opcional respeta los límites y campos vacíos usan No indicado', () => {
  for (const valor of ['1234', 'x'.repeat(121)]) { fallo('direccion', valor); }
  for (const valor of ['12345', 'x'.repeat(120)]) { assert.equal(validar({direccion: valor}).valido, true); }
  const resultado = validar({});
  assert.equal(resultado.valido, true);
  for (const campo of ['direccion', 'ciudad', 'cedula', 'correo']) {
    assert.equal(resultado.datos[campo], 'No indicado', campo);
  }
});

test('guardar un cliente conserva sus campos al recargar el modelo', async () => {
  const almacen = crearAlmacen();
  const primer = crearModelo(almacen);
  await iniciarAdmin(primer);
  const datos = entrada({nombre: 'Prueba persistente', telefono: '0123456789', direccion: 'Calle de prueba 12', ciudad: 'Medellín', cedula: '00123456', correo: 'persona@example.com'});
  const creado = primer.modelo.guardarPersona('clientes', datos);
  const guardado = JSON.parse(almacen.getItem(claveEstado));
  assert.ok(guardado.clientes.some((cliente) => cliente.id === creado.id));
  const recargado = crearModelo(almacen, '/admin-clientes.html');
  const encontrado = recargado.modelo.listar('clientes').find((cliente) => cliente.id === creado.id);
  assert.ok(encontrado);
  for (const campo of ['nombre', 'telefono', 'direccion', 'ciudad', 'cedula', 'correo']) { assert.equal(encontrado[campo], datos[campo], campo); }
});

test('los opcionales vacíos se guardan y se pueden editar sin perder el marcador', async () => {
  const almacen = crearAlmacen();
  const entorno = crearModelo(almacen);
  await iniciarAdmin(entorno);
  const creado = entorno.modelo.guardarPersona('clientes', entrada({nombre: 'Cliente sin opcionales'}));
  for (const campo of ['direccion', 'ciudad', 'cedula', 'correo']) { assert.equal(creado[campo], 'No indicado', campo); }
  const editado = entorno.modelo.guardarPersona('clientes', {...creado, nombre: 'Cliente editado'}, creado.id);
  const recargado = crearModelo(almacen, '/admin-clientes.html');
  const perfil = recargado.modelo.listar('clientes').find((item) => item.id === editado.id);
  for (const campo of ['direccion', 'ciudad', 'cedula', 'correo']) { assert.equal(perfil[campo], 'No indicado', campo); }
});

test('guardarPersona rechaza datos inválidos sin guardar cambios', async () => {
  const almacen = crearAlmacen();
  const entorno = crearModelo(almacen);
  await iniciarAdmin(entorno);
  const estadoAntes = almacen.getItem(claveEstado);
  for (const datos of [{telefono: ''}, {telefono: '12a4567'}, {cedula: '12345a'}, {ciudad: 'Medellín 2'}, {correo: 'correo.sin.arroba'}]) {
    assert.throws(() => entorno.modelo.guardarPersona('clientes', entrada(datos)));
    assert.equal(almacen.getItem(claveEstado), estadoAntes);
  }
});

// La vista real se ejecuta con nodos simples; no usa el navegador ni datos del usuario.
function datosMostrados(perfil) {
  class Nodo {
    constructor() { this.textContent = ''; this.hijos = []; this.dataset = {}; this.classList = {toggle() {}}; }
    appendChild(nodo) { this.hijos.push(nodo); return nodo; }
    replaceChildren(...hijos) { this.hijos = hijos; }
  }
  const elementos = Object.fromEntries(['bienvenidaCliente', 'avisoCliente', 'cuentaCliente', 'comprasCliente', 'destacadosCliente'].map((id) => [id, new Nodo()]));
  const document = {createElement: () => new Nodo(), getElementById: (id) => elementos[id]};
  const entorno = vm.createContext({document, Node: Nodo, Intl, ImagenProducto: {liberarContenedor() {}}});
  vm.runInContext(fuenteVista + '\n;globalThis.vistaPrueba = Vista;', entorno);
  entorno.vistaPrueba.dibujarCliente({nombre: 'Cuenta prueba'}, perfil, [], [], []);
  const nodos = elementos.cuentaCliente.hijos;
  const datos = {};
  for (let i = 0; i < nodos.length; i += 2) { datos[nodos[i].textContent] = nodos[i + 1].textContent; }
  return datos;
}

test('un cliente anterior sin campos nuevos carga y muestra No indicado', async () => {
  const almacen = crearAlmacen();
  const primer = crearModelo(almacen);
  await iniciarAdmin(primer);
  const estado = JSON.parse(almacen.getItem(claveEstado));
  estado.clientes.push({id: 'cliente-anterior', nombre: 'Cliente anterior', activo: true});
  almacen.setItem(claveEstado, JSON.stringify(estado));
  assert.equal(primer.modelo.sincronizar(), true);
  const cuenta = primer.modelo.listarCuentasCliente().find((item) => item.usuario === 'cliente.demo');
  primer.modelo.vincularCuentaCliente(cuenta.id, 'cliente-anterior');
  primer.location.pathname = '/login.html';
  const sesion = await primer.modelo.iniciarSesionDemo('cliente.demo', 'DemoCliente123!');
  assert.equal(sesion.valido, true, sesion.mensaje);
  const recargado = crearModelo(almacen, '/cliente.html');
  assert.equal(recargado.modelo.sesionActual().clienteId, 'cliente-anterior');
  const perfil = recargado.modelo.listar('clientes').find((cliente) => cliente.id === 'cliente-anterior');
  assert.ok(perfil);
  const mostrados = datosMostrados(perfil);
  for (const titulo of ['Correo', 'Teléfono', 'Dirección', 'Ciudad', 'Cédula']) { assert.equal(mostrados[titulo], 'No indicado', titulo); }
});

test('la validación de empleados conserva el teléfono opcional y aplica las reglas comunes', async () => {
  const entorno = crearModelo(crearAlmacen());
  await iniciarAdmin(entorno, '/admin-empleados.html');
  const empleado = entorno.modelo.guardarPersona('empleados', {nombre: 'Empleado de prueba', correo: '', telefono: ''});
  assert.equal(empleado.telefono, '');
  const correoLargo = 'a'.repeat(115) + '@ejemplo.com';
  assert.throws(() => entorno.modelo.guardarPersona('empleados', {nombre: 'Otro empleado', correo: correoLargo, telefono: '1234567'}));
  assert.throws(() => entorno.modelo.guardarPersona('empleados', {nombre: 'Otro empleado', correo: 'empleado@ejemplo.com', telefono: '+57-1234567'}));
  const otro = entorno.modelo.guardarPersona('empleados', {nombre: 'Otro empleado', correo: 'empleado@ejemplo.com', telefono: '1234567'});
  assert.equal(otro.telefono, '1234567');
});

test('los datos del cliente no incluyen credenciales ni claves en texto plano', async () => {
  const almacen = crearAlmacen();
  const entorno = crearModelo(almacen);
  await iniciarAdmin(entorno);
  const cliente = entorno.modelo.guardarPersona('clientes', entrada({nombre: 'Cliente sin credenciales'}));
  for (const campo of ['clave', 'contrasena', 'huella', 'sal']) { assert.equal(Object.hasOwn(cliente, campo), false); }
  assert.doesNotMatch(almacen.getItem(claveEstado), /DemoAdmin123!/);
});
