'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { TextEncoder } = require('node:util');

// Cada entorno usa una copia aislada en memoria, nunca los datos del navegador.
const raiz = process.env.XERO_TEST_ROOT || path.resolve(__dirname, '..');
const clave = 'xeroUniversidadDemoV1';
const leer = (archivo) => fs.readFileSync(path.join(raiz, archivo), 'utf8');
function crearEntorno() {
  const datos = new Map();
  const localStorage = {getItem: (k) => datos.has(k) ? datos.get(k) : null,
    setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k), clear: () => datos.clear()};
  const location = {pathname: '/index.html'};
  const contexto = vm.createContext({localStorage, location, crypto: webcrypto, TextEncoder, URL,
    ServicioImagenes: {borrarTodas: async () => {}}});
  vm.runInContext(leer('js/modelo/modelo.js') + '\n;globalThis.modeloPrueba = Modelo;', contexto);
  const modelo = contexto.modeloPrueba;
  async function entrar(rol, pagina) {
    const cuentas = {administrador: ['admin.demo', 'DemoAdmin123!', 'admin.html'], empleado: ['empleado.demo', 'DemoEmpleado123!', 'empleado.html'], cliente: ['cliente.demo', 'DemoCliente123!', 'cliente.html']};
    const [usuario, claveAcceso, destino] = cuentas[rol];
    location.pathname = '/login.html';
    const resultado = await modelo.iniciarSesionDemo(usuario, claveAcceso);
    assert.equal(resultado.valido, true, resultado.mensaje);
    assert.equal(resultado.destino, destino);
    location.pathname = '/' + (pagina || destino);
  }
  function sembrar(fn) {
    const estado = JSON.parse(localStorage.getItem(clave));
    fn(estado);
    localStorage.setItem(clave, JSON.stringify(estado));
    assert.equal(modelo.sincronizar(), true);
  }
  return {modelo, location, localStorage, entrar, sembrar};
}
const perfil = {id:'perfil-uno', nombre:'Cliente Uno', correo:'uno@example.org', telefono:'1234567', direccion:'Calle 12', ciudad:'Medellín', cedula:'123456', activo:true};
const otroPerfil = {...perfil, id:'perfil-dos', nombre:'Cliente Dos'};
const persona = {nombre:'Cliente nuevo', correo:'nuevo@example.org', telefono:'1234567', direccion:'', ciudad:'', cedula:''};
const documento = (id, extra = {}) => ({id, contacto:'Cliente Uno', observaciones:'', estado:'borrador', fecha:'2026-01-01T00:00:00.000Z', detalles:[], ...extra});
async function preparar(rol) {
  const e = crearEntorno();
  await e.entrar('administrador', 'admin-clientes.html');
  e.sembrar((datos) => {
    datos.clientes.push({...perfil}, {...otroPerfil});
    datos.empleados.push({id:'perfil-empleado', nombre:'Empleado Prueba', correo:'empleado@example.org', telefono:'1234567', direccion:'', activo:true});
    const cliente = datos.usuariosDemo.find((u) => u.usuario === 'cliente.demo');
    const empleado = datos.usuariosDemo.find((u) => u.usuario === 'empleado.demo');
    cliente.clienteId = perfil.id;
    datos.ventas.push(documento('propia', {clienteId:perfil.id, empleadoId:empleado.id}),
      documento('ajena', {clienteId:otroPerfil.id, empleadoId:'otro-empleado'}),
      documento('antigua'), documento('confirmada', {clienteId:perfil.id, empleadoId:empleado.id, estado:'confirmado'}));
    datos.compras.push(documento('compra', {contacto:'Proveedor'}));
  });
  await e.entrar(rol);
  return e;
}
function ruta(e, rol, paginaAdmin) {
  e.location.pathname = '/' + (rol === 'administrador' ? paginaAdmin : rol === 'empleado' ? 'empleado.html' : 'cliente.html');
}
function rechazaSinCambios(e, operacion) {
  const antes = e.localStorage.getItem(clave);
  assert.throws(operacion);
  assert.equal(e.localStorage.getItem(clave), antes);
}
const escenarios = [
  {nombre:'catálogo y ficha', ejecutar(e) { const lista = e.modelo.listar('productos'); assert.ok(lista.length); assert.ok(e.modelo.producto(lista[0].id)); }},
  {nombre:'precio USD', ejecutar() { assert.match(leer('js/paginas/catalogo.js'), /obtenerTasaUSD|Servicio.*USD|precio.*USD/i); }},
  {nombre:'datos personales', ejecutar(e, rol) { ruta(e,rol,'admin-clientes.html'); if (rol === 'empleado') { const p=e.modelo.listar('clientes')[0]; for (const campo of ['telefono','direccion','ciudad','cedula']) assert.equal(Object.hasOwn(p,campo),false); } else { const clientes=e.modelo.listar('clientes'); assert.ok(clientes.some((p)=>p.id===perfil.id)); if(rol==='cliente') assert.deepEqual(Array.from(clientes,p=>p.id),[perfil.id]); } }},
  {nombre:'compras del perfil', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); const ventas=e.modelo.listar('ventas'); if(rol==='administrador') { assert.ok(ventas.some(v=>v.id==='ajena')); assert.ok(e.modelo.listar('compras').some(c=>c.id==='compra')); } if(rol==='cliente') { assert.deepEqual(Array.from(ventas,v=>v.id).sort(),['confirmada','propia']); assert.equal(e.modelo.documento('ventas','ajena'),null); rechazaSinCambios(e,()=>e.modelo.listar('compras')); } if(rol==='empleado') { assert.ok(ventas.every(v=>v.empleadoId===e.modelo.sesionActual().id)); rechazaSinCambios(e,()=>e.modelo.listar('compras')); } }},
  {nombre:'consultar inventario', ejecutar(e,rol) { ruta(e,rol,'admin-inventario.html'); if(rol==='cliente') { rechazaSinCambios(e,()=>e.modelo.consultarInventario()); assert.equal(Object.hasOwn(e.modelo.producto('demo-01'),'cantidad'),false); assert.equal(typeof e.modelo.producto('demo-01').disponible,'boolean'); assert.equal(Object.hasOwn(e.modelo.resumen(),'unidades'),false); } else assert.ok(e.modelo.consultarInventario().some(p=>typeof p.cantidad==='number')); }},
  {nombre:'crear editar y eliminar productos', ejecutar(e,rol) { ruta(e,rol,'admin-productos.html'); const entrada={nombre:'Reloj de prueba',categoria:'Clásicos',precio:'10.00',cantidad:0,imagen:'img/watch-1.webp'}; if(rol!=='administrador') { rechazaSinCambios(e,()=>e.modelo.guardarProducto(entrada)); rechazaSinCambios(e,()=>e.modelo.eliminarProducto('demo-02')); } else { const p=e.modelo.guardarProducto(entrada); e.modelo.guardarProducto({...entrada,nombre:'Reloj editado'},p.id); assert.equal(e.modelo.producto(p.id).nombre,'Reloj editado'); e.modelo.eliminarProducto(p.id); assert.equal(e.modelo.producto(p.id),null); } }},
  {nombre:'ajustar inventario', ejecutar(e,rol) { ruta(e,rol,'admin-inventario.html'); if(rol!=='administrador') rechazaSinCambios(e,()=>e.modelo.ajustar('demo-01',1,'Prueba ajuste')); else { const antes=e.modelo.producto('demo-01').cantidad; e.modelo.ajustar('demo-01',1,'Prueba ajuste'); assert.equal(e.modelo.producto('demo-01').cantidad,antes+1); } }},
  {nombre:'crear venta y añadir producto', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); const entrada={contacto:perfil.nombre,clienteId:perfil.id,observaciones:''}; if(rol==='cliente') { rechazaSinCambios(e,()=>e.modelo.guardarDocumento('ventas',entrada)); rechazaSinCambios(e,()=>e.modelo.guardarDetalle('ventas','propia',{productoId:'demo-01',cantidad:1,precio:'189900.00'})); } else { const venta=e.modelo.guardarDocumento('ventas',entrada); if(rol==='empleado') assert.equal(venta.empleadoId,e.modelo.sesionActual().id); e.modelo.guardarDetalle('ventas',venta.id,{productoId:'demo-01',cantidad:1,precio:'189900.00'}); assert.equal(e.modelo.documento('ventas',venta.id).detalles.length,1); } }},
  {nombre:'confirmar venta propia', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); if(rol==='cliente') rechazaSinCambios(e,()=>e.modelo.transicion('ventas','propia','confirmar')); else { const v=e.modelo.guardarDocumento('ventas',{contacto:perfil.nombre,clienteId:perfil.id}); e.modelo.guardarDetalle('ventas',v.id,{productoId:'demo-01',cantidad:1,precio:'189900.00'}); e.modelo.transicion('ventas',v.id,'confirmar'); assert.equal(e.modelo.documento('ventas',v.id).estado,'confirmado'); } }},
  {nombre:'anular venta', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); if(rol!=='administrador') rechazaSinCambios(e,()=>e.modelo.transicion('ventas','propia','anular','Prueba')); else { e.modelo.transicion('ventas','propia','anular','Prueba'); assert.equal(e.modelo.documento('ventas','propia').estado,'anulado'); } }},
  {nombre:'editar venta confirmada', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); rechazaSinCambios(e,()=>e.modelo.guardarDocumento('ventas',{contacto:'Otro nombre'},'confirmada')); rechazaSinCambios(e,()=>e.modelo.guardarDetalle('ventas','confirmada',{productoId:'demo-01',cantidad:1,precio:'1'})); }},
  {nombre:'ventas de otros', ejecutar(e,rol) { ruta(e,rol,'admin-ventas.html'); const ventas=e.modelo.listar('ventas'); if(rol==='administrador') assert.ok(ventas.some(v=>v.id==='ajena') && ventas.some(v=>v.id==='antigua')); else assert.ok(!ventas.some(v=>v.id==='ajena' || v.id==='antigua')); if(rol==='empleado') { const antes=e.localStorage.getItem(clave); assert.throws(()=>e.modelo.guardarDetalle('ventas','ajena',{productoId:'demo-01',cantidad:1,precio:'1'}),/Solo puedes modificar las ventas que creaste\./); assert.throws(()=>e.modelo.transicion('ventas','ajena','confirmar'),/Solo puedes modificar las ventas que creaste\./); assert.equal(e.localStorage.getItem(clave),antes); } }},
  {nombre:'lista de clientes', ejecutar(e,rol) { ruta(e,rol,'admin-clientes.html'); const clientes=e.modelo.listar('clientes'); if(rol==='cliente') assert.deepEqual(Array.from(clientes,p=>p.id),[perfil.id]); else assert.ok(clientes.some(p=>p.id===otroPerfil.id)); if(rol==='empleado') for(const p of clientes) assert.deepEqual(Object.keys(p).sort(),['activo','correo','id','nombre']); }},
  {nombre:'crear editar y desactivar clientes', ejecutar(e,rol) { ruta(e,rol,'admin-clientes.html'); if(rol!=='administrador') { rechazaSinCambios(e,()=>e.modelo.guardarPersona('clientes',persona)); rechazaSinCambios(e,()=>e.modelo.guardarPersona('clientes',persona,perfil.id)); rechazaSinCambios(e,()=>e.modelo.cambiarActivo('clientes',perfil.id)); } else { const p=e.modelo.guardarPersona('clientes',persona); e.modelo.guardarPersona('clientes',{...persona,nombre:'Cliente editado'},p.id); assert.equal(e.modelo.listar('clientes').find(x=>x.id===p.id).nombre,'Cliente editado'); e.modelo.cambiarActivo('clientes',p.id); assert.equal(e.modelo.listar('clientes').find(x=>x.id===p.id).activo,false); } }},
  {nombre:'vincular cuentas', ejecutar(e,rol) { ruta(e,rol,'admin-clientes.html'); const id='acceso-cliente-demo'; if(rol!=='administrador') { rechazaSinCambios(e,()=>e.modelo.listarCuentasCliente()); rechazaSinCambios(e,()=>e.modelo.vincularCuentaCliente(id,otroPerfil.id)); } else { const cuenta=e.modelo.listarCuentasCliente().find(x=>x.usuario==='cliente.demo'); assert.ok(cuenta); e.modelo.vincularCuentaCliente(cuenta.id,otroPerfil.id); assert.equal(e.modelo.listarCuentasCliente().find(x=>x.id===cuenta.id).clienteId,otroPerfil.id); } }},
  {nombre:'administrar empleados y cuentas', async ejecutar(e,rol) { ruta(e,rol,'admin-empleados.html'); if(rol!=='administrador') { rechazaSinCambios(e,()=>e.modelo.guardarPersona('empleados',{nombre:'Persona indebida'})); await assert.rejects(e.modelo.guardarCuentaEmpleado('perfil-empleado',{usuario:'usuario.prueba',clave:'PruebaLocal123!',confirmacion:'PruebaLocal123!'})); } else { const p=e.modelo.guardarPersona('empleados',{nombre:'Nuevo Empleado',telefono:'1234567',correo:'nuevo@example.org'}); await e.modelo.guardarCuentaEmpleado(p.id,{usuario:'usuario.prueba',clave:'PruebaLocal123!',confirmacion:'PruebaLocal123!'}); assert.equal(e.modelo.cuentaEmpleado(p.id).usuario,'usuario.prueba'); } }},
  {nombre:'restablecer datos', async ejecutar(e,rol) { ruta(e,rol,'admin.html'); if(rol!=='administrador') { const antes=e.localStorage.getItem(clave); await assert.rejects(e.modelo.restablecer()); assert.equal(e.localStorage.getItem(clave),antes); } else { const inicial=JSON.parse(crearEntorno().localStorage.getItem(clave)); await e.modelo.restablecer(); const d=JSON.parse(e.localStorage.getItem(clave)); assert.deepEqual(d.clientes,inicial.clientes); assert.deepEqual(d.ventas,inicial.ventas); assert.deepEqual(d.empleados,inicial.empleados); } }},
  {nombre:'acceso al panel administrativo', ejecutar(e,rol) { e.location.pathname='/admin.html'; assert.equal(e.modelo.evaluarAcceso().permitido,rol==='administrador'); }}
];

