'use strict';

// Los archivos binarios permanecen en IndexedDB; localStorage guarda solo su referencia.
const ServicioImagenes = (() => {
  const nombreBase = 'xeroImagenes';
  const nombreAlmacen = 'imagenes';
  const limiteBytes = 500 * 1024;
  const tiposPermitidos = ['image/webp', 'image/png', 'image/jpeg'];

  function abrirBase() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('El almacenamiento de imágenes no está disponible en este navegador.'));
        return;
      }
      let solicitud;
      try { solicitud = indexedDB.open(nombreBase, 1); }
      catch (error) {
        reject(new Error('No fue posible abrir el almacenamiento de imágenes.'));
        return;
      }
      let terminada = false;
      solicitud.onupgradeneeded = () => {
        const base = solicitud.result;
        if (!base.objectStoreNames.contains(nombreAlmacen)) { base.createObjectStore(nombreAlmacen); }
      };
      solicitud.onblocked = () => {
        terminada = true;
        reject(new Error('El almacenamiento de imágenes está bloqueado por otra pestaña.'));
      };
      solicitud.onerror = () => {
        terminada = true;
        reject(new Error('No fue posible abrir el almacenamiento de imágenes.'));
      };
      solicitud.onsuccess = () => {
        const base = solicitud.result;
        if (terminada) { base.close(); return; }
        base.onversionchange = () => base.close();
        resolve(base);
      };
    });
  }

  async function ejecutar(modo, operacion, mensajeError) {
    const base = await abrirBase();
    return new Promise((resolve, reject) => {
      let transaccion;
      let solicitud;
      try {
        transaccion = base.transaction(nombreAlmacen, modo);
        solicitud = operacion(transaccion.objectStore(nombreAlmacen));
      } catch (error) {
        base.close();
        reject(new Error(mensajeError));
        return;
      }
      transaccion.oncomplete = () => {
        const resultado = solicitud ? solicitud.result : undefined;
        base.close();
        resolve(resultado);
      };
      transaccion.onabort = () => { base.close(); reject(new Error(mensajeError)); };
      transaccion.onerror = () => { base.close(); reject(new Error(mensajeError)); };
    });
  }

  function generarId() {
    if (typeof crypto === 'undefined') { throw new Error('No fue posible crear un identificador seguro para la imagen.'); }
    if (typeof crypto.randomUUID === 'function') { return crypto.randomUUID(); }
    if (typeof crypto.getRandomValues !== 'function') { throw new Error('No fue posible crear un identificador seguro para la imagen.'); }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function validarArchivo(archivo) {
    if (!archivo || typeof archivo.slice !== 'function' || typeof archivo.size !== 'number') {
      throw new Error('Selecciona una imagen para subir.');
    }
    if (archivo.size > limiteBytes) { throw new Error('La imagen no debe superar los 500 KB.'); }
    if (!tiposPermitidos.includes(archivo.type)) { throw new Error('Solo se permiten imágenes WebP, PNG o JPEG.'); }
    let bytes;
    try { bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer()); }
    catch (error) { throw new Error('No fue posible leer el archivo de imagen.'); }
    const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((valor, indice) => bytes[indice] === valor);
    const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.length >= 12 && [82, 73, 70, 70].every((valor, indice) => bytes[indice] === valor) &&
      [87, 69, 66, 80].every((valor, indice) => bytes[indice + 8] === valor);
    if (!((archivo.type === 'image/png' && png) || (archivo.type === 'image/jpeg' && jpeg) || (archivo.type === 'image/webp' && webp))) {
      throw new Error('El contenido del archivo no coincide con un formato de imagen permitido.');
    }
  }

  async function disponible() {
    try {
      const clavePrueba = '__prueba__' + generarId();
      await ejecutar('readwrite', (almacen) => {
        almacen.put(new Blob([]), clavePrueba);
        return almacen.delete(clavePrueba);
      }, 'No fue posible usar el almacenamiento de imágenes.');
      return true;
    } catch (error) { return false; }
  }

  async function guardarImagen(archivo) {
    await validarArchivo(archivo);
    const id = generarId();
    await ejecutar('readwrite', (almacen) => almacen.add(archivo, id),
      'No fue posible guardar la imagen. Comprueba el espacio y los permisos del navegador.');
    return id;
  }

  async function obtenerImagen(id) {
    if (typeof id !== 'string' || !id.trim()) { throw new Error('La referencia de la imagen no es válida.'); }
    const imagen = await ejecutar('readonly', (almacen) => almacen.get(id), 'No fue posible leer la imagen guardada.');
    return imagen ?? null;
  }

  async function eliminarImagen(id) {
    if (typeof id !== 'string' || !id.trim()) { throw new Error('La referencia de la imagen no es válida.'); }
    await ejecutar('readwrite', (almacen) => almacen.delete(id), 'No fue posible eliminar la imagen guardada.');
  }

  async function borrarTodas() {
    await ejecutar('readwrite', (almacen) => almacen.clear(), 'No fue posible borrar las imágenes guardadas.');
  }

  return {disponible, validarArchivo, guardarImagen, obtenerImagen, eliminarImagen, borrarTodas};
})();
