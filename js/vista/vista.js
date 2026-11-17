'use strict';
// Presentación compartida: nodos seguros y diálogos, sin persistencia.
const Vista = (() => {
  // Limpia etiquetas antiguas solo al mostrarlas; no modifica los registros guardados.
  function textoVisible(valor) { return String(valor ?? '').replace(/\s+fictici[oa]s?\b/gi, '').replace(/\s+de demostraci[oó]n\b/gi, '').replace(/demostraci[oó]n/gi, 'aplicación'); }
  function crear(tag, texto = '', clase = '') {
    const nodo = document.createElement(tag);
    nodo.textContent = textoVisible(texto);
    if (clase) { nodo.className = clase; }
    return nodo;
  }
  const moneda = (valor) => new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP', maximumFractionDigits: 2}).format(Number(valor));
  const valores = (formulario) => Object.fromEntries(new FormData(formulario));
  function mensaje(texto, error = false, id = 'mensajePagina') {
    const nodo = document.getElementById(id);
    if (!nodo) { return; }
    nodo.textContent = textoVisible(texto);
    nodo.classList.toggle('oculto', texto === '');
    nodo.classList.toggle('error', error);
    nodo.classList.toggle('exito', !error && texto !== '');
  }
  function opciones(id, lista, inicial = 'Selecciona una opción') {
    const select = document.getElementById(id);
    const previo = select.value;
    select.replaceChildren(new Option(inicial, ''));
    lista.forEach((d) => select.appendChild(new Option(d.nombre?? d, d.id?? d)));
    if ([...select.options].some((o) => o.value === previo)) { select.value = previo; }
  }
  function tabla(id, registros, columnas, acciones = []) {
    const cuerpo = document.getElementById(id);
    cuerpo.replaceChildren();
    registros.forEach((registro) => {
      const tr = crear('tr', '', 'tabla__fila');
      tr.dataset.id = registro.id;
      tr.classList.toggle('tabla__fila--agotada', registro.cantidad === 0);
      columnas.forEach((columna) => { const valor = typeof columna === 'function'? columna(registro): registro[columna]?? 'Información pendiente'; const td = crear('td', '', 'tabla__celda'); if (valor instanceof Node) { td.appendChild(valor); } else { td.textContent = textoVisible(valor); } tr.appendChild(td); });
      if (acciones.length) {
        const td = crear('td', '', 'tabla__celda');
        acciones.forEach(([accion, nombre]) => {
          const texto = typeof nombre === 'function'? nombre(registro): nombre; if (!texto) { return; }
          const b = crear('button', texto, 'boton-texto');
          b.type = 'button'; b.dataset.accion = accion; b.dataset.id = registro.id;
          td.appendChild(b);
        });
        tr.appendChild(td);
      }
      cuerpo.appendChild(tr);
    });
    if (!registros.length) {
      const tr = crear('tr', '', 'tabla__fila'); const td = crear('td', 'Sin registros que coincidan.', 'tabla__celda');
      td.colSpan = columnas.length + (acciones.length? 1: 0);
      tr.appendChild(td); cuerpo.appendChild(tr);
    }
  }
  // Conserva literalmente los datos del perfil y señala los valores ausentes.
  function textoDatoCliente(valor) {
    return valor === undefined || valor === null || String(valor).trim() === '' ? 'No indicado' : String(valor);
  }
  function columnasCliente() {
    const campo = (nombre) => (perfil) => {
      const nodo = document.createElement('span');
      nodo.textContent = textoDatoCliente(perfil[nombre]);
      return nodo;
    };
    return [campo('nombre'), campo('correo'), campo('telefono'), campo('direccion'), campo('ciudad'), campo('cedula'), (perfil) => perfil.activo ? 'Activo' : 'Inactivo'];
  }
  function dibujarDetalleCliente(perfil) {
    const dl = document.getElementById('detallePersona');
    dl.replaceChildren();
    [['Referencia', perfil.id], ['Nombre', perfil.nombre], ['Correo', perfil.correo], ['Teléfono', perfil.telefono],
      ['Dirección', perfil.direccion], ['Ciudad', perfil.ciudad], ['Cédula', perfil.cedula],
      ['Estado', perfil.activo ? 'Activo' : 'Inactivo']].forEach(([nombre, valor]) => {
      const termino = document.createElement('dt'); termino.textContent = nombre;
      const dato = document.createElement('dd'); dato.textContent = textoDatoCliente(valor);
      dl.appendChild(termino); dl.appendChild(dato);
    });
  }
  // El controlador entrega únicamente los relojes autorizados para el cliente elegido.
  function dibujarHistorialClienteVenta(relojes) {
    const aviso = document.getElementById('sinComprasClienteVenta');
    const contenedor = document.getElementById('tablaHistorialClienteVenta');
    const cuerpo = document.getElementById('relojesClienteVenta');
    cuerpo.replaceChildren();
    aviso.textContent = relojes.length ? '' : 'Este cliente aún no tiene compras.';
    aviso.hidden = relojes.length > 0;
    contenedor.hidden = relojes.length === 0;
    relojes.forEach((reloj) => {
      const fila = document.createElement('tr');
      fila.className = 'tabla__fila';
      const fecha = new Date(reloj.fecha);
      const datos = [reloj.nombre, Number.isNaN(fecha.getTime()) ? 'No indicado' : fecha.toLocaleDateString('es-CO'), reloj.precio == null ? 'No indicado' : moneda(reloj.precio)];
      datos.forEach((dato) => { const celda = document.createElement('td'); celda.className = 'tabla__celda'; celda.textContent = String(dato ?? 'No indicado'); fila.appendChild(celda); });
      cuerpo.appendChild(fila);
    });
  }
  function presentarControlesVentaEmpleado(venta, abierta) {
    const cerrada = Boolean(venta && venta.estado !== 'borrador');
    document.getElementById('camposDetalleEmpleado').disabled = !abierta;
    document.getElementById('agregarProductoEmpleado').hidden = cerrada;
    const confirmar = document.getElementById('confirmarVentaEmpleado');
    confirmar.hidden = cerrada;
    confirmar.disabled = !abierta || !venta.detalles.length;
  }
  function tarjetas(id, productos, imagenes, laboratorio = false, seleccionado = null) {
    const contenedor = document.getElementById(id);
    ImagenProducto.liberarContenedor(contenedor);
    contenedor.replaceChildren();
    productos.forEach((p) => {
      const agotado = typeof p.disponible === 'boolean' ? !p.disponible : p.cantidad === 0;
      const article = crear('article', '', 'tarjeta'); article.dataset.id = p.id; article.classList.toggle('tarjeta--seleccionada', p.id === seleccionado); article.classList.toggle('tarjeta--agotada', agotado);
      const img = crear('img', '', 'tarjeta__imagen');
      img.alt = 'Imagen de un reloj de la categoría ' + p.categoria;
      img.width = 800; img.height = 800; img.loading = 'lazy';
      const cuerpo = crear('div', '', 'tarjeta__cuerpo');
      cuerpo.appendChild(crear('p', p.categoria, 'etiqueta'));
      const titulo = crear('h3'); titulo.appendChild(crear('strong', p.nombre)); cuerpo.appendChild(titulo);
      cuerpo.appendChild(crear('p', moneda(p.precio), 'tarjeta__precio'));
      const existencia = typeof p.disponible === 'boolean' ? (p.disponible ? 'Disponible' : 'Agotado') : (agotado ? 'Agotado · aplicación' : p.cantidad + ' unidades');
      cuerpo.appendChild(crear('p', existencia));
      cuerpo.appendChild(crear('em', 'Producto y precio.'));
      const enlace = crear('a', 'Ver ficha →', 'boton secundario'); enlace.href = 'producto.html?id=' + encodeURIComponent(p.id);
      cuerpo.appendChild(enlace);
      if (laboratorio) {
        cuerpo.appendChild(crear('p', p.id === seleccionado? 'Seleccionado para edición': (p.activo? 'Activo': 'Baja lógica')));
        [['editar', 'Editar'], ['eliminar', 'Eliminar'], ['estado', p.activo? 'Baja lógica': 'Reactivar']].forEach(([accion, texto]) => {
          const boton = crear('button', texto, 'boton secundario'); boton.type = 'button'; boton.dataset.accion = accion; boton.dataset.id = p.id; cuerpo.appendChild(boton);
        });
      }
      article.appendChild(img); article.appendChild(cuerpo); contenedor.appendChild(article);
      ImagenProducto.asignar(img, p.imagen, imagenes);
    });
  }
  function abrir(id) {
    const d = document.getElementById(id);
    if (!d.open) { d.showModal(); }
    const foco = d.querySelector('input:not([type="hidden"]):not([disabled])')?? d.querySelector('select:not([disabled])')?? d.querySelector('[data-cerrar]')?? d.querySelector('button');
    foco?.focus();
  }
  function cerrar(id) { document.getElementById(id).close(); }
  let retornoConfirmacion = null;
  function confirmar(texto) {
    retornoConfirmacion = document.activeElement;
    document.getElementById('textoConfirmacion').textContent = texto;
    mensaje('', false, 'errorConfirmacion');
    abrir('confirmacionDemo');
  }
  function cancelarConfirmacion() { const retorno = retornoConfirmacion?.isConnected? retornoConfirmacion: document.getElementById('guardarProducto')?? document.getElementById('restablecerDemo'); retorno?.focus(); retornoConfirmacion = null; }
  // Cada dibujo tiene una responsabilidad; tarjetas y tabla se actualizan por separado.
  function dibujarTarjetas(lista, seleccionado, sesion, imagenes) { tarjetas('tarjetasInicio', lista, imagenes, sesion?.rol === 'administrador', seleccionado); }
  function dibujarTablaRegistros(lista) { tabla('cuerpoTablaRegistros', lista, ['nombre', 'categoria', (p) => moneda(p.precio), 'cantidad']); }
  function dibujarFiltros(categorias) {
    const contenedor = document.getElementById('filtros'); contenedor.replaceChildren();
    ['Todas',...categorias].forEach((nombre) => { const boton = crear('button', nombre); boton.type = 'button'; boton.dataset.categoria = nombre; contenedor.appendChild(boton); });
  }
  function dibujarResumen(resumen) {
    const dl = document.getElementById('resumenCatalogo'); dl.replaceChildren();
    const datos = [['Referencias activas', resumen.referencias]];
    if ('agotados' in resumen) { datos.push(['Agotados activos', resumen.agotados], ['Unidades activas', resumen.unidades]); }
    datos.forEach(([nombre, valor]) => { dl.appendChild(crear('dt', nombre)); dl.appendChild(crear('dd', valor)); });
  }
  function dibujarResultados(lista, categoria) {
    document.getElementById('contadorResultados').textContent = lista.length + ' productos encontrados.';
    document.getElementById('sinResultados').classList.toggle('oculto', lista.length > 0);
    document.querySelectorAll('#filtros [data-categoria]').forEach((boton) => { const activo = boton.dataset.categoria === categoria; boton.classList.toggle('seleccionado', activo); boton.setAttribute('aria-pressed', String(activo)); });
  }
  function dibujarIndicadores(productos, sesion) {
    const lista = document.getElementById('promocionesDemo'); lista.replaceChildren();
    [...productos].sort((a, b) => b.ventas - a.ventas).slice(0, 5).forEach((p) => lista.appendChild(crear('li', `${p.nombre} · ${p.ventas} ventas`)));
    const estrella = productos.find((p) => p.id === 'demo-01')?? productos[0];
    const cliente = sesion?.rol === 'cliente';
    const stock = document.getElementById('stockInicio');
    document.querySelector('label[for="stockInicio"]').hidden = cliente;
    stock.hidden = cliente;
    if (cliente) { stock.value = 0; stock.textContent = ''; }
    else { stock.value = estrella?.cantidad?? 0; stock.textContent = String(estrella?.cantidad?? 0); }
    document.getElementById('textoStock').textContent = !estrella ? 'No hay productos activos en la aplicación.' : cliente ? `${estrella.nombre}: ${estrella.disponible ? 'Disponible' : 'Agotado'}.` : `${estrella.nombre}: ${estrella.cantidad} unidades de un máximo de 500.`;
  }
  function presentarProducto(producto = null) {
    document.getElementById('leyendaProducto').textContent = producto? 'Editar: ' + producto.nombre: 'Crear un producto';
    mensaje('', false, 'errorProducto');
    document.querySelector('details.gestion').open = true;
  }
  // Navegación contextual compartida; conserva los controles para no duplicar eventos.
  function dibujarNavegacion(sesion, pagina, destinoPerfil) {
    const publico = [['index.html', 'Inicio'], ['catalogo.html', 'Catálogo'], ['index.html#contacto', 'Contacto'], ...(!sesion ? [['login.html', 'Iniciar sesión']] : [])];
    const modulos = [['admin.html', 'Panel'], ['admin-productos.html', 'Productos'], ['admin-inventario.html', 'Inventario'], ['admin-compras.html', 'Compras'], ['admin-ventas.html', 'Ventas'], ['admin-clientes.html', 'Clientes'], ['admin-empleados.html', 'Empleados']];
    const paginaPublica = ['index', 'catalogo', 'producto', 'login', 'registro'].includes(pagina);
    const enlaces = paginaPublica? [...publico,...(sesion ? [[destinoPerfil, sesion.rol === 'administrador' ? 'Panel administrativo' : 'Mi espacio']] : [])]: sesion?.rol === 'cliente'? [['cliente.html', 'Mi espacio'], ['catalogo.html', 'Catálogo'], ['index.html#contacto', 'Contacto']]: sesion?.rol === 'empleado'? [['catalogo.html', 'Catálogo'], ['empleado.html#inventarioEmpleado', 'Inventario'], ['empleado.html#ventasEmpleado', 'Ventas'], ['empleado.html#clientesEmpleado', 'Clientes']]: sesion?.rol === 'administrador'? [['catalogo.html', 'Catálogo'], ...modulos]: publico;
    function enlace([ruta, texto]) {
      const nodo = crear('a', texto); nodo.href = ruta;
      if (ruta === pagina + '.html') { nodo.setAttribute('aria-current', 'page'); nodo.classList.add('seleccionado'); }
      if (ruta === 'login.html') { nodo.classList.add('boton'); }
      return nodo;
    }
    const cabecera = document.querySelector('.menu-global');
    const perfil = document.getElementById('perfilDemo');
    const salir = document.getElementById('salirDemo');
    perfil.textContent = sesion? textoVisible(sesion.nombre) + ' · ' + sesion.rol: 'Visitante';
    salir.textContent = 'Cerrar sesión'; salir.hidden = !sesion;
    const contexto = JSON.stringify([pagina, enlaces]);
    if (cabecera.dataset.contexto !== contexto) {
      cabecera.replaceChildren(...enlaces.map(enlace), perfil, salir); cabecera.dataset.contexto = contexto;
      if (pagina !== 'index') { document.getElementById('menuLateral').replaceChildren(...enlaces.map(enlace)); }
    }
    const restablecer = document.getElementById('restablecerDemo');
    if (restablecer) { restablecer.hidden = paginaPublica || sesion?.rol !== 'administrador'; }
  }
  function dibujarCliente(cuenta, perfil, ventas, productos, imagenes) {
    document.getElementById('bienvenidaCliente').textContent = 'Hola, ' + textoVisible(cuenta.nombre) + '.';
    document.getElementById('avisoCliente').hidden = Boolean(perfil);
    const dl = document.getElementById('cuentaCliente'); dl.replaceChildren();
    [['Nombre', perfil?.nombre], ['Correo', perfil?.correo], ['Teléfono', perfil?.telefono], ['Dirección', perfil?.direccion],
      ['Ciudad', perfil?.ciudad], ['Cédula', perfil?.cedula]].forEach(([nombre, valor]) => {
      const termino = document.createElement('dt'); termino.textContent = nombre;
      const dato = document.createElement('dd'); dato.textContent = textoDatoCliente(valor);
      dl.appendChild(termino); dl.appendChild(dato);
    });
    tabla('comprasCliente', ventas, [
      (venta) => { const fecha = new Date(venta.fecha); return Number.isNaN(fecha.getTime()) ? 'No indicado' : fecha.toLocaleDateString('es-CO'); },
      'id',
      (venta) => Array.isArray(venta.detalles) && venta.detalles.length ? venta.detalles.map((linea) => linea.nombre + ' × ' + linea.cantidad).join(', ') : 'Sin productos',
      (venta) => moneda((venta.detalles || []).reduce((suma, linea) => suma + linea.cantidad * linea.centavos, 0) / 100),
      'estado'
    ]);
    tarjetas('destacadosCliente', productos, imagenes);
  }
  return {dibujarNavegacion, dibujarCliente, columnasCliente, dibujarDetalleCliente, dibujarHistorialClienteVenta, presentarControlesVentaEmpleado, dibujarTarjetas, dibujarTablaRegistros, dibujarFiltros, dibujarResumen, dibujarResultados, dibujarIndicadores, presentarProducto, crear, moneda, valores, mensaje, opciones, tabla, tarjetas, abrir, cerrar, confirmar, cancelarConfirmacion};
})();