test('matriz de permisos por rol y acción', async (t) => {
  assert.equal(escenarios.length,18);
  for (const rol of ['cliente','empleado','administrador']) {
    const e=await preparar(rol);
    const base=e.localStorage.getItem(clave);
    await t.test(rol, async (tRol) => {
      for (const caso of escenarios) {
        await tRol.test(caso.nombre, async () => {
          e.localStorage.setItem(clave,base);
          assert.equal(e.modelo.sincronizar(),true);
          ruta(e,rol,'admin.html');
          await caso.ejecutar(e,rol);
        });
      }
    });
  }
});

test('cuenta sin vincular no recibe perfiles ni ventas antiguas o ajenas', async () => {
  const e=await preparar('administrador');
  ruta(e,'administrador','admin-clientes.html');
  const cuenta=e.modelo.listarCuentasCliente().find(c=>c.usuario==='cliente.demo');
  e.modelo.vincularCuentaCliente(cuenta.id,null);
  await e.entrar('cliente');
  assert.equal(e.modelo.sesionActual().clienteId,null);
  assert.equal(e.modelo.listar('clientes').length,0);
  assert.equal(e.modelo.listar('ventas').length,0);
});

test('modelo mantiene la validación del teléfono, correo y reglas de clientes', async () => {
  const e=await preparar('administrador'); ruta(e,'administrador','admin-clientes.html');
  for(const telefono of ['', '123456', '12345678901', '12345a7']) {
    assert.equal(e.modelo.validarCliente({...persona,telefono}).valido,false);
    assert.throws(()=>e.modelo.guardarPersona('clientes',{...persona,telefono}));
  }
  for(const telefono of ['1234567','1234567890']) assert.equal(e.modelo.validarCliente({...persona,telefono}).valido,true);
  for(const cedula of ['12345','12345678901','12345a']) assert.equal(e.modelo.validarCliente({...persona,cedula}).valido,false);
  for(const cedula of ['123456','1234567890','']) assert.equal(e.modelo.validarCliente({...persona,cedula}).valido,true);
  assert.equal(e.modelo.validarCliente({...persona,ciudad:'Medellín'}).valido,true);
  assert.equal(e.modelo.validarCliente({...persona,ciudad:'Bogotá 1'}).valido,false);
  assert.equal(e.modelo.validarCliente({...persona,correo:'correo.sin.arroba'}).valido,false);
  assert.equal(e.modelo.validarCliente({...persona,correo:'a'.repeat(115)+'@b.com'}).valido,false);
});

