'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');
const leer = (nombre) => fs.readFileSync(path.join(raiz, nombre), 'utf8');

test('Inicio conserva la tienda pública y no contiene controles administrativos', () => {
  const html = leer('index.html');
  for (const id of ['formProducto', 'registrosInicio', 'administracionInicio', 'gestionInicio', 'restablecerDemo']) {
    assert.doesNotMatch(html, new RegExp('\\bid=["\x27]' + id + '["\x27]', 'i'), id);
  }
  for (const id of ['home', 'catalogo', 'buscar', 'tarjetasInicio', 'garantias', 'categorias', 'indicadores', 'formContacto']) {
    assert.match(html, new RegExp('\\bid=["\x27]' + id + '["\x27]', 'i'), id);
  }
  assert.match(html, /href=["']login\.html["']/i);
  assert.match(leer('admin.html'), /<button\b[^>]*\bid=["']restablecerDemo["']/i);
});

// Ejecuta el controlador, la vista de tarjetas y el servicio USD reales con datos aislados.
function prepararInicio(rol) {
  class Elemento {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.value = '';
      this.className = ''; this.attrs = {}; this.listeners = {}; this._texto = '';
      this.classList = {toggle: () => {}, add: () => {}, remove: () => {}};
    }
    set textContent(valor) { this._texto = String(valor); this.children = []; }
    get textContent() { return this._texto + this.children.map((hijo) => hijo.textContent).join(''); }
    appendChild(hijo) { hijo.padre = this; this.children.push(hijo); return hijo; }
    replaceChildren(...hijos) { this._texto = ''; this.children = []; hijos.forEach((hijo) => this.appendChild(hijo)); }
    setAttribute(nombre, valor) { this.attrs[nombre] = String(valor); }
    querySelector(selector) {
      const clase = selector.startsWith('.') ? selector.slice(1) : null;
      const recorrer = (nodo) => {
        for (const hijo of nodo.children) {
          if (clase && hijo.className.split(/\s+/).includes(clase)) { return hijo; }
          const encontrado = recorrer(hijo); if (encontrado) { return encontrado; }
        }
        return null;
      };
      return recorrer(this);
    }
    insertAdjacentElement(posicion, nodo) {
      assert.equal(posicion, 'afterend');
      const hermanos = this.padre.children; nodo.padre = this.padre;
      hermanos.splice(hermanos.indexOf(this) + 1, 0, nodo);
    }
    reportValidity() { return true; }
    reset() {}
  }
  const nombres = ['estadoTasaInicio', 'filtros', 'buscar', 'tarjetasInicio', 'contadorResultados', 'sinResultados', 'formContacto'];
  const nodos = Object.fromEntries(nombres.map((nombre) => [nombre, new Elemento()]));
  const enlaces = ['index.html', 'catalogo.html', ...(rol === 'administrador' ? ['admin.html'] : ['login.html'])];
  const menu = {
    querySelector: (selector) => {
      assert.equal(selector, 'a[href="admin.html"]');
      return enlaces.includes('admin.html') ? {remove: () => enlaces.splice(enlaces.indexOf('admin.html'), 1)} : null;
    }
  };
  let observarCambios;
  let desconectado = false;
  class MutationObserver {
    constructor(accion) { observarCambios = accion; }
    observe(objetivo, opciones) { assert.equal(objetivo, menu); assert.equal(opciones.childList, true); }
    disconnect() { desconectado = true; }
  }
  const eventosDocumento = {};
  const document = {
    getElementById: (id) => nodos[id] ?? null,
    createElement: (tag) => new Elemento(tag),
    querySelector: (selector) => { assert.equal(selector, '.menu-global'); return menu; },
    addEventListener: (evento, accion) => { eventosDocumento[evento] = accion; },
    querySelectorAll: (selector) => {
      if (selector === '#tarjetasInicio .tarjeta') { return nodos.tarjetasInicio.children; }
      if (selector === '#filtros [data-categoria]') { return nodos.filtros.children; }
      throw new Error('Selector inesperado: ' + selector);
    }
  };
  const productos = [
    {id: 'a', nombre: 'Reloj Alba', categoria: 'Clásicos', precio: '100000', cantidad: 2, imagen: 'img/watch-1.webp', activo: true},
    {id: 'b', nombre: 'Reloj Brisa', categoria: 'Deportivos', precio: '200000', cantidad: 3, imagen: 'img/watch-2.webp', activo: true},
    {id: 'c', nombre: 'Reloj Oculto', categoria: 'Clásicos', precio: '300000', cantidad: 1, imagen: 'img/watch-3.webp', activo: false}
  ];
  const Modelo = {
    categorias: ['Clásicos', 'Deportivos'], imagenes: ['img/watch-1.webp'],
    listar: (tipo) => { assert.equal(tipo, 'productos'); return productos; },
    normalizar: (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
    sesionActual: () => rol ? {rol} : null, resumen: () => ({referencias: 2})
  };
  const contexto = vm.createContext({document, Modelo, Node: Elemento, Intl, MutationObserver,
    ImagenProducto: {liberarContenedor() {}, asignar() {}}, obtenerTasaUSD: async () => 0.00025,
    puedeIniciarPagina: () => true,
    escuchar: (nodo, evento, accion) => { nodo.listeners ??= {}; nodo.listeners[evento] = accion; },
    mensaje: () => {}});
  vm.runInContext(leer('js/vista/vista.js') + '\n;globalThis.vista = Vista;', contexto);
  // Estos componentes no participan en la prueba de tarjetas y búsqueda.
  contexto.vista.dibujarResumen = () => {};
  contexto.vista.dibujarIndicadores = () => {};
  vm.runInContext(leer('js/servicios/precios-usd.js') + '\n;globalThis.precios = PreciosUSD;', contexto);
  const controlador = leer('js/controlador/controlador.js');
  const inicio = controlador.indexOf('  function iniciarInicio()');
  const fin = controlador.indexOf('  function iniciarRegistro()', inicio);
  assert.ok(inicio >= 0 && fin > inicio, 'No se encontró la inicialización del inicio.');
  vm.runInContext(controlador.slice(inicio, fin) + '\n;globalThis.iniciar = iniciarInicio;', contexto);
  contexto.iniciar();
  const descendientes = (nodo) => nodo.children.flatMap((hijo) => [hijo, ...descendientes(hijo)]);
  return {nodos, descendientes, enlaces, observarCambios, eventosDocumento, estaDesconectado: () => desconectado};
}

for (const rol of [null, 'administrador']) {
  test('el catálogo es público y no ofrece CRUD para ' + (rol ?? 'visitante'), async () => {
    const {nodos, descendientes, enlaces, observarCambios, eventosDocumento, estaDesconectado} = prepararInicio(rol);
    await new Promise((resolver) => setImmediate(resolver));
    assert.equal(nodos.tarjetasInicio.children.length, 2);
    assert.match(nodos.tarjetasInicio.textContent, /Reloj Alba/);
    assert.doesNotMatch(nodos.tarjetasInicio.textContent, /Reloj Oculto/);
    assert.match(nodos.tarjetasInicio.textContent, /Aprox\..*USD/);
    assert.equal(descendientes(nodos.tarjetasInicio).some((nodo) => nodo.tagName === 'BUTTON'), false);
    assert.equal(enlaces.includes('admin.html'), false);
    assert.ok(enlaces.includes('catalogo.html'));
    // Si la navegación compartida se reconstruye, el enlace se vuelve a retirar.
    enlaces.push('admin.html'); observarCambios();
    assert.equal(enlaces.includes('admin.html'), false);
    eventosDocumento.accesoRevocado();
    assert.equal(estaDesconectado(), true);
    nodos.buscar.value = 'brisa'; nodos.buscar.listeners.input();
    assert.equal(nodos.tarjetasInicio.children.length, 1);
    assert.match(nodos.tarjetasInicio.textContent, /Reloj Brisa/);
    nodos.buscar.value = '';
    nodos.filtros.listeners.click({target: {closest: () => ({dataset: {categoria: 'Clásicos'}})}});
    assert.equal(nodos.tarjetasInicio.children.length, 1);
    assert.match(nodos.tarjetasInicio.textContent, /Reloj Alba/);
    assert.doesNotMatch(nodos.tarjetasInicio.textContent, /Reloj Oculto/);
  });
}

test('el menú compartido conserva acceso administrativo en el catálogo', () => {
  class Elemento {
    constructor() { this.children = []; this.dataset = {}; this.attrs = {}; this.classList = {add() {}}; }
    setAttribute(nombre, valor) { this.attrs[nombre] = valor; }
    replaceChildren(...elementos) { this.children = elementos; }
  }
  const cabecera = new Elemento();
  const elementos = Object.fromEntries(['perfilDemo', 'salirDemo', 'menuLateral'].map((id) => [id, new Elemento()]));
  const document = {querySelector: () => cabecera, getElementById: (id) => elementos[id] ?? null, createElement: () => new Elemento()};
  const contexto = vm.createContext({document});
  vm.runInContext(leer('js/vista/vista.js') + '\n;globalThis.vista = Vista;', contexto);
  contexto.vista.dibujarNavegacion({rol: 'administrador', nombre: 'Administrador'}, 'catalogo', 'admin.html');
  assert.ok(cabecera.children.some((enlace) => enlace.href === 'admin.html'));
});
