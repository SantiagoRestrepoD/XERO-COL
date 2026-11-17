'use strict';
// Única fuente y única lectura/escritura del almacenamiento de esta aplicación.
const Modelo = (() => {
  const CLAVE = 'xeroUniversidadDemoV1';
  const productosIniciales = [
  {
    "id": "demo-01",
    "nombre": "Demo Horizonte",
    "categoria": "Clásicos",
    "precio": "189900.00",
    "cantidad": 42,
    "ventas": 95,
    "imagen": "img/watch-1.webp",
    "activo": true
  },
  {
    "id": "demo-02",
    "nombre": "Demo Trazo",
    "categoria": "Clásicos",
    "precio": "149900.00",
    "cantidad": 0,
    "ventas": 81,
    "imagen": "img/watch-2.webp",
    "activo": true
  },
  {
    "id": "demo-03",
    "nombre": "Demo Intervalo",
    "categoria": "Deportivos",
    "precio": "249900.00",
    "cantidad": 16,
    "ventas": 72,
    "imagen": "img/watch-3.webp",
    "activo": true
  },
  {
    "id": "demo-04",
    "nombre": "Demo Orbita",
    "categoria": "Urbanos",
    "precio": "219900.00",
    "cantidad": 12,
    "ventas": 61,
    "imagen": "img/watch-4.webp",
    "activo": true
  },
  {
    "id": "demo-05",
    "nombre": "Demo Pulso",
    "categoria": "Urbanos",
    "precio": "179900.00",
    "cantidad": 0,
    "ventas": 55,
    "imagen": "img/watch-5.webp",
    "activo": true
  },
  {
    "id": "demo-06",
    "nombre": "Demo Umbral",
    "categoria": "Deportivos",
    "precio": "289900.00",
    "cantidad": 8,
    "ventas": 48,
    "imagen": "img/watch-6.webp",
    "activo": true
  }
];
  const categorias = ['Clásicos', 'Deportivos', 'Urbanos'];
  const imagenes = Array.from({length: 6}, (_, i) => `img/watch-${i + 1}.webp`);
  const copiar = (valor) => JSON.parse(JSON.stringify(valor));
  const idNuevo = () => crypto.randomUUID? crypto.randomUUID(): 'demo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const normalizar = (texto) => String(texto?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  function inicial() {
    return {
      version: 1,
      productos: copiar(productosIniciales),
      clientes: [
        {id: 'cliente-demo-01', nombre: 'Cliente Demo Uno', correo: 'cliente.uno@example.com', telefono: '3000000001', direccion: 'Calle Ejemplo 101', ciudad: 'Villa Ejemplo', cedula: 'No indicado', activo: true},
        {id: 'cliente-demo-02', nombre: 'Cliente Demo Dos', correo: 'cliente.dos@example.com', telefono: '3000000002', direccion: 'Calle Ejemplo 102', ciudad: 'Villa Ejemplo', cedula: 'No indicado', activo: true},
        {id: 'cliente-demo-03', nombre: 'Cliente Demo Tres', correo: 'cliente.tres@example.com', telefono: '3000000003', direccion: 'Calle Ejemplo 103', ciudad: 'Villa Ejemplo', cedula: 'No indicado', activo: true}
      ],
      empleados: [
        {id: 'empleado-demo-01', nombre: 'Empleado Demo Uno', correo: 'empleado.uno@example.com', telefono: '3000000004', direccion: '', activo: true}
      ],
      compras: [],
      ventas: [
        {
          id: 'venta-demo-01', clienteId: 'cliente-demo-01', contacto: 'Cliente Demo Uno',
          observaciones: '', estado: 'confirmado', fecha: '2026-11-03T15:00:00.000Z',
          detalles: [
            {id: 'linea-demo-01', productoId: 'demo-01', nombre: 'Demo Horizonte', cantidad: 1, centavos: 18990000},
            {id: 'linea-demo-02', productoId: 'demo-03', nombre: 'Demo Intervalo', cantidad: 1, centavos: 24990000}
          ],
          ventasContabilizadas: [{productoId: 'demo-01', cantidad: 1}, {productoId: 'demo-03', cantidad: 1}]
        },
        {
          id: 'venta-demo-02', clienteId: 'cliente-demo-02', contacto: 'Cliente Demo Dos',
          observaciones: '', estado: 'confirmado', fecha: '2026-11-05T15:00:00.000Z',
          detalles: [
            {id: 'linea-demo-03', productoId: 'demo-04', nombre: 'Demo Orbita', cantidad: 1, centavos: 21990000},
            {id: 'linea-demo-04', productoId: 'demo-06', nombre: 'Demo Umbral', cantidad: 1, centavos: 28990000}
          ],
          ventasContabilizadas: [{productoId: 'demo-04', cantidad: 1}, {productoId: 'demo-06', cantidad: 1}]
        }
      ],
      movimientos: [], tema: 'claro', rol: null
    };
  }
  let estado;
  let problema = '';
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === null) {
      estado = inicial();
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } else {
      estado = JSON.parse(guardado);
      if (estado.version !== 1 || !['productos', 'clientes', 'empleados', 'compras', 'ventas', 'movimientos'].every((k) => Array.isArray(estado[k]))) {
        throw new Error('Formato no compatible.');
      }
    }
  } catch {
    estado = {version: 1, productos: [], clientes: [], empleados: [], compras: [], ventas: [], movimientos: [], tema: 'claro', rol: null};
    problema = 'No se pudo leer o guardar la aplicación. No se han repuesto registros. Revisa el almacenamiento o usa Restablecer datos.';
  }
  // Guardar primero; solo sustituir el estado en memoria cuando la escritura funciona.
  function cambiar(trabajo) {
    sincronizar();
    if (problema) { throw new Error(problema); }
    const siguiente = copiar(estado);
    const resultado = trabajo(siguiente);
    try { localStorage.setItem(CLAVE, JSON.stringify(siguiente)); }
    catch { throw new Error('No se pudo guardar. Comprueba el espacio y los permisos de almacenamiento del navegador.'); }
    estado = siguiente;
    return copiar(resultado?? null);
  }
  function cantidad(valor, minimo = 0) {
    if (String(valor).trim() === '') { throw new Error('Indica una cantidad.'); }
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < minimo || numero > 500) { throw new Error(`La cantidad debe ser entera entre ${minimo} y 500.`); }
    return numero;
  }
  // El dinero se calcula en centavos enteros, sin sumar números decimales.
  function centavos(valor) {
    const texto = String(valor).trim();
    if (!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(texto)) { throw new Error('Precio: número sin separadores, desde 0, con máximo dos decimales.'); }
    const [entero, decimal = ''] = texto.split('.');
    const total = Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
    if (total > 999999999999) { throw new Error('El importe supera el límite de la aplicación.'); }
    return total;
  }
  function buscar(lista, id) {
    const registro = lista.find((p) => p.id === id);
    if (!registro) { throw new Error('El registro ya no está disponible.'); }
    return registro;
  }
  // Único lugar que modifica existencias; valida TODAS las variaciones antes de aplicarlas.
  function moverExistencias(datos, variaciones, tipo, motivo, documentoId = null) {
    const totales = new Map();
    variaciones.forEach((v) => totales.set(v.id, (totales.get(v.id)?? 0) + v.variacion));
    for (const [id, variacion] of totales) {
      const producto = buscar(datos.productos, id);
      if (!producto.activo || !Number.isInteger(variacion) || producto.cantidad + variacion < 0 || producto.cantidad + variacion > 500) {
        throw new Error('La operación requiere productos activos y existencias finales entre 0 y 500. No se aplicó ningún cambio.');
      }
    }
    for (const [id, variacion] of totales) {
      const producto = buscar(datos.productos, id);
      const anterior = producto.cantidad;
      producto.cantidad = anterior + variacion;
      datos.movimientos.unshift({id: idNuevo(), productoId: id, nombre: producto.nombre, tipo, variacion, anterior, posterior: producto.cantidad, motivo, documentoId, fecha: new Date().toISOString()});
    }
  }
  // Permite las ilustraciones locales, enlaces HTTPS y referencias de imágenes guardadas.
  function imagenPermitida(imagen) {
    if (typeof imagen !== 'string') { return false; }
    if (imagenes.includes(imagen)) { return true; }
    if (imagen.startsWith('idb:')) { return imagen.slice(4).trim().length > 0; }
    if (!/^https:\/\//i.test(imagen)) { return false; }
    try {
      const url = new URL(imagen);
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch (error) { return false; }
  }
  // Retornos tempranos: reglas compartidas por el laboratorio y la administración.
  function validar(entrada, idActual = null) {
    const nombre = String(entrada.nombre?? '').trim().replace(/\s+/g, ' ');
    if (!nombre) { return {valido: false, mensaje: 'El nombre es obligatorio.'}; }
    if ([...normalizar(nombre)].length < 3 || [...normalizar(nombre)].length > 60) { return {valido: false, mensaje: 'El nombre debe tener de 3 a 60 caracteres normalizados.'}; }
    const numero = Number(entrada.precio);
    if (String(entrada.precio?? '').trim() === '' || !Number.isFinite(numero) || numero < 0) { return {valido: false, mensaje: 'El precio es obligatorio, numérico, finito y no negativo.'}; }
    if (!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(String(entrada.precio).trim()) || numero > 9999999999.99) { return {valido: false, mensaje: 'Precio: de 0 a 9999999999.99 COP, sin separadores y con hasta dos decimales.'}; }
    if (estado.productos.some((p) => p.id !== idActual && normalizar(p.nombre) === normalizar(nombre))) { return {valido: false, mensaje: 'Ya existe un producto con ese nombre.'}; }
    const stock = Number(entrada.cantidad);
    if (String(entrada.cantidad?? '').trim() === '' || !Number.isInteger(stock) || stock < 0 || stock > 500) { return {valido: false, mensaje: 'La cantidad debe ser entera entre 0 y 500.'}; }
    if (!categorias.includes(entrada.categoria)) { return {valido: false, mensaje: 'Elige una categoría permitida.'}; }
    if (!imagenPermitida(entrada.imagen)) { return {valido: false, mensaje: 'Elige una ilustración, un enlace HTTPS válido o una imagen subida.'}; }
    return {valido: true, mensaje: '', datos: {nombre, precio: (centavos(entrada.precio) / 100).toFixed(2), cantidad: stock, categoria: entrada.categoria, imagen: entrada.imagen}};
  }
  // La vista puede mostrar validar() sin depender de excepciones; guardar vuelve a verificar.
  function guardarProducto(entrada, id = null) {
    exigirMutacionProducto();
    const resultado = validar(entrada, id);
    if (!resultado.valido) { throw new Error(resultado.mensaje); }
    return cambiar((datos) => {
      const {cantidad: stock,...campos} = resultado.datos;
      if (id) {
        const producto = buscar(datos.productos, id);
        // Editar datos del producto no modifica existencias; los ajustes se hacen en Inventario.
        Object.assign(producto, campos);
        return producto;
      }
      const producto = {id: idNuevo(),...campos, cantidad: 0, ventas: 0, activo: true};
      datos.productos.push(producto);
      if (stock !== 0) { moverExistencias(datos, [{id: producto.id, variacion: stock}], 'Alta ', 'Cantidad inicial'); }
      return producto;
    });
  }
  // Las referencias históricas se conservan incluso en documentos anulados o borradores.
  function validarEliminacion(id) {
    exigirMutacionProducto();
    const producto = estado.productos.find((p) => p.id === id);
    if (!producto) { return {valido: false, mensaje: 'El producto ya no está disponible.'}; }
    const referencias = estado.movimientos.some((m) => m.productoId === id) || [...estado.compras,...estado.ventas].some((d) => d.detalles.some((linea) => linea.productoId === id));
    if (referencias) { return {valido: false, mensaje: 'Tiene referencias en compras, ventas o historial. No se puede eliminar: utiliza Baja lógica; si conserva existencias, ajústalas primero a cero.'}; }
    if (producto.cantidad !== 0) { return {valido: false, mensaje: 'Solo se elimina un producto sin referencias y con cantidad cero.'}; }
    return {valido: true, mensaje: ''};
  }
  // Eliminación física exclusivamente de datos sin relaciones.
  function eliminarProducto(id) {
    exigirMutacionProducto();
    const resultado = validarEliminacion(id);
    if (!resultado.valido) { throw new Error(resultado.mensaje); }
    return cambiar((datos) => { datos.productos = datos.productos.filter((p) => p.id !== id); });
  }
  function cambiarActivo(tipo, id) {
    if (tipo === 'productos') { exigirMutacionProducto(); } else { exigirAdministrador(); }
    return cambiar((datos) => {
      if (!['productos', 'clientes', 'empleados'].includes(tipo)) { throw new Error('Tipo no permitido.'); }
      const registro = buscar(datos[tipo], id);
      if (tipo === 'productos' && registro.activo && registro.cantidad !== 0) { throw new Error('Ajusta las existencias a cero antes de desactivar el producto.'); }
      registro.activo = !registro.activo;
    });
  }
  function validarTelefono(valor, obligatorio = false) {
    const telefono = String(valor ?? '');
    if (!telefono.trim()) { return obligatorio ? 'El teléfono es obligatorio.' : ''; }
    return /^[0-9]{7,10}$/.test(telefono) ? '' : 'El teléfono debe contener entre 7 y 10 dígitos.';
  }
  function validarCorreo(valor) {
    const correo = String(valor ?? '').trim();
    if (!correo) { return ''; }
    return correo.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
      ? '' : 'Escribe un correo válido de hasta 120 caracteres.';
  }
  // Valida únicamente el perfil de cliente; no modifica la cuenta de acceso.
  function validarCliente(entrada) {
    const nombre = String(entrada.nombre ?? '').trim();
    const telefono = String(entrada.telefono ?? '');
    const opcional = (valor) => {
      const texto = String(valor ?? '').trim();
      return texto === 'No indicado' ? '' : texto;
    };
    const direccion = opcional(entrada.direccion);
    const ciudad = opcional(entrada.ciudad).normalize('NFC');
    const cedulaOriginal = String(entrada.cedula ?? '');
    const cedula = cedulaOriginal.trim() === 'No indicado' ? '' : cedulaOriginal;
    const correo = opcional(entrada.correo);
    const errores = {};
    if (nombre.length < 2 || nombre.length > 150) {
      errores.nombre = 'Escribe un nombre de 2 a 150 caracteres.';
    }
    const errorTelefono = validarTelefono(telefono, true);
    if (errorTelefono) { errores.telefono = errorTelefono; }
    if (direccion && ([...direccion].length < 5 || [...direccion].length > 120)) {
      errores.direccion = 'La dirección debe tener entre 5 y 120 caracteres.';
    }
    if (ciudad && ([...ciudad].length < 2 || [...ciudad].length > 60 || !/^[\p{L} ]+$/u.test(ciudad))) {
      errores.ciudad = 'La ciudad debe tener entre 2 y 60 letras y espacios.';
    }
    if (cedula.trim() && !/^[0-9]{6,10}$/.test(cedula)) {
      errores.cedula = 'La cédula debe contener entre 6 y 10 dígitos.';
    }
    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) { errores.correo = errorCorreo; }
    return {
      valido: Object.keys(errores).length === 0,
      errores,
      datos: {nombre, telefono, direccion: direccion || 'No indicado', ciudad: ciudad || 'No indicado',
        cedula: cedula.trim() ? cedula : 'No indicado', correo: correo || 'No indicado'}
    };
  }
  function guardarPersona(tipo, entrada, id = null) {
    exigirAdministrador();
    return cambiar((datos) => {
      if (!['clientes', 'empleados'].includes(tipo)) { throw new Error('Tipo no permitido.'); }
      let campos;
      if (tipo === 'clientes') {
        const resultado = validarCliente(entrada);
        if (!resultado.valido) { throw new Error(Object.values(resultado.errores)[0]); }
        campos = resultado.datos;
      } else {
        const nombre = String(entrada.nombre?? '').trim();
        const correo = String(entrada.correo?? '').trim();
        const telefono = String(entrada.telefono?? '');
        const direccion = '';
        if (nombre.length < 2 || nombre.length > 150) { throw new Error('Escribe un nombre de 2 a 150 caracteres.'); }
        const errorCorreo = validarCorreo(correo);
        const errorTelefono = validarTelefono(telefono);
        if (errorCorreo) { throw new Error(errorCorreo); }
        if (errorTelefono) { throw new Error(errorTelefono); }
        campos = {nombre, correo, telefono: telefono.trim(), direccion};
      }
      if (id) { return Object.assign(buscar(datos[tipo], id), campos); }
      const persona = {id: idNuevo(),...campos, activo: true};
      datos[tipo].push(persona);
      return persona;
    });
  }
  function ajustar(id, valor, motivo) {
    exigirAdministrador();
    return cambiar((datos) => {
      const variacion = Number(valor);
      if (String(valor).trim() === '' || !Number.isInteger(variacion) || variacion === 0 || Math.abs(variacion) > 500) { throw new Error('La variación debe ser entera entre -500 y 500, distinta de cero.'); }
      if (motivo.trim().length < 3 || motivo.trim().length > 500) { throw new Error('Escribe un motivo de 3 a 500 caracteres.'); }
      moverExistencias(datos, [{id, variacion}], 'Ajuste ', motivo.trim());
    });
  }
  function listaDocumentos(datos, tipo) {
    if (!['compras', 'ventas'].includes(tipo)) { throw new Error('Documento no permitido.'); }
    return datos[tipo];
  }
  // El empleado solo crea ventas y opera sus propios borradores.
  function autorizarDocumento(tipo, accion, documentoId = null) {
    const acceso = evaluarAcceso();
    if (acceso.permitido && acceso.requerido === 'administrador' && acceso.sesion?.rol === 'administrador') {
      return {identidad: acceso.identidad, usuarioId: acceso.sesion.id, rol: 'administrador'};
    }
    if (acceso.permitido && acceso.pagina === 'empleado.html' && acceso.sesion?.rol === 'empleado' && tipo === 'ventas') {
      const venta = documentoId ? estado.ventas.find((doc) => doc.id === documentoId) : null;
      if (venta && venta.empleadoId !== acceso.sesion.id) {
        throw new Error('Solo puedes modificar las ventas que creaste.');
      }
      if (accion === 'quitar') {
        if (!venta) { throw new Error('El registro ya no está disponible.'); }
        if (venta.estado !== 'borrador') { throw new Error('Solo puedes quitar líneas de borradores abiertos.'); }
        return {identidad: acceso.identidad, usuarioId: acceso.sesion.id, rol: 'empleado'};
      }
      if (['crear', 'agregar', 'confirmar'].includes(accion)) {
        return {identidad: acceso.identidad, usuarioId: acceso.sesion.id, rol: 'empleado'};
      }
    }
    throw new Error('Tu perfil no permite realizar esta operación.');
  }
  function comprobarAutorizacionEnDatos(datos, autorizacion) {
    const sesion = datos.sesionDemo;
    const cuenta = (Array.isArray(datos.usuariosDemo) ? datos.usuariosDemo : []).find((item) => item.id === sesion?.usuarioId);
    const identidad = sesion ? sesion.id ?? `${sesion.usuarioId}:${sesion.iniciadaEn}:${sesion.versionAcceso ?? 1}` : null;
    if (!sesion || identidad !== autorizacion.identidad || sesion.usuarioId !== autorizacion.usuarioId ||
        sesion.rol !== autorizacion.rol || !cuenta || cuenta.rol !== autorizacion.rol || cuenta.activo === false ||
        (cuenta.versionAcceso ?? 1) !== (sesion.versionAcceso ?? 1) ||
        (cuenta.empleadoId && !datos.empleados.some((perfil) => perfil.id === cuenta.empleadoId && perfil.activo)) ||
        (cuenta.clienteId && !datos.clientes.some((perfil) => perfil.id === cuenta.clienteId && perfil.activo))) {
      throw new Error('La sesión cambió. Inicia sesión de nuevo para continuar.');
    }
  }
  function comprobarBorradorPropio(doc, autorizacion) {
    if (autorizacion.rol === 'empleado' && doc.empleadoId !== autorizacion.usuarioId) {
      throw new Error('Solo puedes modificar las ventas que creaste.');
    }
  }
  function guardarDocumento(tipo, entrada, id = null) {
    const autorizacion = autorizarDocumento(tipo, id ? 'editar' : 'crear', id);
    return cambiar((datos) => {
      comprobarAutorizacionEnDatos(datos, autorizacion);
      const lista = listaDocumentos(datos, tipo);
      const contacto = String(entrada.contacto?? '').trim();
      const observaciones = String(entrada.observaciones?? '').trim();
      if (contacto.length < 2 || contacto.length > 150 || observaciones.length > 1000) { throw new Error('Indica un contacto de 2 a 150 caracteres y notas de hasta 1000.'); }
      if (id) {
        const doc = buscar(lista, id);
        if (doc.estado !== 'borrador') { throw new Error('Solo se editan borradores.'); }
        return Object.assign(doc, {contacto, observaciones});
      }
      const doc = {id: idNuevo(), contacto, observaciones, estado: 'borrador', fecha: new Date().toISOString(), detalles: []};
      if (tipo === 'ventas') {
        const clienteId = typeof entrada.clienteId === 'string' ? entrada.clienteId.trim() : '';
        if (!datos.clientes.some((cliente) => cliente.id === clienteId && cliente.activo)) {
          throw new Error('Selecciona un perfil de cliente activo para la venta.');
        }
        doc.clienteId = clienteId;
        if (autorizacion.rol === 'empleado') {
          doc.creadorId = autorizacion.usuarioId;
          doc.empleadoId = autorizacion.usuarioId;
        }
      }
      lista.unshift(doc);
      return doc;
    });
  }
  function guardarDetalle(tipo, documentoId, entrada, lineaId = null) {
    const autorizacion = autorizarDocumento(tipo, lineaId ? 'editar' : 'agregar', documentoId);
    return cambiar((datos) => {
      comprobarAutorizacionEnDatos(datos, autorizacion);
      const doc = buscar(listaDocumentos(datos, tipo), documentoId);
      comprobarBorradorPropio(doc, autorizacion);
      if (doc.estado !== 'borrador') { throw new Error('Los detalles están cerrados.'); }
      const producto = buscar(datos.productos, entrada.productoId);
      if (!producto.activo) { throw new Error('Selecciona un producto activo.'); }
      if (doc.detalles.some((d) => d.productoId === producto.id && d.id !== lineaId)) { throw new Error('Ese producto ya está en el documento. Edita su línea.'); }
      const precio = autorizacion.rol === 'empleado' ? producto.precio : entrada.precio;
      const linea = {productoId: producto.id, nombre: producto.nombre, cantidad: cantidad(entrada.cantidad, 1), centavos: centavos(precio)};
      if (lineaId) { return Object.assign(buscar(doc.detalles, lineaId), linea); }
      doc.detalles.push({id: idNuevo(),...linea});
    });
  }
  function quitarDetalle(tipo, documentoId, lineaId) {
    const autorizacion = autorizarDocumento(tipo, 'quitar', documentoId);
    return cambiar((datos) => {
      comprobarAutorizacionEnDatos(datos, autorizacion);
      const doc = buscar(listaDocumentos(datos, tipo), documentoId);
      comprobarBorradorPropio(doc, autorizacion);
      if (doc.estado !== 'borrador') { throw new Error(autorizacion.rol === 'empleado' ? 'Solo puedes quitar líneas de borradores abiertos.' : 'Los detalles están cerrados.'); }
      buscar(doc.detalles, lineaId);
      doc.detalles = doc.detalles.filter((d) => d.id !== lineaId);
    });
  }
  // El contador conserva su base anterior; solo se revierten ventas contabilizadas por esta versión.
  function resumirVentas(lineas) {
    if (!Array.isArray(lineas) || !lineas.length) { throw new Error('El detalle contabilizado de ventas no es válido.'); }
    const totales = new Map();
    lineas.forEach((linea) => {
      if (!linea || typeof linea.productoId !== 'string' || !linea.productoId || !Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0) {
        throw new Error('El detalle contabilizado de ventas no es válido.');
      }
      const total = (totales.get(linea.productoId) ?? 0) + linea.cantidad;
      if (!Number.isSafeInteger(total)) { throw new Error('El total vendido supera el límite permitido.'); }
      totales.set(linea.productoId, total);
    });
    return [...totales].map(([productoId, cantidad]) => ({productoId, cantidad}));
  }
  function actualizarVentas(datos, lineas, signo) {
    const cambios = lineas.map(({productoId, cantidad}) => {
      const producto = buscar(datos.productos, productoId);
      const ventas = producto.ventas + signo * cantidad;
      if (!Number.isSafeInteger(producto.ventas) || producto.ventas < 0 || !Number.isSafeInteger(ventas) || ventas < 0) {
        throw new Error('El contador de ventas no permite aplicar esta operación. No se guardaron cambios.');
      }
      return {producto, ventas};
    });
    cambios.forEach(({producto, ventas}) => { producto.ventas = ventas; });
  }
  function transicion(tipo, id, accion, motivo = '') {
    const autorizacion = autorizarDocumento(tipo, accion, id);
    return cambiar((datos) => {
      comprobarAutorizacionEnDatos(datos, autorizacion);
      const doc = buscar(listaDocumentos(datos, tipo), id);
      comprobarBorradorPropio(doc, autorizacion);
      if (accion === 'confirmar') {
        if (doc.estado !== 'borrador') { throw new Error('Este documento ya fue confirmado o anulado. No se aplicó su efecto otra vez.'); }
        if (!doc.detalles.length) { throw new Error('Agrega al menos un detalle antes de confirmar.'); }
        moverExistencias(datos, doc.detalles.map((d) => ({id: d.productoId, variacion: d.cantidad * (tipo === 'compras'? 1: -1)})), tipo === 'compras'? 'Compra confirmada': 'Venta confirmada', 'Confirmación', id);
        if (tipo === 'ventas') {
          if (Object.hasOwn(doc, 'ventasContabilizadas')) { throw new Error('La venta ya contiene un registro de contabilización.'); }
          const lineas = resumirVentas(doc.detalles);
          actualizarVentas(datos, lineas, 1);
          doc.ventasContabilizadas = lineas;
        }
        doc.estado = 'confirmado';
      } else if (accion === 'anular') {
        if (doc.estado === 'anulado') { throw new Error('La anulación ya fue aplicada.'); }
        if (motivo.trim().length < 3 || motivo.trim().length > 500) { throw new Error('Escribe un motivo de anulación de 3 a 500 caracteres.'); }
        if (doc.estado === 'confirmado') {
          moverExistencias(datos, doc.detalles.map((d) => ({id: d.productoId, variacion: d.cantidad * (tipo === 'compras'? -1: 1)})), tipo === 'compras'? 'Compra anulada': 'Venta anulada', motivo.trim(), id);
          if (tipo === 'ventas' && Object.hasOwn(doc, 'ventasContabilizadas')) {
            const contabilizadas = resumirVentas(doc.ventasContabilizadas);
            const detalles = resumirVentas(doc.detalles);
            if (contabilizadas.length !== detalles.length || contabilizadas.some((linea) => !detalles.some((detalle) => detalle.productoId === linea.productoId && detalle.cantidad === linea.cantidad))) {
              throw new Error('El registro de ventas no coincide con el documento. No se guardaron cambios.');
            }
            actualizarVentas(datos, contabilizadas, -1);
          }
        }
        doc.estado = 'anulado';
        doc.motivo = motivo.trim();
      } else { throw new Error('Acción no permitida.'); }
    });
  }
  // Cuenta y perfil son entidades distintas; los ejemplos públicos no son personas reales.
  const cuentasAccesoDemo = [
    {id: 'acceso-admin-demo', usuario: 'admin.demo', nombre: 'Administrador', rol: 'administrador', clave: 'DemoAdmin123!'},
    {id: 'acceso-empleado-demo', usuario: 'empleado.demo', nombre: 'Empleado', rol: 'empleado', clave: 'DemoEmpleado123!'},
    {id: 'acceso-cliente-demo', usuario: 'cliente.demo', nombre: 'Cliente', rol: 'cliente', clienteId: 'cliente-demo-01', clave: 'DemoCliente123!'}
  ];
  const destinos = {administrador: 'admin.html', empleado: 'empleado.html', cliente: 'cliente.html'};
  // Releer antes de mutar evita sobrescribir cambios recientes de otra pestaña.
  function sincronizar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE));
      if (!guardado || guardado.version !== 1 || !['productos', 'clientes', 'empleados', 'compras', 'ventas', 'movimientos'].every((k) => Array.isArray(guardado[k]))) { throw new Error('Estado incompatible.'); }
      estado = guardado; problema = ''; return true;
    } catch { problema = 'No se pudo leer la aplicación. No se han sustituido los datos guardados.'; return false; }
  }
  // Mismo derivador para login, altas y restablecimiento; nunca persistir la clave escrita.
  async function derivarClaveDemo(clave, sal) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt: Uint8Array.from(sal), iterations: 100000, hash: 'SHA-256'}, material, 256);
    return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  async function credencial(clave) {
    const sal = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    return {sal, huella: await derivarClaveDemo(clave, sal)};
  }
  // Migración aditiva: conserva cuentas cambiadas/inactivas; añade el cliente una sola vez.
  async function prepararAccesoDemo() {
    if (!sincronizar()) { throw new Error(problema); }
    if (Object.hasOwn(estado, 'usuariosDemo') && !Array.isArray(estado.usuariosDemo)) { throw new Error('Las cuentas no tienen un formato compatible.'); }
    if (estado.accesoDemoVersion === 2) { return; }
    if (!globalThis.crypto?.subtle) { throw new Error('Abre el proyecto con Live Server en localhost.'); }
    const existentes = estado.usuariosDemo;
    const faltantes = cuentasAccesoDemo.filter((cuenta) => !existentes || (cuenta.rol === 'cliente' && !existentes.some((u) => u.id === cuenta.id || normalizar(u.usuario) === cuenta.usuario)));
    const nuevas = await Promise.all(faltantes.map(async ({clave,...cuenta}) => ({...cuenta, activo: true, versionAcceso: 1,...await credencial(clave)})));
    cambiar((datos) => {
      if (datos.accesoDemoVersion === 2) { return; }
      datos.usuariosDemo??= [];
      nuevas.forEach((cuenta) => { if (!datos.usuariosDemo.some((u) => u.id === cuenta.id || normalizar(u.usuario) === cuenta.usuario)) { datos.usuariosDemo.push(cuenta); } });
      datos.usuariosDemo.forEach((cuenta) => { cuenta.activo??= true; cuenta.versionAcceso??= 1; });
      datos.accesoDemoVersion = 2;
    });
  }
  // Solo datos públicos: ninguna vista recibe sal ni huella.
  function cuentaPublica(cuenta) {
    const perfil = cuenta.empleadoId? estado.empleados.find((p) => p.id === cuenta.empleadoId): null;
    return {id: cuenta.id, usuario: cuenta.usuario, nombre: perfil?.nombre?? cuenta.nombre?? cuenta.usuario, correo: perfil?.correo?? cuenta.correo?? '', rol: cuenta.rol, activo: cuenta.activo !== false, empleadoId: cuenta.empleadoId?? null, clienteId: cuenta.clienteId?? null};
  }
  function sesionActual() {
    if (!sincronizar()) { return null; }
    const sesion = estado.sesionDemo;
    const cuenta = (Array.isArray(estado.usuariosDemo)? estado.usuariosDemo: []).find((u) => u.id === sesion?.usuarioId);
    if (!sesion || !cuenta || cuenta.activo === false || !destinos[cuenta.rol] || cuenta.rol !== sesion.rol || (cuenta.versionAcceso?? 1) !== (sesion.versionAcceso?? 1)) { return null; }
    if (cuenta.empleadoId && !estado.empleados.some((p) => p.id === cuenta.empleadoId && p.activo)) { return null; }
    if (cuenta.clienteId && !estado.clientes.some((p) => p.id === cuenta.clienteId && p.activo)) { return null; }
    return cuentaPublica(cuenta);
  }
  function cerrarSesionDemo() { return cambiar((datos) => { datos.sesionDemo = null; datos.rol = null; }); }
  // Política única por ruta; no depende de data-perfil, del rol espejo ni de la URL de consulta.
  const politicaAcceso = Object.freeze({
    'index.html': null, 'catalogo.html': null, 'producto.html': null, 'login.html': null, 'registro.html': null,
    'cliente.html': 'cliente', 'empleado.html': 'empleado', 'admin.html': 'administrador',
    'admin-productos.html': 'administrador', 'admin-inventario.html': 'administrador',
    'admin-compras.html': 'administrador', 'admin-ventas.html': 'administrador',
    'admin-clientes.html': 'administrador', 'admin-empleados.html': 'administrador'
  });
  function evaluarAcceso(ruta = location.pathname) {
    const pagina = ruta.split('?')[0].split('#')[0].split('/').pop().toLowerCase() || 'index.html';
    const conocido = Object.hasOwn(politicaAcceso, pagina);
    const requerido = conocido ? politicaAcceso[pagina] : (/^admin-.*\.html$/.test(pagina) ? 'administrador' : undefined);
    const sesion = sesionActual();
    const identidad = sesion ? identidadSesion() : null;
    if (requerido === null) { return {permitido: true, pagina, requerido, sesion, identidad}; }
    if (requerido === undefined) { return {permitido: false, pagina, motivo: 'pagina', destino: 'index.html?aviso=pagina', sesion, identidad}; }
    if (!sesion) { return {permitido: false, pagina, requerido, motivo: 'sesion', destino: 'login.html?aviso=sesion', sesion: null, identidad: null}; }
    if (sesion.rol !== requerido) { return {permitido: false, pagina, requerido, motivo: 'perfil', destino: destinos[sesion.rol] + '?aviso=perfil', sesion, identidad}; }
    return {permitido: true, pagina, requerido, sesion, identidad};
  }
  function identidadSesion() {
    const sesion = estado.sesionDemo;
    return sesion ? sesion.id ?? `${sesion.usuarioId}:${sesion.iniciadaEn}:${sesion.versionAcceso ?? 1}` : null;
  }
  function exigirAdministrador(identidadEsperada = null) {
    const acceso = evaluarAcceso();
    if (!acceso.permitido || acceso.requerido !== 'administrador' || acceso.sesion?.rol !== 'administrador' || (identidadEsperada !== null && acceso.identidad !== identidadEsperada)) { throw new Error('La sesión administrativa ya no es válida para esta operación.'); }
  }
  // El inicio es público; modificar productos requiere una cuenta administrativa vigente.
  function exigirMutacionProducto() {
    const acceso = evaluarAcceso();
    if (acceso.permitido && acceso.pagina === 'index.html' && acceso.sesion?.rol === 'administrador') { return; }
    exigirAdministrador();
  }
  // Solo el modelo asigna el rol y crea una cuenta cliente con perfil nuevo.
  async function registrarCliente(entrada) {
    if (!entrada || typeof entrada !== 'object') { throw new Error('Completa los datos del registro.'); }
    if (Object.hasOwn(entrada, 'rol') && entrada.rol !== 'cliente') {
      throw new Error('El registro público solo permite cuentas de cliente.');
    }
    const perfilValidado = validarCliente(entrada);
    if (!perfilValidado.valido) { throw new Error(Object.values(perfilValidado.errores)[0]); }
    const correo = String(entrada.correo ?? '').trim();
    if (!correo || correo === 'No indicado') { throw new Error('El correo es obligatorio.'); }
    const usuario = normalizar(entrada.usuario);
    if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(usuario)) {
      throw new Error('Usuario: de 3 a 60 caracteres; letras, números, punto, guion o guion bajo, sin espacios.');
    }
    const clave = String(entrada.clave ?? '');
    if (clave.length < 8 || clave.length > 100) { throw new Error('La contraseña debe tener de 8 a 100 caracteres.'); }
    if (clave !== entrada.confirmacion) { throw new Error('Las contraseñas no coinciden.'); }

    // Prepara las cuentas de demostración antes de comprobar los nombres reservados.
    await prepararAccesoDemo();
    const camposCredencial = await credencial(clave);
    return cambiar((datos) => {
      // La comprobación se repite después del cálculo asíncrono y con datos actualizados.
      if (!Array.isArray(datos.usuariosDemo)) { throw new Error('Las cuentas no tienen un formato compatible.'); }
      if (datos.usuariosDemo.some((cuenta) => normalizar(cuenta.usuario) === usuario)) {
        throw new Error('Ya existe ese usuario de acceso.');
      }
      const correoNormalizado = correo.normalize('NFC').toLowerCase();
      const correoIgual = (valor) => typeof valor === 'string' && valor.trim().normalize('NFC').toLowerCase() === correoNormalizado;
      const usado = datos.usuariosDemo.some((cuenta) => {
        const perfilCliente = cuenta.clienteId ? datos.clientes.find((perfil) => perfil.id === cuenta.clienteId) : null;
        const perfilEmpleado = cuenta.empleadoId ? datos.empleados.find((perfil) => perfil.id === cuenta.empleadoId) : null;
        return correoIgual(cuenta.correo) || correoIgual(perfilCliente?.correo) || correoIgual(perfilEmpleado?.correo);
      });
      if (usado) { throw new Error('Ya existe una cuenta con ese correo.'); }
      const perfilId = idNuevo();
      const cuentaId = idNuevo();
      if (datos.clientes.some((perfil) => perfil.id === perfilId) || datos.usuariosDemo.some((cuenta) => cuenta.id === cuentaId)) {
        throw new Error('No fue posible crear identificadores únicos. Intenta de nuevo.');
      }
      const perfil = {id: perfilId, ...perfilValidado.datos, activo: true};
      const cuenta = {id: cuentaId, usuario, nombre: perfil.nombre, correo: perfil.correo, rol: 'cliente',
        clienteId: perfilId, activo: true, versionAcceso: 1, ...camposCredencial};
      datos.clientes.push(perfil);
      datos.usuariosDemo.push(cuenta);
      return {id: cuenta.id, usuario: cuenta.usuario, nombre: cuenta.nombre, correo: cuenta.correo,
        rol: cuenta.rol, activo: cuenta.activo, empleadoId: null, clienteId: cuenta.clienteId};
    });
  }
  async function iniciarSesionDemo(usuario, clave) {
    if (!String(usuario).trim() || !String(clave)) { return {valido: false, mensaje: 'Completa el usuario y la contraseña.'}; }
    await prepararAccesoDemo();
    const cuenta = estado.usuariosDemo.find((registro) => normalizar(registro.usuario) === normalizar(usuario));
    if (!cuenta) { return {valido: false, mensaje: 'Usuario o contraseña incorrectos.'}; }
    if (cuenta.activo === false || (cuenta.empleadoId && !estado.empleados.some((p) => p.id === cuenta.empleadoId && p.activo))) { return {valido: false, mensaje: 'Esta cuenta está inactiva o su perfil no está disponible.'}; }
    if (!Array.isArray(cuenta.sal) || cuenta.sal.length !== 16 || typeof cuenta.huella !== 'string' || !destinos[cuenta.rol]) { return {valido: false, mensaje: 'La cuenta no tiene un formato compatible.'}; }
    const huella = await derivarClaveDemo(String(clave), cuenta.sal);
    if (huella !== cuenta.huella) { return {valido: false, mensaje: 'Usuario o contraseña incorrectos.'}; }
    cambiar((datos) => {
      const actual = datos.usuariosDemo.find((u) => u.id === cuenta.id);
      if (!actual || actual.activo === false || actual.huella !== cuenta.huella || actual.rol !== cuenta.rol || (actual.empleadoId && !datos.empleados.some((p) => p.id === actual.empleadoId && p.activo)) || (actual.versionAcceso?? 1) !== (cuenta.versionAcceso?? 1)) { throw new Error('La cuenta cambió mientras se comprobaba el acceso. Intenta de nuevo.'); }
      datos.rol = actual.rol;
      datos.sesionDemo = {id: idNuevo(), usuarioId: actual.id, usuario: actual.usuario, rol: actual.rol, versionAcceso: actual.versionAcceso?? 1, iniciadaEn: new Date().toISOString()};
    });
    return {valido: true, mensaje: 'Acceso local iniciado.', destino: destinos[cuenta.rol]};
  }
  function cuentaEmpleado(empleadoId) {
    exigirAdministrador();
    const cuenta = (Array.isArray(estado.usuariosDemo)? estado.usuariosDemo: []).find((u) => u.empleadoId === empleadoId && u.rol === 'empleado');
    return cuenta? cuentaPublica(cuenta): null;
  }
  // La vinculación siempre es explícita y solo usa identificadores existentes.
  function listarCuentasCliente() {
    exigirAdministrador();
    return (Array.isArray(estado.usuariosDemo) ? estado.usuariosDemo : [])
      .filter((cuenta) => cuenta.rol === 'cliente')
      .map((cuenta) => cuentaPublica(cuenta));
  }
  function vincularCuentaCliente(cuentaId, clienteId) {
    exigirAdministrador();
    const identidad = evaluarAcceso().identidad;
    return cambiar((datos) => {
      exigirAdministrador(identidad);
      const cuenta = (Array.isArray(datos.usuariosDemo) ? datos.usuariosDemo : [])
        .find((registro) => registro.id === cuentaId && registro.rol === 'cliente');
      if (!cuenta) { throw new Error('La cuenta de cliente no está disponible.'); }
      const idPerfil = typeof clienteId === 'string' ? clienteId.trim() : '';
      if (idPerfil && !datos.clientes.some((perfil) => perfil.id === idPerfil && perfil.activo)) {
        throw new Error('Elige un perfil de cliente activo o deja la cuenta sin vincular.');
      }
      if (idPerfil && cuenta.clienteId !== idPerfil && datos.usuariosDemo.some((otra) =>
        otra.id !== cuenta.id && otra.rol === 'cliente' && otra.clienteId === idPerfil)) {
        throw new Error('Ese perfil ya está vinculado a otra cuenta.');
      }
      cuenta.clienteId = idPerfil || null;
      return cuentaPublica(cuenta);
    });
  }
  // Retornos tempranos compartidos: el formulario nunca asigna el rol.
  function validarCuentaEmpleado(empleadoId, entrada, restablecerClave = false) {
    if (sesionActual()?.rol !== 'administrador') { return {valido: false, mensaje: 'Se requiere una sesión de administrador vigente.'}; }
    const perfil = estado.empleados.find((p) => p.id === empleadoId);
    if (!perfil || !perfil.activo) { return {valido: false, mensaje: 'Selecciona un perfil de empleado activo.'}; }
    const cuenta = cuentaEmpleado(empleadoId);
    if (!restablecerClave && cuenta) { return {valido: false, mensaje: 'Este empleado ya tiene una cuenta.'}; }
    if (restablecerClave && !cuenta) { return {valido: false, mensaje: 'El empleado no tiene una cuenta que restablecer.'}; }
    const usuario = restablecerClave? cuenta.usuario: normalizar(entrada.usuario);
    if (!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(usuario)) { return {valido: false, mensaje: 'Usuario: de 3 a 60 caracteres; letras, números, punto, guion o guion bajo, sin espacios.'}; }
    if (!restablecerClave && estado.usuariosDemo.some((u) => normalizar(u.usuario) === usuario)) { return {valido: false, mensaje: 'Ya existe ese usuario de acceso.'}; }
    const clave = String(entrada.clave?? '');
    if (clave.length < 8 || clave.length > 100) { return {valido: false, mensaje: 'La contraseña debe tener de 8 a 100 caracteres.'}; }
    if (clave !== entrada.confirmacion) { return {valido: false, mensaje: 'Las contraseñas no coinciden.'}; }
    return {valido: true, mensaje: '', usuario};
  }
  async function guardarCuentaEmpleado(empleadoId, entrada, restablecerClave = false) {
    exigirAdministrador();
    const identidad = evaluarAcceso().identidad;
    let resultado = validarCuentaEmpleado(empleadoId, entrada, restablecerClave);
    if (!resultado.valido) { throw new Error(resultado.mensaje); }
    const campos = await credencial(String(entrada.clave));
    return cambiar((datos) => {
      exigirAdministrador(identidad);
      resultado = validarCuentaEmpleado(empleadoId, entrada, restablecerClave);
      if (!resultado.valido) { throw new Error(resultado.mensaje); }
      if (restablecerClave) {
        const cuenta = datos.usuariosDemo.find((u) => u.empleadoId === empleadoId && u.rol === 'empleado');
        Object.assign(cuenta, campos, {versionAcceso: (cuenta.versionAcceso?? 1) + 1});
        if (datos.sesionDemo?.usuarioId === cuenta.id) { datos.sesionDemo = null; datos.rol = null; }
        return;
      }
      datos.usuariosDemo.push({id: idNuevo(), empleadoId, usuario: resultado.usuario, rol: 'empleado', activo: true, versionAcceso: 1,...campos});
    });
  }
  function cambiarAccesoEmpleado(empleadoId) {
    exigirAdministrador();
    return cambiar((datos) => {
      exigirAdministrador();
      const cuenta = datos.usuariosDemo.find((u) => u.empleadoId === empleadoId && u.rol === 'empleado');
      if (!cuenta) { throw new Error('No existe una cuenta de empleado vinculada.'); }
      cuenta.activo = !cuenta.activo; cuenta.versionAcceso = (cuenta.versionAcceso?? 1) + 1;
      if (datos.sesionDemo?.usuarioId === cuenta.id) { datos.sesionDemo = null; datos.rol = null; }
    });
  }
  async function restablecer() {
    exigirAdministrador();
    const nuevo = inicial();
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); }
    catch { throw new Error('No se puede restablecer: el navegador no permite guardar.'); }
    estado = nuevo;
    problema = '';
    // Primero se restablecen los productos; después se limpia su almacén de imágenes.
    try {
      await ServicioImagenes.borrarTodas();
      return {imagenesBorradas: true};
    } catch (error) {
      return {imagenesBorradas: false};
    }
  }
  // Las ventas antiguas sin vínculo no pertenecen al historial de ningún perfil.
  function ventasDelCliente(clienteId) {
    return clienteId ? estado.ventas.filter((venta) => venta.clienteId === clienteId) : [];
  }
  // Filtra una lista ya autorizada por cliente, producto, fecha o estado.
  function filtrarVentas(ventas, texto, estadoVenta = 'todos') {
    const consulta = normalizar(texto);
    return ventas.filter((venta) => {
      const fecha = new Date(venta.fecha);
      const fechaVisible = Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-CO');
      const productos = (Array.isArray(venta.detalles) ? venta.detalles : []).map((linea) => linea.nombre ?? '').join(' ');
      const contenido = normalizar([venta.contacto ?? '', venta.id ?? '', venta.fecha ?? '', fechaVisible, productos].join(' '));
      return (estadoVenta === 'todos' || venta.estado === estadoVenta) && contenido.includes(consulta);
    });
  }
  // El empleado recibe solo el historial reducido del perfil seleccionado.
  function relojesCompradosPorCliente(clienteId) {
    const acceso = evaluarAcceso();
    if (!acceso.permitido || acceso.pagina !== 'empleado.html' || acceso.sesion?.rol !== 'empleado') {
      throw new Error('Tu perfil no tiene acceso al historial de clientes.');
    }
    if (!clienteId) { return []; }
    if (!estado.clientes.some((cliente) => cliente.id === clienteId && cliente.activo)) {
      throw new Error('Selecciona un cliente activo.');
    }
    return ventasDelCliente(clienteId)
      .filter((venta) => venta.estado === 'confirmado')
      .flatMap((venta) => (Array.isArray(venta.detalles) ? venta.detalles : []).filter((linea) => linea && typeof linea === 'object').map((linea) => ({
        nombre: typeof linea.nombre === 'string' ? linea.nombre : 'No indicado',
        fecha: typeof venta.fecha === 'string' ? venta.fecha : '',
        precio: Number.isFinite(linea.centavos) ? linea.centavos / 100 : null
      })));
  }
  // El identificador de la venta es el de la cuenta, no el del perfil de empleado.
  function ventasDelEmpleado(cuentaId) {
    const acceso = evaluarAcceso();
    if (!acceso.permitido || acceso.pagina !== 'empleado.html' ||
        acceso.sesion?.rol !== 'empleado' || acceso.sesion.id !== cuentaId) {
      throw new Error('Solo puedes consultar tus propias ventas.');
    }
    return copiar(estado.ventas.filter((venta) => venta.empleadoId === cuentaId));
  }
  function productoParaCliente(producto) {
    const {cantidad, ...datosPublicos} = producto;
    return {...datosPublicos, disponible: cantidad > 0};
  }
  function consultarInventario() {
    const acceso = evaluarAcceso();
    if (!acceso.permitido || !['empleado', 'administrador'].includes(acceso.sesion?.rol)) {
      throw new Error('Tu perfil no tiene acceso al inventario.');
    }
    return copiar(estado.productos);
  }
  return {
    politicaAcceso, evaluarAcceso, sincronizar, sesionActual, cerrarSesionDemo, cuentaEmpleado, listarCuentasCliente, vincularCuentaCliente, validarCuentaEmpleado, guardarCuentaEmpleado, cambiarAccesoEmpleado, destinoPerfil: (rol) => destinos[rol], prepararAccesoDemo, registrarCliente, iniciarSesionDemo, categorias, imagenes, normalizar, validar, validarCliente, validarTelefono, validarCorreo, validarEliminacion, eliminarProducto, guardarProducto, cambiarActivo, guardarPersona, ajustar, guardarDocumento, guardarDetalle, quitarDetalle, transicion, restablecer, ventasDelEmpleado, relojesCompradosPorCliente, filtrarVentas, consultarInventario,
    listar: (tipo) => {
      if (tipo === 'productos') {
        return copiar(sesionActual()?.rol === 'cliente'
          ? estado.productos.filter((p) => p.activo).map(productoParaCliente) : estado.productos);
      }
      const acceso = evaluarAcceso();
      if (acceso.permitido && acceso.requerido === 'administrador' && acceso.sesion?.rol === 'administrador') {
        if (['clientes', 'empleados', 'compras', 'ventas', 'movimientos'].includes(tipo)) { return copiar(estado[tipo]); }
      }
      if (acceso.permitido && acceso.pagina === 'empleado.html' && acceso.sesion?.rol === 'empleado') {
        if (tipo === 'clientes') { return copiar(estado.clientes.map(({id, nombre, correo, activo}) => ({id, nombre, correo, activo}))); }
        if (tipo === 'ventas') { return ventasDelEmpleado(acceso.sesion.id); }
      }
      if (acceso.permitido && acceso.pagina === 'cliente.html' && acceso.sesion?.rol === 'cliente') {
        const clienteId = acceso.sesion.clienteId;
        if (tipo === 'clientes') { return copiar(clienteId ? estado.clientes.filter((perfil) => perfil.id === clienteId) : []); }
        if (tipo === 'ventas') { return copiar(ventasDelCliente(clienteId)); }
      }
      throw new Error('Tu perfil no tiene acceso a estos datos.');
    },
    producto: (id) => {
      const esCliente = sesionActual()?.rol === 'cliente';
      const producto = estado.productos.find((p) => p.id === id && (!esCliente || p.activo));
      return copiar(producto ? (esCliente ? productoParaCliente(producto) : producto) : null);
    },
    documento: (tipo, id) => {
      const acceso = evaluarAcceso();
      if (acceso.permitido && acceso.requerido === 'administrador' && acceso.sesion?.rol === 'administrador') {
        return copiar(listaDocumentos(estado, tipo).find((doc) => doc.id === id) ?? null);
      }
      if (tipo === 'ventas' && acceso.permitido && acceso.pagina === 'empleado.html' && acceso.sesion?.rol === 'empleado') {
        const venta = estado.ventas.find((doc) => doc.id === id);
        if (venta && venta.empleadoId !== acceso.sesion.id) {
          throw new Error('Solo puedes modificar las ventas que creaste.');
        }
        return copiar(venta ?? null);
      }
      if (tipo === 'ventas' && acceso.permitido && acceso.pagina === 'cliente.html' && acceso.sesion?.rol === 'cliente') {
        return copiar(acceso.sesion.clienteId ? estado.ventas.find((doc) => doc.id === id && doc.clienteId === acceso.sesion.clienteId) ?? null : null);
      }
      throw new Error('Tu perfil no tiene acceso a estos documentos.');
    },
    total: (doc) => doc.detalles.reduce((suma, d) => suma + d.cantidad * d.centavos, 0) / 100,
    resumen: () => {
      const esCliente = sesionActual()?.rol === 'cliente';
      const activos = estado.productos.filter((p) => p.activo);
      if (esCliente) { return {referencias: activos.length}; }
      return {referencias: activos.length, agotados: activos.filter((p) => p.cantidad === 0).length, unidades: activos.reduce((suma, p) => suma + p.cantidad, 0)};
    },
    meta: () => ({tema: estado.tema, rol: estado.rol, usuario: estado.sesionDemo?.usuario?? null, problema}),
    cambiarTema: (tema) => cambiar((datos) => { datos.tema = tema; }),
  };
})();
