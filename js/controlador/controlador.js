'use strict';
// Coordinación de eventos; las reglas permanecen en Modelo y el dibujo en Vista.
const Controlador = (() => {
  const {crear, moneda, valores, mensaje, opciones, tabla, abrir, cerrar} = Vista;
  function intentar(accion, errorId = 'mensajePagina') {
    try { accion(); } catch (error) { mensaje(error.message, true, errorId); }
  }
  function filtrar(lista, texto, estado = 'todos') {
    const q = Modelo.normalizar(texto);
    return lista.filter((p) => (estado === 'todos' || p.activo === (estado === 'activos')) && Modelo.normalizar(p.nombre + ' ' + (p.correo?? '') + ' ' + p.id).includes(q));
  }
  let accionPendiente = null;
  let comprobarPendiente = null;
  function confirmar(texto, accion) {
    accionPendiente = accion;
    comprobarPendiente = crearComprobacionPendiente();
    Vista.confirmar(texto);
  }
  function cancelarConfirmacion() {
    accionPendiente = null;
    comprobarPendiente = null;
    Vista.cancelarConfirmacion();
  }
  async function resolverConfirmacion() {
    const accion = accionPendiente; const comprobar = comprobarPendiente;
    if (!accion || !comprobar || !comprobar()) {
      cancelarConfirmacion();
      if (document.getElementById('confirmacionDemo').open) { cerrar('confirmacionDemo'); }
      return;
    }
    await accion();
    if (document.getElementById('confirmacionDemo').open) { cerrar('confirmacionDemo'); }
  }
  // El administrador elige una cuenta existente y un perfil sin inferir coincidencias.
  function iniciarVinculosCliente() {
    const formulario = document.getElementById('formVinculoCliente');
    const cuentaSelect = document.getElementById('cuentaCliente');
    const perfilSelect = document.getElementById('perfilCliente');
    function dibujarVinculos() {
      const cuentas = Modelo.listarCuentasCliente();
      opciones('cuentaCliente', cuentas.map((cuenta) => ({id: cuenta.id, nombre: cuenta.usuario + (!cuenta.clienteId ? ' · Sin vincular' : '') + (cuenta.activo ? '' : ' · Cuenta inactiva')})), 'Selecciona una cuenta');
      const cuenta = cuentas.find((item) => item.id === cuentaSelect.value);
      const perfiles = Modelo.listar('clientes');
      perfilSelect.replaceChildren(new Option('Sin vincular', ''));
      perfiles.forEach((perfil) => {
        const opcion = new Option(perfil.nombre + (perfil.activo ? '' : ' · Perfil inactivo'), perfil.id);
        opcion.disabled = !perfil.activo && perfil.id !== cuenta?.clienteId;
        perfilSelect.appendChild(opcion);
      });
      if (cuenta?.clienteId && !perfiles.some((perfil) => perfil.id === cuenta.clienteId)) {
        perfilSelect.appendChild(new Option('Perfil vinculado no disponible', cuenta.clienteId));
      }
      perfilSelect.value = cuenta?.clienteId || '';
      perfilSelect.disabled = !cuenta;
    }
    escuchar(cuentaSelect, 'change', dibujarVinculos);
    escuchar(document, 'datosDemoSincronizados', dibujarVinculos);
    escuchar(formulario, 'submit', (evento) => {
      evento.preventDefault();
      intentar(() => {
        Modelo.vincularCuentaCliente(cuentaSelect.value, perfilSelect.value);
        dibujarVinculos();
        mensaje('Vínculo de la cuenta actualizado.');
      }, 'errorVinculoCliente');
    });
    dibujarVinculos();
    return dibujarVinculos;
  }
  // Clientes y empleados comparten el formulario; se guardan perfiles, nunca cuentas.
  function iniciarPersonas(tipo) {
    if (!puedeIniciarPagina()) { return; }
    const form = document.getElementById('formPersona'); let editando = null; let pagina = 1;
    const actualizarVinculos = tipo === 'clientes' ? iniciarVinculosCliente() : null;
    function dibujar() {
      const lista = filtrar(Modelo.listar(tipo), document.getElementById('buscarPersonas').value, document.getElementById('estadoPersonas').value);
      const limite = Number(document.getElementById('limitePersonas').value);
      const paginas = Math.max(1, Math.ceil(lista.length / limite)); pagina = Math.min(pagina, paginas);
      const columnas = tipo === 'clientes' ? Vista.columnasCliente() : ['nombre', (p) => p.correo || 'No indicado', (p) => p.activo? 'Activo': 'Inactivo'];
      const acciones = [['detalle', 'Ver detalle'], ['editar', 'Editar'], ['estado', (p) => p.activo? 'Desactivar perfil': 'Activar perfil']];
      if (tipo === 'empleados') {
        columnas.push((p) => { const cuenta = Modelo.cuentaEmpleado(p.id); return cuenta? cuenta.usuario + (cuenta.activo? ' · Acceso activo': ' · Acceso inactivo'): 'Sin cuenta'; });
        acciones.push(['cuenta', (p) => Modelo.cuentaEmpleado(p.id)? 'Ver cuenta': 'Crear cuenta'], ['acceso', (p) => { const cuenta = Modelo.cuentaEmpleado(p.id); return cuenta? (cuenta.activo? 'Desactivar acceso': 'Activar acceso'): null; }], ['clave', (p) => Modelo.cuentaEmpleado(p.id)? 'Restablecer contraseña': null]);
      }
      tabla('tablaPersonas', lista.slice((pagina - 1) * limite, pagina * limite), columnas, acciones);
      document.getElementById('paginaPersonas').textContent = `Página ${pagina} de ${paginas} · ${lista.length} perfiles`;
      document.getElementById('anteriorPersonas').disabled = pagina === 1;
      document.getElementById('siguientePersonas').disabled = pagina === paginas;
      if (actualizarVinculos) { actualizarVinculos(); }
    }
    let empleadoCuenta = null; let restablecerClave = false; let guardandoCuenta = false;
    function autorizarCuenta() { if (Modelo.sesionActual()?.rol !== 'administrador') { comprobarAccesoPagina(); return false; } return true; }
    function abrirEditorCuenta(perfil, restablecer) {
      empleadoCuenta = perfil.id; restablecerClave = restablecer;
      const formulario = document.getElementById('formCuenta'); formulario.reset();
      const cuenta = Modelo.cuentaEmpleado(perfil.id);
      formulario.elements.namedItem('usuario').value = restablecer? cuenta.usuario: '';
      formulario.elements.namedItem('usuario').readOnly = restablecer;
      document.getElementById('leyendaCuenta').textContent = (restablecer? 'Restablecer contraseña: ': 'Crear cuenta: ') + perfil.nombre;
      document.getElementById('guardarCuenta').textContent = restablecer? 'Solicitar restablecimiento': 'Crear cuenta de empleado';
      mensaje('', false, 'errorCuenta'); abrir('editorCuenta');
    }
    if (tipo === 'empleados') {
      escuchar(document.getElementById('formCuenta'), 'submit', async (evento) => {
        evento.preventDefault(); if (guardandoCuenta || !autorizarCuenta()) { return; }
        const formulario = evento.currentTarget; const entrada = valores(formulario);
        const resultado = Modelo.validarCuentaEmpleado(empleadoCuenta, entrada, restablecerClave);
        if (!resultado.valido) { mensaje(resultado.mensaje, true, 'errorCuenta'); return; }
        async function guardar() {
          if (guardandoCuenta || !autorizarCuenta()) { return; }
          guardandoCuenta = true; document.getElementById('guardarCuenta').disabled = true;
          try { await Modelo.guardarCuentaEmpleado(empleadoCuenta, entrada, restablecerClave); formulario.reset(); cerrar('editorCuenta'); dibujar(); mensaje(restablecerClave? 'Contraseña restablecida; sesiones anteriores invalidadas.': 'Cuenta de empleado creada y vinculada al perfil.'); }
          finally { guardandoCuenta = false; document.getElementById('guardarCuenta').disabled = false; }
        }
        if (restablecerClave) { confirmar('¿Restablecer la contraseña de este empleado? Se invalidarán sus sesiones anteriores.', guardar); }
        else { try { await guardar(); } catch (error) { mensaje(error.message, true, 'errorCuenta'); } }
      });
      escuchar(document.getElementById('editorCuenta'), 'close', () => document.getElementById('formCuenta').reset());
    }
    escuchar(document, 'datosDemoSincronizados', dibujar);
    escuchar(document.getElementById('nuevoRegistro'), 'click', () => { editando = null; form.reset(); document.getElementById('leyendaPersona').textContent = 'Nuevo perfil'; mensaje('', false, 'errorPersona'); abrir('editorPersona'); });
    escuchar(document.getElementById('tablaPersonas'), 'click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) { return; }
      const p = Modelo.listar(tipo).find((d) => d.id === b.dataset.id); if (!p) { return; }
      if (tipo === 'empleados' && ['cuenta', 'acceso', 'clave'].includes(b.dataset.accion)) {
        if (!autorizarCuenta()) { return; }
        const cuenta = Modelo.cuentaEmpleado(p.id);
        if (b.dataset.accion === 'cuenta' && cuenta) {
          const dl = document.getElementById('detalleCuenta'); dl.replaceChildren();
          [['Empleado', p.nombre], ['Usuario', cuenta.usuario], ['Rol asignado', 'Empleado'], ['Acceso', cuenta.activo? 'Activo': 'Inactivo']].forEach(([nombre, valor]) => { dl.appendChild(crear('dt', nombre)); dl.appendChild(crear('dd', valor)); }); abrir('dialogoCuenta');
        } else if (b.dataset.accion === 'acceso') {
          confirmar('¿Cambiar el acceso de ' + p.nombre + '? Se invalidarán las sesiones anteriores.', () => { if (!autorizarCuenta()) { return; } Modelo.cambiarAccesoEmpleado(p.id); dibujar(); mensaje('Acceso actualizado; sesiones anteriores invalidadas.'); });
        } else { abrirEditorCuenta(p, b.dataset.accion === 'clave'); }
        return;
      }
      if (b.dataset.accion === 'editar') {
        editando = p.id; form.reset();
        const campos = tipo === 'clientes' ? ['nombre', 'correo', 'telefono', 'direccion', 'ciudad', 'cedula'] : ['nombre', 'correo', 'telefono', 'direccion'];
        campos.forEach((k) => {
          const campo = form.elements.namedItem(k);
          if (campo) { campo.value = tipo === 'clientes' && p[k] === 'No indicado' ? '' : (p[k] ?? ''); }
        });
        document.getElementById('leyendaPersona').textContent = 'Editar perfil'; mensaje('', false, 'errorPersona'); abrir('editorPersona');
      } else if (b.dataset.accion === 'estado') {
        confirmar('¿Cambiar el estado del perfil ' + p.nombre + '?', () => { Modelo.cambiarActivo(tipo, p.id); dibujar(); mensaje('Estado actualizado.'); });
      } else {
        if (tipo === 'clientes') { Vista.dibujarDetalleCliente(p); }
        else {
          const dl = document.getElementById('detallePersona'); dl.replaceChildren();
          Object.entries(p).forEach(([k, v]) => { dl.appendChild(crear('dt', k)); dl.appendChild(crear('dd', String(v || 'No indicado'))); });
        }
        abrir('dialogoDetalle');
      }
    });
    escuchar(form, 'submit', (e) => { e.preventDefault(); intentar(() => { Modelo.guardarPersona(tipo, valores(form), editando); cerrar('editorPersona'); dibujar(); mensaje('Perfil guardado. No se creó ninguna cuenta de acceso.'); }, 'errorPersona'); });
    ['buscarPersonas', 'estadoPersonas', 'limitePersonas'].forEach((id) => escuchar(document.getElementById(id), id === 'buscarPersonas'? 'input': 'change', () => { pagina = 1; dibujar(); }));
    escuchar(document.getElementById('anteriorPersonas'), 'click', () => { pagina -= 1; dibujar(); });
    escuchar(document.getElementById('siguientePersonas'), 'click', () => { pagina += 1; dibujar(); });
    dibujar();
  }
  // La selección del cliente dirige la consulta autorizada y la actualización de la vista.
  function iniciarHistorialVentaEmpleado(selector, alCambiar) {
    const contenedor = document.getElementById('historialClienteVenta');
    function refrescar() {
      if (!selector.value) {
        Vista.dibujarHistorialClienteVenta([]);
        contenedor.hidden = true;
        return;
      }
      try {
        const relojes = Modelo.relojesCompradosPorCliente(selector.value);
        Vista.dibujarHistorialClienteVenta(relojes);
        contenedor.hidden = false;
      } catch (error) {
        Vista.dibujarHistorialClienteVenta([]);
        contenedor.hidden = true;
        Vista.mensaje(error.message, true, 'errorVentaEmpleado');
      }
    }
    escuchar(selector, 'change', () => { if (alCambiar) { alCambiar(); } refrescar(); });
    return refrescar;
  }
  // Editor visual compartido; Modelo valida estados y efectos sobre las existencias.
  function iniciarDocumentos(tipo) {
    if (!puedeIniciarPagina()) { return; }
    let seleccionado = null; let linea = null;
    const form = document.getElementById('formDocumento'); const detalle = document.getElementById('formDetalle');
    function mostrarSeccionVentas(verLista) {
      if (tipo !== 'ventas') { return; }
      document.getElementById('editorDocumento').hidden = verLista;
      document.getElementById('listaVentas').hidden = !verLista;
      document.getElementById('registrarVenta').setAttribute('aria-pressed', String(!verLista));
      document.getElementById('verVentasPasadas').setAttribute('aria-pressed', String(verLista));
    }
    function dibujar() {
      const q = Modelo.normalizar(document.getElementById('buscarDocumentos').value);
      const estado = document.getElementById('estadoDocumentos').value;
      const documentos = Modelo.listar(tipo);
      const lista = tipo === 'ventas' ? Modelo.filtrarVentas(documentos, q, estado) : documentos.filter((d) => Modelo.normalizar(d.contacto + ' ' + d.id).includes(q) && (estado === 'todos' || d.estado === estado));
      tabla('tablaDocumentos', lista, [(d) => new Date(d.fecha).toLocaleDateString('es-CO'), 'contacto', 'estado', (d) => moneda(Modelo.total(d))], [['abrir', 'Abrir documento']]);
      const doc = seleccionado? Modelo.documento(tipo, seleccionado): null;
      if (tipo === 'ventas') {
        const selector = document.getElementById('clienteDocumento');
        const perfiles = Modelo.listar('clientes');
        const anterior = selector.value;
        opciones('clienteDocumento', perfiles.filter((perfil) => perfil.activo || perfil.id === doc?.clienteId), 'Selecciona un cliente');
        if (doc?.clienteId && !perfiles.some((perfil) => perfil.id === doc.clienteId)) {
          selector.appendChild(new Option('Perfil vinculado no disponible', doc.clienteId));
        }
        selector.value = doc ? (doc.clienteId || '') : anterior;
        selector.disabled = Boolean(doc);
        selector.required = !doc;
      }
      const cerrado = doc && doc.estado !== 'borrador';
      form.querySelector('fieldset').disabled = Boolean(cerrado);
      detalle.querySelector('fieldset').disabled = !doc || Boolean(cerrado);
      document.getElementById('confirmarDocumento').disabled = !doc || doc.estado !== 'borrador';
      if (tipo === 'ventas') {
        detalle.hidden = Boolean(cerrado);
        document.getElementById('confirmarDocumento').hidden = Boolean(cerrado);
      }
      document.getElementById('anularDocumento').disabled = !doc || doc.estado === 'anulado';
      document.getElementById('estadoDocumento').textContent = doc? `${doc.estado.toUpperCase()} · Total ${moneda(Modelo.total(doc))} · Referencia ${doc.id}`: 'Nuevo borrador: guarda primero la cabecera.';
      tabla('tablaDetalles', doc?.detalles?? [], ['nombre', 'cantidad', (d) => moneda(d.centavos / 100), (d) => moneda(d.centavos * d.cantidad / 100)], cerrado? []: [['editar', 'Editar'], ['quitar', 'Quitar']]);
      opciones('productoLinea', Modelo.listar('productos').filter((p) => p.activo));
    }
    function abrirDocumento(id) {
      seleccionado = id; linea = null; form.reset(); detalle.reset();
      const doc = id? Modelo.documento(tipo, id): null;
      if (doc) { form.elements.namedItem('contacto').value = doc.contacto; form.elements.namedItem('observaciones').value = doc.observaciones; }
      mostrarSeccionVentas(false);
      document.getElementById('editorDocumento').hidden = false; dibujar(); document.getElementById('editorDocumento').focus();
    }
    if (tipo === 'ventas') {
      escuchar(document.getElementById('registrarVenta'), 'click', () => abrirDocumento(null));
      escuchar(document.getElementById('verVentasPasadas'), 'click', () => { mostrarSeccionVentas(true); document.getElementById('buscarDocumentos').focus(); });
    }
    escuchar(document.getElementById('nuevoDocumento'), 'click', () => abrirDocumento(null));
    escuchar(document.getElementById('cerrarEditor'), 'click', () => {
      if (tipo === 'ventas') { mostrarSeccionVentas(true); document.getElementById('verVentasPasadas').focus(); }
      else { document.getElementById('editorDocumento').hidden = true; document.getElementById('nuevoDocumento').focus(); }
    });
    escuchar(document.getElementById('tablaDocumentos'), 'click', (e) => { const b = e.target.closest('button[data-id]'); if (b) { abrirDocumento(b.dataset.id); } });
    escuchar(form, 'submit', (e) => { e.preventDefault(); intentar(() => { const doc = Modelo.guardarDocumento(tipo, valores(form), seleccionado); seleccionado = doc.id; dibujar(); mensaje('Borrador guardado. Aún no modifica existencias.'); }); });
    escuchar(detalle, 'submit', (e) => { e.preventDefault(); intentar(() => { Modelo.guardarDetalle(tipo, seleccionado, valores(detalle), linea); linea = null; detalle.reset(); dibujar(); mensaje('Detalle guardado.'); }); });
    escuchar(document.getElementById('tablaDetalles'), 'click', (e) => {
      const b = e.target.closest('button[data-id]'); if (!b) { return; }
      if (b.dataset.accion === 'quitar') { confirmar('¿Quitar esta línea del borrador?', () => { Modelo.quitarDetalle(tipo, seleccionado, b.dataset.id); dibujar(); }); }
      else { const d = Modelo.documento(tipo, seleccionado).detalles.find((p) => p.id === b.dataset.id); linea = d.id; detalle.elements.namedItem('productoId').value = d.productoId; detalle.elements.namedItem('cantidad').value = d.cantidad; detalle.elements.namedItem('precio').value = (d.centavos / 100).toFixed(2); detalle.elements.namedItem('cantidad').focus(); }
    });
    escuchar(document.getElementById('nuevaLinea'), 'click', () => { linea = null; detalle.reset(); });
    escuchar(document.getElementById('confirmarDocumento'), 'click', () => confirmar('¿Confirmar la operación? Su efecto sobre el inventario se aplica una sola vez.', () => { Modelo.transicion(tipo, seleccionado, 'confirmar'); dibujar(); mensaje('Documento confirmado solo en este navegador.'); }));
    escuchar(document.getElementById('anularDocumento'), 'click', () => confirmar('¿Anular el documento? Se intentará revertir su efecto una sola vez.', () => { Modelo.transicion(tipo, seleccionado, 'anular', document.getElementById('motivoAnulacion').value); dibujar(); mensaje('Documento anulado solo en este navegador.'); }));
    ['buscarDocumentos', 'estadoDocumentos'].forEach((id) => escuchar(document.getElementById(id), id === 'buscarDocumentos'? 'input': 'change', dibujar));
    dibujar();
  }
  let paginaAutorizada = false;
  let revocado = false;
  let restableciendo = false;
  let inicializado = false;
  let identidadInicial = null;
  const eventosModulo = new AbortController();
  let resolverInicio;
  const listo = new Promise((resolver) => { resolverInicio = resolver; });
  function ocultarContenido() {
    document.getElementById('contenido').hidden = true;
    document.body.classList.remove('acceso-autorizado');
    document.body.classList.add('acceso-pendiente');
  }
  function revocarModulo() {
    paginaAutorizada = false; revocado = true;
    ocultarContenido(); eventosModulo.abort();
    delete document.body.dataset.moduloIniciado;
    cancelarConfirmacion();
    document.querySelectorAll('input[type="password"]').forEach((campo) => { campo.value = ''; });
    document.querySelectorAll('dialog[open]').forEach((dialogo) => dialogo.close());
    document.dispatchEvent(new Event('accesoRevocado'));
  }
  // Política por ruta y cuenta vigente, evaluada ANTES de revelar o inicializar el módulo.
  function comprobarAccesoPagina() {
    if (revocado || restableciendo) { return false; }
    const acceso = Modelo.evaluarAcceso();
    if (!acceso.permitido) {
      revocarModulo();
      if (!acceso.sesion && (Modelo.meta().rol || Modelo.meta().usuario)) { intentar(() => Modelo.cerrarSesionDemo()); }
      location.replace(acceso.destino);
      return false;
    }
    if (inicializado && acceso.requerido && identidadInicial !== acceso.identidad) {
      revocarModulo(); location.replace(acceso.pagina + '?aviso=cambio'); return false;
    }
    if (!acceso.sesion && (Modelo.meta().rol || Modelo.meta().usuario)) { intentar(() => Modelo.cerrarSesionDemo()); }
    paginaAutorizada = true;
    identidadInicial = acceso.identidad;
    Vista.dibujarNavegacion(acceso.sesion, acceso.pagina.replace(/\.html$/, ''), Modelo.destinoPerfil(acceso.sesion?.rol));
    document.getElementById('contenido').hidden = false;
    document.body.classList.remove('acceso-pendiente');
    document.body.classList.add('acceso-autorizado');
    return true;
  }
  function puedeIniciarPagina() { return !revocado && comprobarAccesoPagina(); }
  function iniciarModulo(inicializador) {
    return listo.then((permitido) => {
      if (!permitido || !puedeIniciarPagina()) { return; }
      document.body.dataset.moduloIniciado = 'true';
      return inicializador();
    });
  }
  // Todos los eventos del módulo se validan y se eliminan juntos al revocar el acceso.
  function escuchar(objeto, tipo, accion, opciones = {}) {
    objeto.addEventListener(tipo, function (evento) {
      if (!puedeIniciarPagina()) { evento.preventDefault(); evento.stopImmediatePropagation(); return; }
      const resultado = accion.call(this, evento);
      if (resultado && typeof resultado.finally === 'function') { return resultado.finally(() => { if (!revocado) { comprobarAccesoPagina(); } }); }
      return resultado;
    }, {...(typeof opciones === 'boolean' ? {capture: opciones} : opciones), signal: eventosModulo.signal});
  }
  // Cierra la ventana entre abrir una confirmación y ejecutar su acción.
  function crearComprobacionPendiente() {
    const original = Modelo.evaluarAcceso();
    return () => {
      if (!puedeIniciarPagina()) { return false; }
      return Modelo.evaluarAcceso().identidad === original.identidad;
    };
  }
  function iniciarComun() {
    paginaAutorizada = comprobarAccesoPagina();
    resolverInicio(paginaAutorizada);
    if (!paginaAutorizada) { return; }
    inicializado = true;
    const aviso = new URLSearchParams(location.search).get('aviso');
    if (aviso === 'perfil') { mensaje('Tu perfil no corresponde a la página solicitada. Te hemos dirigido a tu espacio.'); }
    if (aviso === 'cambio') { mensaje('La cuenta cambió. Se ha reiniciado el módulo para la sesión vigente.'); }
    if (aviso === 'sesion') { mensaje('Inicia sesión: no hay una sesión vigente o su acceso fue invalidado.'); }
    if (aviso === 'imagenes') { mensaje('Los datos se restablecieron, pero no fue posible borrar las imágenes guardadas en este navegador.', true); }
    const meta = Modelo.meta();
    document.documentElement.classList.toggle('tema-oscuro', meta.tema === 'oscuro');
    const tema = document.getElementById('cambiarTema');
    function pintarTema() { const oscuro = Modelo.meta().tema === 'oscuro'; document.documentElement.classList.toggle('tema-oscuro', oscuro); tema.textContent = oscuro? 'Modo claro': 'Modo oscuro'; tema.setAttribute('aria-pressed', String(oscuro)); }
    pintarTema();
    escuchar(tema, 'click', () => intentar(() => { Modelo.cambiarTema(Modelo.meta().tema === 'oscuro'? 'claro': 'oscuro'); pintarTema(); }));
    const salir = document.getElementById('salirDemo');
    escuchar(salir, 'click', () => intentar(() => { Modelo.cerrarSesionDemo(); location.assign('index.html'); }));
    escuchar(document.getElementById('alternarMenu'), 'click', (e) => { const abierto = document.body.classList.toggle('menu-abierto'); e.currentTarget.setAttribute('aria-expanded', String(abierto)); });
    escuchar(document.getElementById('menuLateral'), 'keydown', (e) => { if (e.key === 'Escape') { document.body.classList.remove('menu-abierto'); const b = document.getElementById('alternarMenu'); b?.setAttribute('aria-expanded', 'false'); b?.focus(); } });
    document.querySelectorAll('form').forEach((form) => escuchar(form, 'invalid', (e) => { const error = form.querySelector('[data-error]'); mensaje('Revisa el campo indicado: completa el dato y respeta su formato.', true, error? error.id: 'mensajePagina'); }, true));
    // Contener Tab en el diálogo y permitir Escape nativo para cancelar.
    document.querySelectorAll('dialog').forEach((dialogo) => escuchar(dialogo, 'keydown', (evento) => {
      if (evento.key !== 'Tab') { return; }
      const controles = [...dialogo.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter((nodo) => nodo.getClientRects().length > 0);
      if (!controles.length) { return; }
      const primero = controles[0]; const ultimo = controles[controles.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }));
    document.querySelectorAll('[data-cerrar]').forEach((b) => escuchar(b, 'click', () => cerrar(b.dataset.cerrar)));
    document.querySelectorAll('dialog[data-retorno]').forEach((d) => escuchar(d, 'close', () => document.getElementById(d.dataset.retorno)?.focus()));
    escuchar(document.getElementById('confirmacionDemo'), 'close', cancelarConfirmacion);
    escuchar(document.getElementById('aceptarConfirmacion'), 'click', async (evento) => {
      const boton = evento.currentTarget;
      if (boton.disabled) { return; }
      boton.disabled = true;
      try { await resolverConfirmacion(); }
      catch (error) { mensaje(error.message, true, 'errorConfirmacion'); }
      finally { boton.disabled = false; }
    });
    const botonRestablecer = document.getElementById('restablecerDemo');
    if (botonRestablecer) { escuchar(botonRestablecer, 'click', () => confirmar('¿Restablecer los datos de la aplicación? Se perderán tus cambios, documentos, perfiles, historial y preferencias de XERO.', async () => {
      restableciendo = true;
      try {
        const resultado = await Modelo.restablecer();
        revocarModulo();
        location.assign(resultado.imagenesBorradas ? 'login.html' : 'login.html?aviso=imagenes');
      } catch (error) {
        restableciendo = false;
        throw error;
      }
    }));
    }
    if (meta.problema) { mensaje(meta.problema, true); }
    window.addEventListener('pageshow', () => { comprobarAccesoPagina(); });
    window.addEventListener('pagehide', () => { if (Modelo.evaluarAcceso().requerido) { ocultarContenido(); cancelarConfirmacion(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { comprobarAccesoPagina(); } });
    window.addEventListener('focus', () => { paginaAutorizada = comprobarAccesoPagina(); });
    window.addEventListener('storage', (evento) => {
      if (evento.key !== 'xeroUniversidadDemoV1' && evento.key !== null) { return; }
      Modelo.sincronizar(); paginaAutorizada = comprobarAccesoPagina();
      if (paginaAutorizada) { document.dispatchEvent(new Event('datosDemoSincronizados')); pintarTema(); }
    });
  }
  // Cada editor conserva solo su vista temporal; el archivo se guarda al confirmar.
  let editorImagen = null;
  function configurarImagenProducto(form) {
    const radios = [...form.querySelectorAll('[name="origenImagen"]')];
    const ejemplo = form.elements.namedItem('imagen');
    const enlace = form.elements.namedItem('enlaceImagen');
    const archivo = form.elements.namedItem('archivoImagen');
    const radioArchivo = document.getElementById('origenArchivo');
    const vista = document.getElementById('vistaPrevia');
    const estado = document.getElementById('estadoImagen');
    const disponibilidadAviso = document.createElement('p');
    disponibilidadAviso.id = 'disponibilidadImagen';
    disponibilidadAviso.setAttribute('role', 'status');
    disponibilidadAviso.setAttribute('aria-live', 'polite');
    estado.insertAdjacentElement('afterend', disponibilidadAviso);
    radioArchivo.setAttribute('aria-describedby', radioArchivo.getAttribute('aria-describedby') + ' disponibilidadImagen');
    const grupos = {
      ejemplo: document.getElementById('grupoImagenEjemplo'),
      enlace: document.getElementById('grupoImagenEnlace'),
      archivo: document.getElementById('grupoImagenArchivo')
    };
    let referenciaOriginal = '';
    let disponible = false;
    let revision = 0;
    let urlTemporal = null;
    let cargador = null;
    let temporizador = null;
    let enlaceComprobado = '';
    let archivoComprobado = null;
    let referenciaComprobada = '';

    function modo() { return radios.find((radio) => radio.checked)?.value || 'ejemplo'; }
    function informar(texto) { estado.textContent = texto; }
    function limpiarVista() {
      if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
      if (cargador) { cargador.onload = null; cargador.onerror = null; cargador.src = ''; cargador = null; }
      if (urlTemporal) { URL.revokeObjectURL(urlTemporal); urlTemporal = null; }
      vista.hidden = true;
      vista.removeAttribute('src');
    }
    function urlHttps(valor) {
      try {
        const url = new URL(valor);
        return /^https:\/\//i.test(valor) && url.protocol === 'https:' && Boolean(url.hostname);
      } catch (error) { return false; }
    }
    function activarCampos() {
      const elegido = modo();
      Object.keys(grupos).forEach((nombre) => { grupos[nombre].hidden = nombre !== elegido; });
      ejemplo.disabled = elegido !== 'ejemplo';
      enlace.disabled = elegido !== 'enlace';
      archivo.disabled = elegido !== 'archivo' || !disponible;
      ejemplo.required = elegido === 'ejemplo';
      enlace.required = elegido === 'enlace';
      archivo.required = elegido === 'archivo' && !referenciaOriginal.startsWith('idb:');
    }
    async function actualizarVista() {
      const actual = ++revision;
      limpiarVista(); enlaceComprobado = ''; archivoComprobado = null; referenciaComprobada = '';
      activarCampos(); informar('');
      const elegido = modo();
      if (elegido === 'ejemplo') {
        if (Modelo.imagenes.includes(ejemplo.value)) { vista.src = ejemplo.value; vista.hidden = false; }
        return;
      }
      if (elegido === 'enlace') {
        const valor = enlace.value.trim();
        if (!valor) { return; }
        if (!urlHttps(valor)) { informar('Introduce un enlace válido que empiece por https://.'); return; }
        informar('Comprobando el enlace de la imagen…');
        const imagen = new Image(); cargador = imagen;
        const terminar = (correcto) => {
          if (actual !== revision) { return; }
          if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
          cargador = null;
          if (correcto) { enlaceComprobado = valor; vista.src = valor; vista.hidden = false; informar('Imagen cargada correctamente.'); }
          else { informar('No fue posible cargar la imagen desde ese enlace.'); }
        };
        imagen.onload = () => terminar(true);
        imagen.onerror = () => terminar(false);
        temporizador = setTimeout(() => { imagen.onload = null; imagen.onerror = null; imagen.src = ''; terminar(false); }, 5000);
        imagen.src = valor;
        return;
      }
      if (!disponible) { informar('El almacenamiento de imágenes no está disponible en este navegador.'); return; }
      try {
        const seleccionado = archivo.files[0];
        let blob;
        if (seleccionado) {
          await ServicioImagenes.validarArchivo(seleccionado);
          blob = seleccionado;
        } else if (referenciaOriginal.startsWith('idb:')) {
          blob = await ServicioImagenes.obtenerImagen(referenciaOriginal.slice(4));
          if (!blob) { throw new Error('No se encontró la imagen guardada en este navegador.'); }
        } else { return; }
        if (actual !== revision) { return; }
        urlTemporal = URL.createObjectURL(blob);
        const temporal = urlTemporal;
        const imagen = new Image(); cargador = imagen;
        informar('Comprobando el archivo de imagen…');
        const terminar = (correcto) => {
          if (actual !== revision) { return; }
          if (temporizador !== null) { clearTimeout(temporizador); temporizador = null; }
          cargador = null;
          if (!correcto) {
            URL.revokeObjectURL(temporal); urlTemporal = null;
            informar('No fue posible leer el archivo de imagen.'); return;
          }
          vista.src = temporal; vista.hidden = false;
          archivoComprobado = seleccionado || null;
          referenciaComprobada = seleccionado ? '' : referenciaOriginal;
          informar(seleccionado ? 'Archivo listo para guardar.' : 'Imagen guardada en este navegador.');
        };
        imagen.onload = () => terminar(true);
        imagen.onerror = () => terminar(false);
        temporizador = setTimeout(() => { imagen.onload = null; imagen.onerror = null; imagen.src = ''; terminar(false); }, 5000);
        imagen.src = temporal;
      } catch (error) {
        if (actual === revision) { informar(error.message || 'No fue posible leer la imagen seleccionada.'); }
      }
    }
    function seleccionar(producto) {
      referenciaOriginal = producto?.imagen || '';
      const origen = referenciaOriginal.startsWith('idb:') ? 'archivo' : /^https:\/\//i.test(referenciaOriginal) ? 'enlace' : 'ejemplo';
      const radio = radios.find((item) => item.value === origen);
      radio.checked = true;
      if (origen === 'ejemplo' && referenciaOriginal) { ejemplo.value = referenciaOriginal; }
      if (origen === 'enlace') { enlace.value = referenciaOriginal; }
      archivo.value = '';
      actualizarVista();
    }
    function seleccion() {
      const elegido = modo();
      if (elegido === 'ejemplo') {
        if (!Modelo.imagenes.includes(ejemplo.value)) { throw new Error('Selecciona una ilustración de ejemplo.'); }
        return {referencia: ejemplo.value, archivo: null, revision};
      }
      if (elegido === 'enlace') {
        const valor = enlace.value.trim();
        if (!urlHttps(valor)) { throw new Error('Introduce un enlace válido que empiece por https://.'); }
        if (enlaceComprobado !== valor) {
          const aviso = estado.textContent === 'Comprobando el enlace de la imagen…' ? 'Espera a que termine la comprobación del enlace.' : 'No fue posible cargar la imagen desde ese enlace.';
          throw new Error(aviso);
        }
        return {referencia: valor, archivo: null, revision};
      }
      if (!disponible) { throw new Error('El almacenamiento de imágenes no está disponible en este navegador.'); }
      const seleccionado = archivo.files[0];
      if (seleccionado && seleccionado === archivoComprobado) { return {referencia: '', archivo: seleccionado, revision}; }
      if (!seleccionado && referenciaOriginal && referenciaOriginal === referenciaComprobada) { return {referencia: referenciaOriginal, archivo: null, revision}; }
      throw new Error(estado.textContent || 'Selecciona un archivo de imagen válido.');
    }
    radios.forEach((radio) => escuchar(radio, 'change', actualizarVista));
    escuchar(ejemplo, 'change', actualizarVista);
    escuchar(enlace, 'input', actualizarVista);
    escuchar(archivo, 'change', actualizarVista);
    function cancelarVista() {
      revision += 1; limpiarVista(); archivo.value = '';
      enlaceComprobado = ''; archivoComprobado = null; referenciaComprobada = '';
      informar(''); activarCampos();
    }
    window.addEventListener('pagehide', cancelarVista);
    document.addEventListener('accesoRevocado', cancelarVista);
    ServicioImagenes.disponible().then((resultado) => {
      disponible = resultado;
      radioArchivo.disabled = !resultado;
      disponibilidadAviso.textContent = resultado ? '' : 'La subida de imágenes no está disponible en este navegador.';
      if (modo() === 'archivo') { actualizarVista(); }
    }).catch(() => {
      disponible = false; radioArchivo.disabled = true;
      disponibilidadAviso.textContent = 'La subida de imágenes no está disponible en este navegador.';
      if (modo() === 'archivo') { actualizarVista(); }
    });
    activarCampos();
    return {seleccionar, seleccion, revision: () => revision, cancelar: cancelarVista, actualizar: actualizarVista};
  }
  async function borrarImagenSinReferencias(referencia) {
    if (!referencia || !referencia.startsWith('idb:')) { return; }
    if (!Modelo.sincronizar()) { throw new Error('No se pudo comprobar el uso de la imagen anterior.'); }
    if (Modelo.listar('productos').some((producto) => producto.imagen === referencia)) { return; }
    await ServicioImagenes.eliminarImagen(referencia.slice(4));
  }
  // El formulario comparte las mismas reglas de producto en ambas pantallas.
  function prepararFormularioProducto(form, producto = null) {
    form.reset();
    if (producto) {
      ['nombre', 'precio', 'cantidad', 'categoria'].forEach((campo) => { form.elements.namedItem(campo).value = producto[campo]; });
    }
    form.elements.namedItem('cantidad').readOnly = Boolean(producto);
    editorImagen.seleccionar(producto);
  }
  async function guardarProducto(form, id, despues, textoExito) {
    if (form.dataset.guardando === 'true') { return; }
    if (Modelo.sesionActual()?.rol !== 'administrador') { mensaje('Inicia sesión como administrador para modificar productos.', true, 'errorProducto'); return; }
    const identidad = Modelo.evaluarAcceso().identidad;
    let idNuevo = null;
    let guardado = false;
    const boton = form.querySelector('[type="submit"]');
    form.dataset.guardando = 'true';
    if (boton) { boton.disabled = true; }
    try {
      let seleccion;
      try { seleccion = editorImagen.seleccion(); }
      catch (error) { document.getElementById('estadoImagen').textContent = error.message; return; }
      const entrada = valores(form);
      let imagenAnterior = '';
      if (!Modelo.sincronizar()) { throw new Error('No fue posible leer los productos guardados.'); }
      if (id) {
        const actual = Modelo.producto(id);
        if (!actual) { throw new Error('El producto ya no está disponible.'); }
        entrada.cantidad = actual.cantidad;
        imagenAnterior = actual.imagen;
      }
      entrada.imagen = seleccion.archivo ? 'idb:pendiente' : seleccion.referencia;
      const resultado = Modelo.validar(entrada, id);
      if (!resultado.valido) { throw new Error(resultado.mensaje); }
      if (seleccion.archivo) {
        try { idNuevo = await ServicioImagenes.guardarImagen(seleccion.archivo); }
        catch (error) { document.getElementById('estadoImagen').textContent = error.message; return; }
        entrada.imagen = 'idb:' + idNuevo;
      }
      if (seleccion.revision !== editorImagen.revision() || !Modelo.sincronizar() ||
          Modelo.evaluarAcceso().identidad !== identidad || Modelo.sesionActual()?.rol !== 'administrador' || !puedeIniciarPagina()) {
        throw new Error('La sesión o la imagen cambiaron. Vuelve a intentar el guardado.');
      }
      if (id) {
        const actual = Modelo.producto(id);
        if (!actual || actual.imagen !== imagenAnterior) { throw new Error('El producto cambió en otra pestaña. Vuelve a abrirlo antes de guardar.'); }
        entrada.cantidad = actual.cantidad;
      }
      Modelo.guardarProducto(entrada, id);
      guardado = true;
      despues();
      if (imagenAnterior && imagenAnterior !== entrada.imagen) {
        try { await borrarImagenSinReferencias(imagenAnterior); }
        catch (error) { mensaje(textoExito + ' No se pudo borrar la imagen anterior del navegador.', true); return; }
      }
      mensaje(textoExito);
    } catch (error) {
      if (idNuevo && !guardado) {
        try { await ServicioImagenes.eliminarImagen(idNuevo); }
        catch (falloLimpieza) { mensaje((error.message || 'No se pudo guardar el producto.') + ' No se pudo descartar el archivo temporal.', true, 'errorProducto'); return; }
      }
      mensaje(error.message || 'No fue posible guardar el producto.', true, 'errorProducto');
    } finally {
      delete form.dataset.guardando;
      if (boton) { boton.disabled = false; }
    }
  }
  function solicitarEliminacionProducto(producto, despues, textoConfirmacion, textoExito) {
    const resultado = Modelo.validarEliminacion(producto.id);
    if (!resultado.valido) { mensaje(resultado.mensaje, true); return; }
    confirmar(textoConfirmacion, async () => {
      Modelo.sincronizar();
      const actual = Modelo.producto(producto.id);
      if (!actual) { throw new Error('El producto ya no está disponible.'); }
      Modelo.eliminarProducto(producto.id);
      despues();
      try { await borrarImagenSinReferencias(actual.imagen); }
      catch (error) { mensaje(textoExito + ' No se pudo borrar la imagen del navegador.', true); return; }
      mensaje(textoExito);
    });
  }
  function solicitarEstadoProducto(producto, despues, textoConfirmacion, textoExito = '') {
    confirmar(textoConfirmacion, () => { Modelo.cambiarActivo('productos', producto.id); despues(); if (textoExito) { mensaje(textoExito); } });
  }
  function iniciarProductos() {
  if (!puedeIniciarPagina()) { return; }
  const form = document.getElementById('formProducto'); let editando = null;
  let pagina = 1; let columnaOrden = null; let ordenAscendente = true;
  Vista.opciones('categoriaFormulario', Modelo.categorias);
  Vista.opciones('imagenFormulario', Modelo.imagenes.map((id, i) => ({id, nombre: 'Ilustración  ' + (i + 1)})));
  editorImagen = configurarImagenProducto(form);
  function obtenerProductos() {
    const categoria = document.getElementById('filtroCategoria').value;
    const lista = filtrar(Modelo.listar('productos'), document.getElementById('buscarProductos').value, document.getElementById('estadoProductos').value)
      .filter((p) => !categoria || p.categoria === categoria);
    if (columnaOrden) {
      lista.sort((a, b) => {
        let resultado;
        if (columnaOrden === 'precio' || columnaOrden === 'cantidad') {
          resultado = Number(a[columnaOrden]) - Number(b[columnaOrden]);
        } else {
          const valorA = columnaOrden === 'estado' ? (a.activo ? 'Activo' : 'Inactivo') : a[columnaOrden];
          const valorB = columnaOrden === 'estado' ? (b.activo ? 'Activo' : 'Inactivo') : b[columnaOrden];
          resultado = String(valorA ?? '').localeCompare(String(valorB ?? ''), 'es', {sensitivity: 'base'});
        }
        return ordenAscendente ? resultado : -resultado;
      });
    }
    return lista;
  }
  function dibujar() {
    const lista = obtenerProductos();
    const limite = Number(document.getElementById('limiteProductos').value);
    const paginas = Math.max(1, Math.ceil(lista.length / limite));
    pagina = Math.min(pagina, paginas);
    Vista.tabla('tablaProductos', lista.slice((pagina - 1) * limite, pagina * limite), ['nombre', 'categoria', (p) => Vista.moneda(p.precio), 'cantidad', (p) => p.activo? 'Activo': 'Inactivo'], [['editar', 'Editar'], ['eliminar', 'Eliminar'], ['estado', (p) => p.activo? 'Desactivar': 'Activar']]);
    document.getElementById('contadorProductos').textContent = lista.length + ' registros.';
    document.getElementById('paginaProductos').textContent = `Página ${pagina} de ${paginas} · ${lista.length} productos`;
    document.getElementById('anteriorProductos').disabled = pagina === 1;
    document.getElementById('siguienteProductos').disabled = pagina === paginas;
  }
  function escaparCsv(valor, esTexto = true) {
    let texto = String(valor ?? '');
    if (esTexto && /^[=+\-@\t\r]/.test(texto)) { texto = "'" + texto; }
    return /[",\r\n]/.test(texto) ? '"' + texto.replace(/"/g, '""') + '"' : texto;
  }
  function exportarCsv() {
    const lista = obtenerProductos();
    const mensaje = document.getElementById('mensajeExportacion');
    if (!lista.length) {
      mensaje.textContent = 'No hay productos que coincidan con los filtros para exportar.';
      return;
    }
    const filas = [['Nombre', 'Categoría', 'Precio', 'Cantidad', 'Estado'],
      ...lista.map((p) => [p.nombre, p.categoria, p.precio, p.cantidad, p.activo ? 'Activo' : 'Inactivo'])];
    const contenido = filas.map((fila) => fila.map((valor, indice) => escaparCsv(valor, indice !== 2 && indice !== 3)).join(',')).join('\r\n');
    const archivo = new Blob(['\uFEFF', contenido], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    const fecha = new Date();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    enlace.href = url;
    enlace.download = `xero-productos-${fecha.getFullYear()}-${mes}-${dia}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mensaje.textContent = 'Archivo CSV generado con ' + lista.length + ' productos.';
  }
  Vista.opciones('filtroCategoria', Modelo.categorias, 'Todas las categorías');
  escuchar(document.getElementById('editorProducto'), 'close', () => editorImagen.cancelar());
  escuchar(document.getElementById('nuevoProducto'), 'click', () => {
    editando = null; prepararFormularioProducto(form);
    document.getElementById('leyendaProducto').textContent = 'Nuevo producto'; Vista.mensaje('', false, 'errorProducto'); Vista.abrir('editorProducto');
  });
  escuchar(document.getElementById('tablaProductos'), 'click', (e) => {
    const b = e.target.closest('button[data-id]'); if (!b) { return; }
    const p = Modelo.producto(b.dataset.id); if (!p) { return; }
    if (b.dataset.accion === 'eliminar') {
      solicitarEliminacionProducto(p, dibujar, '¿Eliminar el producto sin referencias ' + p.nombre + '?', 'Producto eliminado.');
    } else if (b.dataset.accion === 'estado') {
      solicitarEstadoProducto(p, dibujar, '¿Cambiar el estado de ' + p.nombre + '? Para desactivarlo debe tener cero existencias.', 'Estado actualizado.');
    } else {
      editando = p.id;
      prepararFormularioProducto(form, p);
      document.getElementById('leyendaProducto').textContent = 'Editar producto'; Vista.mensaje('', false, 'errorProducto'); Vista.abrir('editorProducto');
    }
  });
  escuchar(form, 'submit', (e) => {
    e.preventDefault();
    return guardarProducto(form, editando, () => { Vista.cerrar('editorProducto'); dibujar(); }, 'Producto guardado en la aplicación del navegador.');
  });
  ['buscarProductos', 'estadoProductos', 'filtroCategoria', 'limiteProductos'].forEach((id) => escuchar(document.getElementById(id), id === 'buscarProductos'? 'input': 'change', () => {
    pagina = 1;
    document.getElementById('mensajeExportacion').textContent = '';
    dibujar();
  }));
  document.querySelectorAll('[data-orden]').forEach((boton) => {
    boton.dataset.etiqueta = boton.textContent;
    escuchar(boton, 'click', () => {
      const columna = boton.dataset.orden;
      ordenAscendente = columna === columnaOrden ? !ordenAscendente : true;
      columnaOrden = columna;
      document.querySelectorAll('[data-orden]').forEach((otro) => {
        otro.closest('th').removeAttribute('aria-sort');
        otro.textContent = otro.dataset.etiqueta;
      });
      boton.closest('th').setAttribute('aria-sort', ordenAscendente ? 'ascending' : 'descending');
      boton.textContent = boton.dataset.etiqueta + (ordenAscendente ? ' ▲' : ' ▼');
      pagina = 1;
      dibujar();
    });
  });
  escuchar(document.getElementById('anteriorProductos'), 'click', () => { pagina -= 1; dibujar(); });
  escuchar(document.getElementById('siguienteProductos'), 'click', () => { pagina += 1; dibujar(); });
  escuchar(document.getElementById('exportarProductos'), 'click', exportarCsv);
  escuchar(document, 'datosDemoSincronizados', dibujar);
  dibujar();
  }
  function iniciarInventario() {
  if (!puedeIniciarPagina()) { return; }
  const form = document.getElementById('formAjuste');
  function dibujar() {
    Vista.tabla('tablaStock', filtrar(Modelo.listar('productos'), document.getElementById('buscarStock').value), ['nombre', 'categoria', 'cantidad', (p) => p.activo? 'Activo': 'Inactivo']);
    const q = Modelo.normalizar(document.getElementById('buscarHistorial').value);
    const lista = Modelo.listar('movimientos').filter((m) => Modelo.normalizar(m.nombre + ' ' + m.tipo + ' ' + m.motivo).includes(q));
    Vista.tabla('tablaHistorial', lista, [(m) => new Date(m.fecha).toLocaleString('es-CO'), 'nombre', 'tipo', 'variacion', 'anterior', 'posterior', 'motivo']);
    document.getElementById('contadorMovimientos').textContent = lista.length + ' movimientos. Las cantidades iniciales provienen de los seis ejemplos.';
    Vista.opciones('productoAjuste', Modelo.listar('productos').filter((p) => p.activo));
  }
  escuchar(document.getElementById('nuevoAjuste'), 'click', () => { form.reset(); Vista.mensaje('', false, 'errorAjuste'); Vista.abrir('editorAjuste'); });
  escuchar(form, 'submit', (e) => { e.preventDefault(); intentar(() => { const d = Vista.valores(form); Modelo.ajustar(d.productoId, d.variacion, d.motivo); Vista.cerrar('editorAjuste'); dibujar(); Vista.mensaje('Ajuste guardado; todas las páginas consultarán esta misma cantidad.'); }, 'errorAjuste'); });
  escuchar(document.getElementById('buscarStock'), 'input', dibujar);
  escuchar(document.getElementById('buscarHistorial'), 'input', dibujar);
  escuchar(document, 'datosDemoSincronizados', dibujar);
  dibujar();
  }
  // El inicio muestra el catálogo público y coordina la búsqueda y el contacto.
  function iniciarInicio() {
    if (!puedeIniciarPagina()) { return; }
    const menu = document.querySelector?.('.menu-global');
    if (menu) {
      const retirarPanel = () => menu.querySelector('a[href="admin.html"]')?.remove();
      retirarPanel();
      // El menú compartido puede reconstruirse cuando cambia la sesión.
      if (typeof MutationObserver === 'function') {
        const observadorMenu = new MutationObserver(retirarPanel);
        observadorMenu.observe(menu, {childList: true});
        document.addEventListener('accesoRevocado', () => observadorMenu.disconnect(), {once: true});
      }
    }
    let categoria = 'Todas';
    const preciosUSD = PreciosUSD.crear(document.getElementById('estadoTasaInicio'), dibujar);
    Vista.dibujarFiltros(Modelo.categorias);
    function dibujar() {
      if (!puedeIniciarPagina()) { return; }
      const productos = Modelo.listar('productos').filter((p) => p.activo);
      const consulta = Modelo.normalizar(document.getElementById('buscar').value);
      const lista = productos.filter((p) => (categoria === 'Todas' || p.categoria === categoria) && Modelo.normalizar(p.nombre + ' ' + p.id).includes(consulta));
      Vista.dibujarTarjetas(lista, null, null, Modelo.imagenes);
      preciosUSD.agregar('tarjetasInicio', lista);
      Vista.dibujarResultados(lista, categoria); Vista.dibujarResumen(Modelo.resumen()); Vista.dibujarIndicadores(productos, Modelo.sesionActual());
    }
    escuchar(document.getElementById('buscar'), 'input', dibujar);
    escuchar(document.getElementById('filtros'), 'click', (evento) => { const boton = evento.target.closest('[data-categoria]'); if (boton) { categoria = boton.dataset.categoria; dibujar(); } });
    escuchar(document, 'datosDemoSincronizados', dibujar);
    escuchar(document.getElementById('formContacto'), 'submit', (evento) => {
      evento.preventDefault(); const contacto = evento.currentTarget;
      if (!contacto.reportValidity()) { return; }
      mensaje('Gracias, ' + contacto.elements.namedItem('nombre').value.trim() + '. No se envió ni guardó ningún dato.', false, 'confirmacionContacto');
      mensaje('', false, 'errorContacto'); contacto.reset();
    });
    dibujar();
    preciosUSD.cargar();
  }
  // Coordina el formulario; el modelo valida y guarda la cuenta y su perfil.
  function iniciarRegistro() {
    if (!puedeIniciarPagina()) { return; }
    const formulario = document.getElementById('formRegistro');
    const boton = document.getElementById('crearCuentaCliente');
    let enviando = false;
    escuchar(formulario, 'submit', async (evento) => {
      evento.preventDefault();
      if (enviando || !formulario.reportValidity()) { return; }
      enviando = true;
      boton.disabled = true;
      formulario.setAttribute('aria-busy', 'true');
      mensaje('', false, 'errorRegistro');
      mensaje('', false, 'estadoRegistro');
      try {
        await Modelo.registrarCliente(valores(formulario));
        formulario.reset();
        mensaje('Cuenta creada. Ya puedes iniciar sesión.', false, 'estadoRegistro');
      } catch (error) {
        mensaje(error.message || 'No fue posible crear la cuenta. Intenta de nuevo.', true, 'errorRegistro');
      } finally {
        enviando = false;
        boton.disabled = false;
        formulario.removeAttribute('aria-busy');
      }
    });
  }
  return {iniciarModulo, escuchar, confirmar, filtrar, puedeIniciarPagina, iniciarInicio, iniciarProductos, iniciarInventario, iniciarComun, iniciarPersonas, iniciarDocumentos, iniciarRegistro, iniciarHistorialVentaEmpleado};
})();
