'use strict';

// Cada elemento conserva su propia URL temporal y la libera al sustituirse.
const ImagenProducto = (() => {
  const estados = new WeakMap();
  const imagenAlternativa = 'img/watch-1.webp';

  function liberar(imagen) {
    const anterior = estados.get(imagen);
    if (anterior && anterior.url) { URL.revokeObjectURL(anterior.url); }
    estados.delete(imagen);
    imagen.onerror = null;
  }

  async function asignar(imagen, referencia, imagenes = []) {
    liberar(imagen);
    const estado = {url: null};
    estados.set(imagen, estado);
    imagen.dataset.imagenReferencia = typeof referencia === 'string' ? referencia : '';
    const alternativa = imagenes[0] || imagenAlternativa;
    function mostrarAlternativa() {
      if (estados.get(imagen) !== estado) { return; }
      if (estado.url) { URL.revokeObjectURL(estado.url); estado.url = null; }
      imagen.onerror = null;
      imagen.src = alternativa;
    }
    imagen.onerror = mostrarAlternativa;
    if (imagenes.includes(referencia)) {
      imagen.src = referencia;
      return;
    }
    if (typeof referencia === 'string' && /^https:\/\//i.test(referencia)) {
      try {
        const url = new URL(referencia);
        if (url.protocol === 'https:' && url.hostname) { imagen.src = url.href; return; }
      } catch (error) { /* La imagen alternativa se muestra si la URL no es válida. */ }
      mostrarAlternativa();
      return;
    }
    if (typeof referencia === 'string' && referencia.startsWith('idb:') && referencia.slice(4).trim()) {
      try {
        const archivo = await ServicioImagenes.obtenerImagen(referencia.slice(4));
        if (estados.get(imagen) !== estado) { return; }
        if (!archivo || !imagen.isConnected) { mostrarAlternativa(); return; }
        estado.url = URL.createObjectURL(archivo);
        imagen.src = estado.url;
      } catch (error) { mostrarAlternativa(); }
      return;
    }
    mostrarAlternativa();
  }

  function liberarContenedor(contenedor) {
    contenedor.querySelectorAll('img[data-imagen-referencia]').forEach(liberar);
  }

  // Al volver desde la caché del navegador se reconstruyen las URLs temporales.
  window.addEventListener('pagehide', () => liberarContenedor(document));
  window.addEventListener('pageshow', (evento) => {
    if (!evento.persisted) { return; }
    document.querySelectorAll('img[data-imagen-referencia]').forEach((imagen) => {
      asignar(imagen, imagen.dataset.imagenReferencia, Modelo.imagenes);
    });
  });
  return {asignar, liberar, liberarContenedor};
})();
