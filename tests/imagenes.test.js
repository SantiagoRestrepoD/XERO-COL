'use strict';

// Estas pruebas ejecutan el modelo y el servicio reales con almacenamiento aislado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const raiz = path.resolve(__dirname, '..');
const memoria = new Map();
const localStorage = {
  getItem(clave) { return memoria.has(clave) ? memoria.get(clave) : null; },
  setItem(clave, valor) { memoria.set(clave, String(valor)); },
  removeItem(clave) { memoria.delete(clave); }
};
const entorno = vm.createContext({URL, Blob, Uint8Array, crypto: webcrypto, localStorage});
const modeloFuente = fs.readFileSync(path.join(raiz, 'js/modelo/modelo.js'), 'utf8');
const servicioFuente = fs.readFileSync(path.join(raiz, 'js/servicios/imagenes.js'), 'utf8');
vm.runInContext(modeloFuente + '\nglobalThis.modeloPrueba = Modelo;', entorno);
vm.runInContext(servicioFuente + '\nglobalThis.servicioPrueba = ServicioImagenes;', entorno);
const modelo = entorno.modeloPrueba;
const servicio = entorno.servicioPrueba;

function productoConImagen(imagen) {
  return {nombre: 'Reloj de prueba', precio: '150000.00', cantidad: '0',
    categoria: 'Clásicos', imagen};
}

function comprobarImagen(imagen, valido) {
  const resultado = modelo.validar(productoConImagen(imagen));
  assert.equal(resultado.valido, valido, `Resultado inesperado para ${imagen}: ${resultado.mensaje}`);
  if (!valido) { assert.match(resultado.mensaje, /imagen|ilustración|enlace/i); }
}

const pngReal = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'
);

// Se verifica el modelo existente, no una copia de su regla.
test('acepta una URL HTTPS válida', () => comprobarImagen('https://ejemplo.com/reloj.webp', true));
test('rechaza HTTP', () => comprobarImagen('http://ejemplo.com/reloj.webp', false));
test('rechaza javascript:', () => comprobarImagen('javascript:alert(1)', false));
test('rechaza data:', () => comprobarImagen('data:image/png;base64,aGVsbG8=', false));
test('rechaza HTTPS sin host', () => comprobarImagen('https://', false));
test('acepta una referencia IndexedDB con ID', () => comprobarImagen('idb:abc-123', true));
test('rechaza una referencia IndexedDB vacía', () => {
  comprobarImagen('idb:', false);
  comprobarImagen('idb:   ', false);
});
test('acepta las seis ilustraciones originales y rechaza rutas ajenas', () => {
  for (let i = 1; i <= 6; i += 1) { comprobarImagen(`img/watch-${i}.webp`, true); }
  comprobarImagen('img/watch-7.webp', false);
  comprobarImagen('../img/watch-1.webp', false);
});
test('los seis productos anteriores conservan referencias locales válidas', () => {
  const productos = modelo.listar('productos');
  assert.equal(productos.length, 6);
  productos.forEach((producto) => {
    assert.equal(producto.imagen.startsWith('img/'), true);
    assert.equal(modelo.validar({...producto, nombre: 'Reloj de prueba'}).valido, true);
  });
});

test('acepta una imagen PNG con firma y MIME coherentes', async () => {
  await servicio.validarArchivo(new Blob([pngReal], {type: 'image/png'}));
});
test('acepta la ilustración WebP real incluida en el proyecto', async () => {
  const imagen = fs.readFileSync(path.join(raiz, 'img/watch-1.webp'));
  await servicio.validarArchivo(new Blob([imagen], {type: 'image/webp'}));
});
test('acepta un archivo en el límite de 500 KB', async () => {
  const relleno = Buffer.alloc(500 * 1024 - pngReal.length);
  await servicio.validarArchivo(new Blob([pngReal, relleno], {type: 'image/png'}));
});
test('rechaza un archivo de 600 KB', async () => {
  await assert.rejects(servicio.validarArchivo(new Blob([Buffer.alloc(600 * 1024)], {type: 'image/png'})), /500 KB/);
});
test('rechaza un archivo que supera el límite por un byte', async () => {
  await assert.rejects(servicio.validarArchivo(new Blob([Buffer.alloc(500 * 1024 + 1)], {type: 'image/png'})), /500 KB/);
});
test('rechaza un tipo de archivo no permitido', async () => {
  await assert.rejects(servicio.validarArchivo(new Blob([pngReal], {type: 'text/plain'})), /WebP, PNG o JPEG/);
});
test('rechaza un MIME que no coincide con la firma del archivo', async () => {
  await assert.rejects(servicio.validarArchivo(new Blob([pngReal], {type: 'image/jpeg'})), /contenido.*formato/i);
});
test('rechaza un archivo vacío o sin firma de imagen', async () => {
  await assert.rejects(servicio.validarArchivo(new Blob([], {type: 'image/png'})), /contenido.*formato/i);
  await assert.rejects(servicio.validarArchivo(new Blob(['no es una imagen'], {type: 'image/webp'})), /contenido.*formato/i);
});
test('detecta cuando IndexedDB no está disponible', async () => {
  assert.equal(await servicio.disponible(), false);
  await assert.rejects(servicio.obtenerImagen('prueba'), /no está disponible/i);
});
