'use strict';
// Controlador de esta página: el modelo comprueba las cuentas y guarda la sesión.
Controlador.iniciarModulo( async () => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  const form = document.getElementById('formLogin');
  const boton = document.getElementById('entrarDemo');
  const clave = document.getElementById('claveLogin');
  let enviando = false;
  try { await Modelo.prepararAccesoDemo(); boton.disabled = false; }
  catch (error) { Vista.mensaje(error.message, true, 'errorLogin'); }
  Controlador.escuchar(document.getElementById('mostrarClave'), 'click', (evento) => {
    const visible = clave.type === 'password';
    clave.type = visible? 'text': 'password';
    evento.currentTarget.setAttribute('aria-pressed', String(visible));
    evento.currentTarget.textContent = visible? 'Ocultar contraseña': 'Mostrar contraseña';
  });
  Controlador.escuchar(form, 'submit', async (evento) => {
    evento.preventDefault();
    if (enviando || !form.reportValidity()) { return; }
    enviando = true; boton.disabled = true; form.setAttribute('aria-busy', 'true');
    Vista.mensaje('', false, 'errorLogin');
    try {
      const resultado = await Modelo.iniciarSesionDemo(form.elements.namedItem('usuario').value, clave.value);
      clave.value = '';
      if (!resultado.valido) { Vista.mensaje(resultado.mensaje, true, 'errorLogin'); clave.focus(); return; }
      location.assign(resultado.destino);
    } catch (error) { clave.value = ''; Vista.mensaje(error.message, true, 'errorLogin'); }
    finally { enviando = false; boton.disabled = false; form.removeAttribute('aria-busy'); }
  });
});
