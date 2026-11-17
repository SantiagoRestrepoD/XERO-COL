'use strict';

// Comparte la presentación de la tasa entre Inicio y Catálogo.
const PreciosUSD = (() => {
  function crear(estado, actualizar) {
    let tasaUSD = null;
    function agregar(idContenedor, productos) {
      if (tasaUSD === null) { return; }
      const tarjetas = document.querySelectorAll('#' + idContenedor + ' .tarjeta');
      productos.forEach((producto, indice) => {
        const precio = Number(producto.precio);
        const precioCOP = tarjetas[indice]?.querySelector('.tarjeta__precio');
        if (!Number.isFinite(precio) || !precioCOP) { return; }
        const precioUSD = document.createElement('p');
        precioUSD.textContent = 'Aprox. ' + new Intl.NumberFormat('es-CO', {
          style: 'currency', currency: 'USD'
        }).format(precio * tasaUSD) + ' USD';
        precioCOP.insertAdjacentElement('afterend', precioUSD);
      });
    }
    async function cargar() {
      estado.textContent = 'Cargando tasa de cambio...';
      try {
        tasaUSD = await obtenerTasaUSD();
        estado.textContent = 'Precios aproximados: 1 COP = ' +
          new Intl.NumberFormat('es-CO', { maximumFractionDigits: 8 }).format(tasaUSD) + ' USD.';
        actualizar();
      } catch (error) {
        estado.textContent = 'No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.';
      }
    }
    return {agregar, cargar};
  }
  return {crear};
})();