test('el formulario delega validación y ofrece mensajes vinculados', () => {
  const app=leer('js/app.js');
  const html=leer('admin-clientes.html');
  assert.match(app,/Modelo\.validarCliente/);
  assert.match(app,/setAttribute\('aria-describedby'/);
  assert.match(html,/role="alert"|aria-live="polite"/);
});


test('teléfono y correo tienen la misma validación en formulario y modelo para ambos perfiles', async () => {
  const e=await preparar('administrador');
  const app=leer('js/app.js');
  const inicio=app.indexOf('  function validarCampo(campo) {');
  const fin=app.indexOf('  let ultimoFormularioEnviado',inicio);
  assert.ok(inicio>=0 && fin>inicio);
  for(const rol of ['clientes','empleados']) {
    const contexto=vm.createContext({Modelo:e.modelo,document:{body:{dataset:{pagina:'admin-'+rol}}},
      FormData: class { constructor(form) { return Object.entries(form.entrada); } }});
    vm.runInContext(app.slice(inicio,fin)+'\n;globalThis.validarFormulario=validarCampo;',contexto);
    ruta(e,'administrador',rol==='clientes'?'admin-clientes.html':'admin-empleados.html');
    for(const telefono of ['', '123456', '1234567', '1234567890', '12345678901', '12345a7', ' 1234567 ']) {
      const entrada={...persona,telefono};
      const campo={willValidate:true,form:{id:'formPersona',entrada},id:'telefonoPersona',name:'telefono',value:telefono};
      const ui=contexto.validarFormulario(campo);
      const modelo=rol==='clientes' ? e.modelo.validarCliente(entrada).errores.telefono || '' : e.modelo.validarTelefono(telefono);
      assert.equal(ui,modelo,rol+' teléfono '+telefono);
      if(modelo) assert.throws(()=>e.modelo.guardarPersona(rol,entrada));
      else assert.ok(e.modelo.guardarPersona(rol,entrada).id);
    }
    for(const correo of ['', 'cliente@example.org','correo.sin.arroba','a'.repeat(115)+'@b.com']) {
      const entrada={...persona,correo};
      const campo={willValidate:true,form:{id:'formPersona',entrada},id:'correoPersona',name:'correo',value:correo};
      const ui=contexto.validarFormulario(campo);
      const modelo=rol==='clientes' ? e.modelo.validarCliente(entrada).errores.correo || '' : e.modelo.validarCorreo(correo);
      assert.equal(ui,modelo,rol+' correo '+correo);
      if(modelo) assert.throws(()=>e.modelo.guardarPersona(rol,entrada));
      else assert.ok(e.modelo.guardarPersona(rol,entrada).id);
    }
  }
});
