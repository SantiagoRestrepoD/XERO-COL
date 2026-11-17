# Normas de codificación

Estas normas orientan el trabajo del equipo en XERO. Las decisiones comerciales y los permisos permanecen en el modelo; la vista presenta datos y el controlador coordina las acciones.

## Nombres

- Usa `camelCase` para variables, funciones y métodos de JavaScript: `obtenerProductos`, `paginaActual`.
- Usa `kebab-case` para los nombres nuevos de archivos HTML y CSS: `admin-productos.html`, `normas-visuales.css`.
- Conserva nombres claros y descriptivos. Los identificadores ya existentes se cambian solo cuando la tarea lo requiere.

## Formato y comentarios

- Usa dos espacios por nivel de sangría, sin tabulaciones para la sangría.
- Escribe comentarios en español para explicar reglas o decisiones que no sean evidentes.
- Evita mensajes de depuración en la consola y no incluyas claves ni secretos en el código.

## Datos y presentación

- Inserta los datos de usuarios, almacenamiento y servicios con `textContent` y creación de nodos. No uses `innerHTML` con esos datos.
- Mantén el acceso y las reglas de datos en el modelo. La vista no consulta el modelo ni el controlador directamente.
- Comprueba errores de red, almacenamiento y validación sin impedir las funciones que siguen disponibles.

## Convención BEM

- Un **bloque** representa un componente independiente, por ejemplo `.tarjeta`, `.tabla` o `.formulario`.
- Un **elemento** usa dos guiones bajos: `.tarjeta__cuerpo`, `.tabla__celda`, `.formulario__campos`.
- Un **modificador** usa dos guiones: `.tarjeta--agotada`, `.tabla__fila--agotada`. Se añade junto a su bloque o elemento base.
- La grilla `formulario__campos` también se usa en grupos de filtros; estos incluyen la clase de bloque `formulario`.
- Al renombrar clases, actualiza HTML, selectores CSS y JavaScript que las crea o consulta. Comprueba estados, accesibilidad y diseño adaptable.
- Las clases compartidas que todavía no se hayan migrado se conservan hasta actualizar todos sus usos.
