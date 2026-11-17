'use strict';
Controlador.iniciarModulo( () => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  let categoria = 'Todas';
  const preciosUSD = PreciosUSD.crear(document.getElementById('estadoTasa'), dibujar);
  function dibujar() {
    const q = Modelo.normalizar(document.getElementById('buscar').value);
    const lista = Modelo.listar('productos').filter((p) => p.activo && (categoria === 'Todas' || p.categoria === categoria) && Modelo.normalizar(p.nombre + ' ' + p.id).includes(q));
    Vista.tarjetas('tarjetas', lista, Modelo.imagenes);
    preciosUSD.agregar('tarjetas', lista);
    document.getElementById('contadorResultados').textContent = lista.length + ' productos encontrados.';
    document.getElementById('sinResultados').classList.toggle('oculto', lista.length > 0);
    document.querySelectorAll('[data-categoria]').forEach((b) => { b.classList.toggle('seleccionado', b.dataset.categoria === categoria); b.setAttribute('aria-pressed', String(b.dataset.categoria === categoria)); });
  }
  const filtros = document.getElementById('filtros');
  ['Todas',...Modelo.categorias].forEach((nombre) => { const b = Vista.crear('button', nombre); b.type = 'button'; b.dataset.categoria = nombre; filtros.appendChild(b); });
  filtros.addEventListener('click', (e) => { const b = e.target.closest('[data-categoria]'); if (b) { categoria = b.dataset.categoria; dibujar(); } });
  Controlador.escuchar(document.getElementById('buscar'), 'input', dibujar);
  dibujar();
  preciosUSD.cargar();
});
