'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {TextEncoder} = require('node:util');

// Ejecuta el controlador real con nodos mínimos y datos aislados.
function preparar(tipo = 'ventas') {
  const codigo = fs.readFileSync(path.join(__dirname, '../js/controlador/controlador.js'), 'utf8');
  const documentos = codigo.slice(codigo.indexOf('  function iniciarDocumentos('), codigo.indexOf('  let paginaAutorizada'));
  const almacen = new Map();
  const localStorage = {getItem:(k)=>almacen.get(k)??null,setItem:(k,v)=>almacen.set(k,String(v))};
  const entornoModelo = vm.createContext({localStorage, crypto:webcrypto, TextEncoder, URL, location:{pathname:'/admin-ventas.html'}});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/modelo/modelo.js'),'utf8') + '\nthis.modelo = Modelo;', entornoModelo);
  const ventas = [
    {id:'uno', contacto:'Ángela Pérez', clienteId:'cliente1', estado:'confirmado', fecha:'2026-02-15T15:00:00.000Z', detalles:[{id:'linea1', nombre:'Reloj Horizonte', cantidad:1, centavos:120000}]},
    {id:'dos', contacto:'Carlos Franco', clienteId:'cliente2', estado:'borrador', fecha:'2026-03-21T15:00:00.000Z', detalles:[{id:'linea2', nombre:'Reloj Pulso', cantidad:1, centavos:300000}]}
  ];
  const nodos = new Map();
  function nodo(id) {
    if (!nodos.has(id)) {
      const campo = {id, value:'', hidden:false, disabled:false, listeners:{}, attrs:{},
        setAttribute(k,v) {this.attrs[k]=v;}, focus(){}, reset(){}, appendChild(){},
        elements:{namedItem() {return {value:'',focus(){}};}},
        querySelector() {return this.campoInterno ??= {disabled:false};}};
      nodos.set(id, campo);
    }
    return nodos.get(id);
  }
  nodo('estadoDocumentos').value = 'todos';
  const tablas = {};
  const modelo = {
    normalizar:(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),
    filtrarVentas:entornoModelo.modelo.filtrarVentas,
    listar:(t)=>t==='clientes'?[{id:'cliente1',activo:true},{id:'cliente2',activo:true}]:t==='productos'?[]:ventas,
    documento:(_tipo,id)=>ventas.find((venta)=>venta.id===id), total:()=>0
  };
  const contexto = vm.createContext({Modelo:modelo, document:{getElementById:nodo}, Option:class{},
    puedeIniciarPagina:()=>true, escuchar:(el,evento,fn)=>{el.listeners[evento]=fn;},
    tabla:(id,lista)=>{tablas[id]=Array.from(lista);}, opciones:()=>{}, moneda:(v)=>String(v)});
  vm.runInContext(documentos + '\nthis.iniciarDocumentos = iniciarDocumentos;', contexto);
  contexto.iniciarDocumentos(tipo);
  return {nodo, tablas, ventas};
}

test('la búsqueda de ventas responde al cliente, producto y fecha sin recargar', () => {
  const e = preparar(); const buscar=e.nodo('buscarDocumentos');
  for (const consulta of ['angela', 'horizonte', '2026-02-15', new Date(e.ventas[0].fecha).toLocaleDateString('es-CO')]) {
    buscar.value=consulta; buscar.listeners.input();
    assert.deepEqual(e.tablas.tablaDocumentos.map((venta)=>venta.id), ['uno'], consulta);
  }
  buscar.value='pulso'; buscar.listeners.input();
  assert.deepEqual(e.tablas.tablaDocumentos.map((venta)=>venta.id), ['dos']);
  e.nodo('estadoDocumentos').value='confirmado'; e.nodo('estadoDocumentos').listeners.change();
  assert.equal(e.tablas.tablaDocumentos.length, 0);
  buscar.value=''; buscar.listeners.input();
  assert.deepEqual(e.tablas.tablaDocumentos.map((venta)=>venta.id), ['uno']);
});

test('una venta confirmada oculta el formulario de líneas y confirmar; un borrador los muestra', () => {
  const e = preparar();
  const abrir=(id)=>e.nodo('tablaDocumentos').listeners.click({target:{closest:()=>({dataset:{id}})}});
  abrir('uno');
  assert.equal(e.nodo('formDetalle').hidden, true);
  assert.equal(e.nodo('confirmarDocumento').hidden, true);
  assert.equal(e.nodo('anularDocumento').disabled, false);
  assert.equal(e.nodo('editorDocumento').hidden, false);
  assert.equal(e.nodo('listaVentas').hidden, true);
  abrir('dos');
  assert.equal(e.nodo('formDetalle').hidden, false);
  assert.equal(e.nodo('confirmarDocumento').hidden, false);
  assert.equal(e.nodo('confirmarDocumento').disabled, false);
});

test('las opciones alternan el editor y la tabla, y compras conserva su comportamiento', () => {
  const e = preparar();
  e.nodo('verVentasPasadas').listeners.click();
  assert.equal(e.nodo('listaVentas').hidden,false);
  assert.equal(e.nodo('editorDocumento').hidden,true);
  assert.equal(e.nodo('verVentasPasadas').attrs['aria-pressed'],'true');
  e.nodo('registrarVenta').listeners.click();
  assert.equal(e.nodo('listaVentas').hidden,true);
  assert.equal(e.nodo('editorDocumento').hidden,false);
  const compra = preparar('compras');
  compra.nodo('tablaDocumentos').listeners.click({target:{closest:()=>({dataset:{id:'uno'}})}});
  assert.equal(compra.nodo('formDetalle').hidden,false);
  assert.equal(compra.nodo('confirmarDocumento').hidden,false);
});

test('el evento de selección consulta y muestra únicamente el cliente elegido', () => {
  const codigo = fs.readFileSync(path.join(__dirname, '../js/controlador/controlador.js'), 'utf8');
  const fragmento = codigo.slice(codigo.indexOf('  function iniciarHistorialVentaEmpleado('), codigo.indexOf('  // Editor visual compartido'));
  const selector = {value:'', listeners:{}};
  const contenedor = {hidden:true}; const consultas=[]; let dibujado=null; let cambios=0;
  const contexto=vm.createContext({document:{getElementById:()=>contenedor},
    escuchar:(el,event,fn)=>{el.listeners[event]=fn;},
    Vista:{dibujarHistorialClienteVenta:(lista)=>{dibujado=Array.from(lista);}, mensaje:()=>{}},
    Modelo:{relojesCompradosPorCliente:(id)=>{consultas.push(id);return [{nombre:id}];}}});
  vm.runInContext(fragmento+'\nthis.iniciar = iniciarHistorialVentaEmpleado;',contexto);
  const refrescar=contexto.iniciar(selector,()=>{cambios++;});
  refrescar(); assert.equal(contenedor.hidden,true); assert.deepEqual(dibujado,[]);
  selector.value='clienteA';selector.listeners.change();
  assert.equal(contenedor.hidden,false);assert.deepEqual(dibujado,[{nombre:'clienteA'}]);
  selector.value='clienteB';selector.listeners.change();
  assert.deepEqual(dibujado,[{nombre:'clienteB'}]); assert.deepEqual(consultas,['clienteA','clienteB']);
  selector.value='';selector.listeners.change();
  assert.equal(contenedor.hidden,true);assert.deepEqual(dibujado,[]);assert.equal(cambios,3);
});
