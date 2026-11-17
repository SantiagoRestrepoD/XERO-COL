'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const archivo = path.join(__dirname, '..', 'js', 'servicios', 'api.js');
const mensajeGeneral = 'No fue posible obtener una tasa de cambio válida.';
const mensajeCatalogo = 'No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.';

// El reloj controlado permite probar cinco segundos sin esperar tiempo real.
function cargarApi(fetchSimulado) {
  let funcionTemporizador;
  let demora;
  let limpio = false;
  const identificador = {};
  const entorno = vm.createContext({
    AbortController,
    fetch: fetchSimulado,
    setTimeout: (funcion, milisegundos) => { funcionTemporizador = funcion; demora = milisegundos; return identificador; },
    clearTimeout: (id) => { assert.equal(id, identificador); limpio = true; }
  });
  vm.runInContext(fs.readFileSync(archivo, 'utf8') + '\n;globalThis.consultar = obtenerTasaUSD;', entorno);
  return {
    consultar: entorno.consultar,
    agotarTiempo: () => { assert.equal(demora, 5000); funcionTemporizador(); },
    limpio: () => limpio,
    demora: () => demora
  };
}

test('consulta la tasa con señal y cancela el temporizador al recibir datos válidos', async () => {
  let url;
  let senal;
  const api = cargarApi(async (destino, opciones) => {
    url = destino;
    senal = opciones.signal;
    return {ok: true, json: async () => ({result: 'success', base_code: 'COP', rates: {USD: 0.0003}})};
  });
  assert.equal(await api.consultar(), 0.0003);
  assert.equal(url, 'https://open.er-api.com/v6/latest/COP');
  assert.ok(senal instanceof AbortSignal);
  assert.equal(senal.aborted, false);
  assert.equal(api.demora(), 5000);
  assert.equal(api.limpio(), true);
});

test('aborta la petición a los cinco segundos y devuelve el mensaje del catálogo', async () => {
  let senal;
  const api = cargarApi((url, opciones) => {
    senal = opciones.signal;
    return new Promise((resolve, reject) => {
      senal.addEventListener('abort', () => reject(new Error('Petición abortada')), {once: true});
    });
  });
  const resultado = api.consultar();
  api.agotarTiempo();
  await assert.rejects(resultado, (error) => error.message === mensajeCatalogo);
  assert.equal(senal.aborted, true);
  assert.equal(api.limpio(), true);
});

test('el límite también cubre la lectura pendiente del cuerpo JSON', async () => {
  let senal;
  let avisarLectura;
  const lecturaIniciada = new Promise((resolve) => { avisarLectura = resolve; });
  const api = cargarApi(async (url, opciones) => {
    senal = opciones.signal;
    return {ok: true, json: () => new Promise((resolve, reject) => {
      senal.addEventListener('abort', () => reject(new Error('Lectura abortada')), {once: true});
      avisarLectura();
    })};
  });
  const resultado = api.consultar();
  await lecturaIniciada;
  api.agotarTiempo();
  await assert.rejects(resultado, (error) => error.message === mensajeCatalogo);
  assert.equal(api.limpio(), true);
});

test('respuesta HTTP incorrecta conserva el error público anterior', async () => {
  const api = cargarApi(async () => ({ok: false}));
  await assert.rejects(api.consultar(), (error) => error.message === mensajeGeneral);
  assert.equal(api.limpio(), true);
});

test('respuestas inválidas conservan el error público anterior', async () => {
  for (const datos of [
    {result: 'error', base_code: 'COP', rates: {USD: 0.0003}},
    {result: 'success', base_code: 'USD', rates: {USD: 0.0003}},
    {result: 'success', base_code: 'COP', rates: {USD: 0}},
    {result: 'success', base_code: 'COP', rates: {USD: '0.0003'}}
  ]) {
    const api = cargarApi(async () => ({ok: true, json: async () => datos}));
    await assert.rejects(api.consultar(), (error) => error.message === mensajeGeneral);
    assert.equal(api.limpio(), true);
  }
});

test('fallo de red conserva el error público anterior y limpia el temporizador', async () => {
  const api = cargarApi(async () => { throw new Error('Sin conexión'); });
  await assert.rejects(api.consultar(), (error) => error.message === mensajeGeneral);
  assert.equal(api.limpio(), true);
});
