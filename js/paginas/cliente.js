'use strict';
// La cuenta solo presenta el perfil elegido y las ventas vinculadas a él.
Controlador.iniciarModulo(() => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  function dibujar() {
    const sesion = Modelo.sesionActual();
    if (!sesion) { return; }
    const perfil = sesion.clienteId ? Modelo.listar('clientes').find((cliente) => cliente.id === sesion.clienteId) : null;
    const ventas = perfil ? Modelo.listar('ventas').filter((venta) => venta.clienteId === perfil.id) : [];
    const productos = Modelo.listar('productos').filter((producto) => producto.activo).slice(0, 3);
    Vista.dibujarCliente(sesion, perfil, ventas, productos, Modelo.imagenes);
  }
  Controlador.escuchar(document, 'datosDemoSincronizados', dibujar);
  dibujar();
});
