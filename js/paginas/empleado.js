'use strict';
Controlador.iniciarModulo(() => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  let ventaActual = null;
  const formVenta = document.getElementById('formVentaEmpleado');
  const formDetalle = document.getElementById('formDetalleEmpleado');
  const clienteSelect = document.getElementById('clienteVentaEmpleado');
  const productoSelect = document.getElementById('productoVentaEmpleado');
  const detalleVenta = document.getElementById('detalleVentaEmpleado');
  const encabezadoAcciones = Vista.crear('th', 'Acciones', 'tabla__encabezado');
  encabezadoAcciones.scope = 'col';
  detalleVenta.closest('table').querySelector('thead tr').appendChild(encabezadoAcciones);

  Vista.opciones('categoriaInventario', Modelo.categorias, 'Todas las categorías');
  function dibujarInventario() {
    const productos = Controlador.filtrar(Modelo.consultarInventario(), document.getElementById('buscarInventario').value, document.getElementById('estadoInventario').value).filter((producto) => !document.getElementById('categoriaInventario').value || producto.categoria === document.getElementById('categoriaInventario').value);
    Vista.tabla('tablaInventario', productos, ['nombre', 'categoria', (producto) => Vista.moneda(producto.precio), 'cantidad', (producto) => producto.activo ? 'Activo' : 'Inactivo', (producto) => { const enlace = Vista.crear('a', 'Ver ficha'); enlace.href = 'producto.html?id=' + encodeURIComponent(producto.id); return enlace; }]);
    document.getElementById('contadorInventario').textContent = productos.length + (productos.length === 1 ? ' referencia.' : ' referencias.') + ' Vista de consulta sin acciones de edición.';
  }
  function dibujarClientes() {
    const clientes = Modelo.listar('clientes');
    Vista.tabla('clientesLecturaEmpleado', clientes, ['nombre', (cliente) => cliente.correo || 'No indicado', (cliente) => cliente.activo ? 'Activo' : 'Inactivo']);
    Vista.opciones('clienteVentaEmpleado', clientes.filter((cliente) => cliente.activo), 'Selecciona un cliente');
  }
  function mostrarPrecio() {
    const producto = Modelo.listar('productos').find((item) => item.id === productoSelect.value && item.activo);
    document.getElementById('precioVentaEmpleado').textContent = producto ? 'Precio unitario: ' + Vista.moneda(producto.precio) : 'Precio unitario: selecciona un producto.';
  }
  function dibujarVenta() {
    const sesion = Modelo.sesionActual();
    const cuentaId = sesion?.id;
    const ventas = cuentaId ? Modelo.ventasDelEmpleado(cuentaId) : [];
    Vista.tabla('ventasPropiasEmpleado', ventas, [
      (venta) => { const fecha = new Date(venta.fecha); return Number.isNaN(fecha.getTime()) ? 'No indicado' : fecha.toLocaleDateString('es-CO'); },
      'contacto', (venta) => Vista.moneda(Modelo.total(venta)), 'estado'
    ], [['abrir', (venta) => venta.empleadoId === cuentaId ? (venta.estado === 'borrador' ? 'Continuar' : 'Ver') : null]]);
    let venta = null;
    try { venta = ventaActual ? Modelo.documento('ventas', ventaActual) : null; }
    catch (error) { ventaActual = null; Vista.mensaje(error.message, true); }
    const abierta = Boolean(venta && venta.estado === 'borrador' && venta.empleadoId === cuentaId);
    Vista.presentarControlesVentaEmpleado(venta, abierta);
    document.getElementById('estadoVentaEmpleado').textContent = venta ?
      'Venta ' + venta.id + ' · ' + venta.estado + ' · Total ' + Vista.moneda(Modelo.total(venta)) :
      'Crea una venta para agregar productos.';
    Vista.tabla('detalleVentaEmpleado', venta?.detalles || [], ['nombre', 'cantidad', (linea) => Vista.moneda(linea.centavos / 100), (linea) => Vista.moneda(linea.cantidad * linea.centavos / 100)], [['quitar', () => abierta ? 'Quitar' : null]]);
    Vista.opciones('productoVentaEmpleado', Modelo.listar('productos').filter((producto) => producto.activo), 'Selecciona un producto');
    mostrarPrecio();
  }
  function dibujarTodo() { dibujarInventario(); dibujarClientes(); dibujarHistorialCliente(); dibujarVenta(); }
  function avisarError(error, id) { Vista.mensaje(error.message || 'No se pudo completar la operación.', true, id); }
  const dibujarHistorialCliente = Controlador.iniciarHistorialVentaEmpleado(clienteSelect, () => {
    try {
      const venta = ventaActual ? Modelo.documento('ventas', ventaActual) : null;
      if (venta && venta.clienteId !== clienteSelect.value) { ventaActual = null; formDetalle.reset(); dibujarVenta(); }
      Vista.mensaje('', false, 'errorVentaEmpleado');
    } catch (error) { avisarError(error, 'errorVentaEmpleado'); }
  });

  ['buscarInventario', 'estadoInventario', 'categoriaInventario'].forEach((id) => Controlador.escuchar(document.getElementById(id), id === 'buscarInventario' ? 'input' : 'change', dibujarInventario));
  Controlador.escuchar(productoSelect, 'change', mostrarPrecio);
  Controlador.escuchar(document, 'datosDemoSincronizados', dibujarTodo);
  Controlador.escuchar(formVenta, 'submit', (evento) => {
    evento.preventDefault();
    try {
      const cliente = Modelo.listar('clientes').find((item) => item.id === clienteSelect.value && item.activo);
      if (!cliente) { throw new Error('Selecciona un cliente activo.'); }
      const venta = Modelo.guardarDocumento('ventas', {clienteId: cliente.id, contacto: cliente.nombre, observaciones: ''});
      ventaActual = venta.id;
      formDetalle.reset();
      Vista.mensaje('', false, 'errorVentaEmpleado');
      dibujarVenta();
      Vista.mensaje('Venta creada. Agrega productos antes de confirmarla.');
    } catch (error) { avisarError(error, 'errorVentaEmpleado'); }
  });
  Controlador.escuchar(document.getElementById('ventasPropiasEmpleado'), 'click', (evento) => {
    const boton = evento.target.closest('button[data-id][data-accion="abrir"]');
    if (!boton) { return; }
    try {
      const venta = Modelo.documento('ventas', boton.dataset.id);
      if (venta && venta.empleadoId === Modelo.sesionActual()?.id) {
        ventaActual = venta.id;
        clienteSelect.value = venta.clienteId || '';
        formDetalle.reset();
        dibujarHistorialCliente();
        dibujarVenta();
      }
    } catch (error) { Vista.mensaje(error.message, true); }
  });
  Controlador.escuchar(formDetalle, 'submit', (evento) => {
    evento.preventDefault();
    try {
      Modelo.guardarDetalle('ventas', ventaActual, {productoId: productoSelect.value, cantidad: formDetalle.elements.namedItem('cantidad').value});
      formDetalle.reset();
      Vista.mensaje('', false, 'errorDetalleEmpleado');
      dibujarVenta();
      Vista.mensaje('Producto agregado a la venta.');
    } catch (error) { avisarError(error, 'errorDetalleEmpleado'); }
  });
  Controlador.escuchar(detalleVenta, 'click', (evento) => {
    const boton = evento.target.closest('button[data-id][data-accion="quitar"]');
    if (!boton) { return; }
    try {
      Modelo.quitarDetalle('ventas', ventaActual, boton.dataset.id);
      dibujarVenta();
      Vista.mensaje('Producto retirado de la venta.');
    } catch (error) { avisarError(error, 'errorDetalleEmpleado'); }
  });
  Controlador.escuchar(document.getElementById('confirmarVentaEmpleado'), 'click', () => {
    Controlador.confirmar('¿Confirmar la venta? Se actualizará el inventario una sola vez.', () => {
      Modelo.transicion('ventas', ventaActual, 'confirmar');
      dibujarTodo();
      Vista.mensaje('Venta confirmada.');
    });
  });
  dibujarTodo();
});
