'use strict';
// Entrada pequeña: las páginas conservan sus inicializadores específicos.
document.addEventListener('DOMContentLoaded', Controlador.iniciarComun);

document.addEventListener('DOMContentLoaded', () => {
  // Los selectores son obligatorios según las validaciones existentes del modelo.
  ['categoriaFormulario', 'imagenFormulario', 'productoAjuste', 'productoLinea'].forEach((id) => {
    const campo = document.getElementById(id);
    if (campo) { campo.required = true; }
  });

  function nombreCampo(campo) {
    const etiqueta = campo.labels && campo.labels[0];
    if (!etiqueta) { return campo.getAttribute('aria-label') || campo.name || 'campo'; }
    return Array.from(etiqueta.childNodes)
      .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
      .map((nodo) => nodo.textContent).join(' ').replace(/\s*\*\s*/g, ' ').trim() || campo.name;
  }

  function validarCampo(campo) {
    if (!campo.willValidate) { return ''; }
    if (document.body.dataset.pagina === 'admin-clientes' && campo.form?.id === 'formPersona') {
      const entrada = Object.fromEntries(new FormData(campo.form));
      return Modelo.validarCliente(entrada).errores[campo.name] || '';
    }
    if (document.body.dataset.pagina === 'admin-empleados' && campo.form?.id === 'formPersona') {
      if (campo.id === 'telefonoPersona') { return Modelo.validarTelefono(campo.value); }
      if (campo.id === 'correoPersona') { return Modelo.validarCorreo(campo.value); }
    }
    const nombre = nombreCampo(campo).toLowerCase();
    const valor = campo.value;
    const texto = campo.type === 'password' ? valor : valor.trim();
    if (campo.required && !texto) {
      return campo.tagName === 'SELECT' ? 'Selecciona ' + nombre + '.' : 'Completa ' + nombre + '.';
    }
    if (!texto) { return ''; }
    if (campo.validity.badInput) { return 'Escribe un número válido en ' + nombre + '.'; }
    if (campo.validity.typeMismatch) { return 'Escribe un valor válido para ' + nombre + '.'; }
    if (campo.validity.rangeUnderflow || campo.validity.rangeOverflow) {
      return 'El valor de ' + nombre + ' debe estar entre ' + campo.min + ' y ' + campo.max + '.';
    }
    if (campo.validity.stepMismatch) { return 'Escribe un número entero válido en ' + nombre + '.'; }
    if (campo.validity.patternMismatch) { return 'El formato de ' + nombre + ' no es válido.'; }
    const minimo = campo.minLength;
    const maximo = campo.maxLength;
    if (minimo >= 0 && texto.length < minimo) { return nombre + ' debe tener al menos ' + minimo + ' caracteres.'; }
    if (maximo >= 0 && texto.length > maximo) { return nombre + ' debe tener máximo ' + maximo + ' caracteres.'; }
    if (campo.id === 'nombreFormulario' && [...Modelo.normalizar(texto)].length < 3) {
      return 'El nombre debe tener de 3 a 60 caracteres normalizados.';
    }
    if (campo.id === 'precioFormulario' || campo.id === 'precioLinea') {
      if (!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(texto) || Number(texto) > 9999999999.99) {
        return 'El precio debe ser un número entre 0 y 9999999999.99, sin separadores y con hasta dos decimales.';
      }
    }
    if (campo.id === 'variacionAjuste' && Number(texto) === 0) {
      return 'La variación debe ser distinta de cero.';
    }
    if (campo.id === 'usuarioCuenta' && !/^[a-z0-9][a-z0-9._-]{2,59}$/.test(Modelo.normalizar(texto))) {
      return 'El usuario debe tener de 3 a 60 caracteres sin espacios; usa letras, números, punto, guion o guion bajo.';
    }
    if (campo.id === 'confirmarClaveCuenta' && valor !== campo.form.elements.namedItem('clave').value) {
      return 'Las contraseñas no coinciden.';
    }
    if (!campo.validity.valid) { return 'Revisa el valor de ' + nombre + '.'; }
    return '';
  }

  let ultimoFormularioEnviado = null;
  document.querySelectorAll('form').forEach((formulario) => {
    const errores = new Map();
    const erroresDelModelo = new Map();
    const resumen = document.createElement('p');
    resumen.id = 'resumenErrores-' + formulario.id;
    resumen.setAttribute('role', 'alert');
    resumen.className = 'mensaje error';
    resumen.hidden = true;
    formulario.prepend(resumen);
    formulario.noValidate = true;

    function actualizarResumen() {
      resumen.hidden = errores.size === 0;
      resumen.textContent = errores.size ? 'Revisa estos campos: ' + Array.from(errores.keys()).map(nombreCampo).join(', ') + '.' : '';
    }

    function mostrarError(campo, texto) {
      const id = 'errorCampo-' + formulario.id + '-' + campo.id;
      let aviso = document.getElementById(id);
      if (!aviso) {
        aviso = document.createElement('span');
        aviso.id = id;
        aviso.className = 'mensaje error formulario__error';
        if (document.body.dataset.pagina === 'admin-clientes' && formulario.id === 'formPersona') {
          aviso.setAttribute('aria-live', 'polite');
        }
        campo.insertAdjacentElement('afterend', aviso);
      }
      aviso.textContent = texto;
      aviso.hidden = false;
      campo.setAttribute('aria-invalid', 'true');
      const descripciones = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!descripciones.includes(id)) { descripciones.push(id); }
      campo.setAttribute('aria-describedby', descripciones.join(' '));
      errores.set(campo, texto);
    }

    function limpiarError(campo) {
      const id = 'errorCampo-' + formulario.id + '-' + campo.id;
      const aviso = document.getElementById(id);
      if (aviso) { aviso.hidden = true; aviso.textContent = ''; }
      campo.removeAttribute('aria-invalid');
      const errorDelModelo = erroresDelModelo.get(campo);
      if (errorDelModelo && errorDelModelo.fuente.textContent === errorDelModelo.texto) {
        errorDelModelo.fuente.textContent = '';
        errorDelModelo.fuente.classList.add('oculto');
        errorDelModelo.fuente.classList.remove('error');
      }
      erroresDelModelo.delete(campo);
      const descripciones = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter((valor) => valor && valor !== id);
      if (descripciones.length) { campo.setAttribute('aria-describedby', descripciones.join(' ')); }
      else { campo.removeAttribute('aria-describedby'); }
      errores.delete(campo);
    }

    function revisarSiMarcado(campo) {
      if (!errores.has(campo)) { return; }
      const texto = validarCampo(campo);
      if (texto) { mostrarError(campo, texto); } else { limpiarError(campo); }
      actualizarResumen();
    }

    formulario.addEventListener('submit', (evento) => {
      let primerError = null;
      Array.from(formulario.elements).forEach((campo) => {
        if (!campo.id || !('validity' in campo)) { return; }
        const texto = validarCampo(campo);
        if (texto) { mostrarError(campo, texto); primerError ||= campo; }
        else { limpiarError(campo); }
      });
      actualizarResumen();
      if (primerError) {
        ultimoFormularioEnviado = null;
        evento.preventDefault();
        evento.stopImmediatePropagation();
        primerError.focus();
      } else {
        ultimoFormularioEnviado = formulario;
      }
    }, true);

    // Asocia al control solo los errores del modelo cuyo campo es inequívoco.
    const mensajesDelModelo = {
      formProducto: [[/ya existe un producto con ese nombre/i, 'nombreFormulario']],
      formCuenta: [[/ya existe ese usuario de acceso/i, 'usuarioCuenta']],
      formDetalle: [[/ese producto ya está en el documento/i, 'productoLinea']]
    };
    const fuente = formulario.querySelector('[data-error]') ||
      (formulario.id === 'formDetalle' ? document.getElementById('mensajePagina') : null);
    if (fuente && mensajesDelModelo[formulario.id]) {
      const observador = new MutationObserver(() => {
        const texto = fuente.textContent.trim();
        if (ultimoFormularioEnviado !== formulario || !texto || !fuente.classList.contains('error')) { return; }
        const coincidencia = mensajesDelModelo[formulario.id].find(([patron]) => patron.test(texto));
        const campo = coincidencia && document.getElementById(coincidencia[1]);
        if (!campo || !campo.willValidate) { return; }
        mostrarError(campo, texto);
        erroresDelModelo.set(campo, {fuente, texto});
        actualizarResumen();
      });
      observador.observe(fuente, {childList: true, characterData: true, subtree: true});
    }

    ['input', 'change'].forEach((tipo) => formulario.addEventListener(tipo, (evento) => {
      revisarSiMarcado(evento.target);
      if (tipo === 'change' && evento.target.name === 'origenImagen') {
        Array.from(errores.keys()).filter((campo) => !campo.willValidate).forEach(limpiarError);
        actualizarResumen();
      }
      if (evento.target.id === 'claveCuenta') {
        const confirmacion = formulario.elements.namedItem('confirmacion');
        if (confirmacion) { revisarSiMarcado(confirmacion); }
      }
    }));
    formulario.addEventListener('reset', () => {
      Array.from(errores.keys()).forEach(limpiarError);
      actualizarResumen();
    });
  });
});
