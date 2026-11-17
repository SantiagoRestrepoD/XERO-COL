'use strict';
Controlador.iniciarModulo( () => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  const id = new URLSearchParams(location.search).get('id');
  const producto = id && /^[A-Za-z0-9_-]{1,70}$/.test(id)? Modelo.producto(id): null;
  if (!producto || !producto.activo) {
    document.getElementById('tituloPagina').textContent = 'Producto no disponible';
    document.getElementById('fichaProducto').hidden = true;
    Vista.mensaje('Falta un identificador válido o este producto ya no está activo. Vuelve al catálogo.', true);
    return;
  }
  document.getElementById('tituloPagina').textContent = producto.nombre;
  const imagen = document.getElementById('imagenProducto');
  ImagenProducto.asignar(imagen, producto.imagen, Modelo.imagenes);
  imagen.alt = 'Imagen de un reloj de la categoría ' + producto.categoria;
  document.getElementById('precioProducto').textContent = Vista.moneda(producto.precio);
  document.getElementById('categoriaProducto').textContent = producto.categoria;
  document.getElementById('stockProducto').textContent = typeof producto.disponible === 'boolean' ? (producto.disponible ? 'Disponible' : 'Agotado') : producto.cantidad + ' unidades';

});
