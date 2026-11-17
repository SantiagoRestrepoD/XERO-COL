'use strict';
Controlador.iniciarModulo( () => {
  if (!Controlador.puedeIniciarPagina()) { return; }
  const resumen = Modelo.resumen();
  const dl = document.getElementById('resumenAdmin');
  [['Referencias activas', resumen.referencias], ['Agotados activos', resumen.agotados], ['Unidades totales conservadas', resumen.unidades], ['Compras', Modelo.listar('compras').length], ['Ventas', Modelo.listar('ventas').length], ['Perfiles', Modelo.listar('clientes').length + Modelo.listar('empleados').length]].forEach(([nombre, valor]) => { const grupo = Vista.crear('div'); grupo.appendChild(Vista.crear('dt', nombre)); grupo.appendChild(Vista.crear('dd', valor)); dl.appendChild(grupo); });
});
