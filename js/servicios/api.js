'use strict';

async function obtenerTasaUSD() {
  const controlador = new AbortController();
  let tiempoAgotado = false;
  const temporizador = setTimeout(() => {
    tiempoAgotado = true;
    controlador.abort();
  }, 5000);
  try {
    const respuesta = await fetch('https://open.er-api.com/v6/latest/COP', {signal: controlador.signal});
    if (!respuesta.ok) {
      throw new Error('No fue posible consultar la tasa de cambio.');
    }
    const datos = await respuesta.json();
    if (datos.result !== 'success' || datos.base_code !== 'COP' ||
        !datos.rates || typeof datos.rates !== 'object' || Array.isArray(datos.rates)) {
      throw new Error('La respuesta de la tasa de cambio no es válida.');
    }
    const monedaUSD = Object.entries(datos.rates).find(([codigo]) => codigo === 'USD');
    if (!monedaUSD || typeof monedaUSD[1] !== 'number' ||
        !Number.isFinite(monedaUSD[1]) || monedaUSD[1] <= 0) {
      throw new Error('La tasa de cambio a USD no está disponible.');
    }
    return monedaUSD[1];
  } catch (error) {
    if (tiempoAgotado) {
      throw new Error('No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.');
    }
    throw new Error('No fue posible obtener una tasa de cambio válida.');
  } finally {
    clearTimeout(temporizador);
  }
}
