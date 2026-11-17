# Informe de pruebas y entrega de XERO-COL

## 1. Información general

### 1.1 Identificación

| Dato | Información |
| --- | --- |
| Sistema | XERO-COL |
| Asignatura | Herramientas de Programación III (ET0056) |
| Institución | Institución Universitaria Pascual Bravo |
| Integrante | Santiago Restrepo Durango |
| Equipo | 7 |

### 1.2 Versión

La versión objeto del informe es v19, correspondiente a la carpeta `XERO_v19_inicio_publico`.

### 1.3 Fecha

Las pruebas automatizadas que se presentan en este informe se ejecutaron el 17 de noviembre de 2026. Para los recorridos de navegador informados por el equipo no se verificaron registros individuales con fecha ni se les atribuye esa fecha.

## 2. Alcance y objetivo

### 2.1 Alcance

El objetivo es documentar el estado de la entrega y distinguir los resultados automatizados de los recorridos de navegador informados por el equipo. El alcance funcional comprende visitante, cliente, empleado y administrador; registro público; inicio de sesión; catálogo; inventario; productos; clientes; compras; ventas; historial del cliente; búsqueda de ventas; tipos de cambio y exportación CSV.

Las pruebas automatizadas y los casos de navegador no cubren de igual manera todas esas funciones. No se identificó una prueba automatizada específica de exportación CSV en los archivos de `tests/`; el autor informó haber comprobado su apertura en Excel, como se registra en el caso 13.

### 2.2 Exclusiones y verificaciones no realizadas

No se probaron pagos ni envíos reales, porque la aplicación no los implementa. Tampoco se probaron mecanismos de seguridad de servidor, porque no existe backend. En la sección 5.4 se documentan las comprobaciones informadas por el autor. El registro de pruebas de navegador de una versión anterior no demuestra por sí solo el resultado en v19.

## 3. Entorno de prueba

### 3.1 Navegador y servidor local

El entorno indicado para los recorridos manuales es Google Chrome y Visual Studio Code con la extensión Live Server, mediante `http://127.0.0.1:5500/index.html`. No se verificaron por separado el navegador, el servidor, el puerto ni la dirección realmente utilizados en los recorridos informados por el equipo. La dirección es un ejemplo local y el puerto puede variar.

### 3.2 Entorno de ejecución automatizada

El comando `node --version` devolvió `v26.2.0`. La consulta de `[System.Environment]::OSVersion.VersionString` devolvió `Microsoft Windows NT 10.0.26200.0`. No se obtuvo mediante la consulta de información del sistema el nombre comercial de la edición de Windows.

### 3.3 Datos de prueba

Se prevén las cuentas de demostración disponibles en la pantalla de acceso y los datos iniciales de la aplicación. En una revisión manual se puede utilizar **Restablecer datos** desde administración para recuperar la semilla; esta acción reemplaza los cambios locales. El autor informó haber comprobado el botón en el navegador, como se registra en el caso 17; también existen pruebas automatizadas sobre el restablecimiento.

## 4. Pruebas automatizadas

### 4.1 Comando

Desde la raíz del proyecto se ejecutó:

```text
node --test tests/*.test.js
```

### 4.2 Resultado conjunto

| Resultado | Cantidad |
| --- | ---: |
| Pruebas | 147 |
| Aprobadas | 147 |
| Fallidas | 0 |
| Omitidas | 0 |
| Canceladas | 0 |

### 4.3 Resultado por archivo

Cada archivo se ejecutó por separado con `node --test`; todos los procesos terminaron correctamente y todas sus pruebas pasaron.

| Archivo | Pruebas | Qué comprueba |
| --- | ---: | --- |
| `tests/api-timeout.test.js` | 6 | Límite de tiempo y manejo de respuestas y errores simulados de la API. |
| `tests/busqueda-ventas.test.js` | 4 | Búsqueda, filtros y controles de ventas. |
| `tests/clientes.test.js` | 11 | Validación, persistencia y compatibilidad de perfiles de cliente. |
| `tests/csp-gitignore.test.js` | 2 | Etiquetas CSP y entradas de `.gitignore`. |
| `tests/datos-iniciales.test.js` | 4 | Datos iniciales, ventas, vínculo y restablecimiento. |
| `tests/historial-cliente-venta.test.js` | 2 | Acceso al historial reducido del cliente seleccionado. |
| `tests/imagenes.test.js` | 18 | Referencias, tipos, tamaño, firmas y disponibilidad del almacenamiento de imágenes. |
| `tests/inicio-publico.test.js` | 4 | Contenido público de Inicio y elementos administrativos. |
| `tests/permisos.test.js` | 62 | Permisos por rol, accesos y validaciones. |
| `tests/quitar-lineas.test.js` | 5 | Retiro de líneas de borradores y rechazos por autoría o estado. |
| `tests/registro.test.js` | 12 | Registro de clientes, validaciones, unicidad y credenciales. |
| `tests/requisitos.test.js` | 12 | Vínculos, ventas, permisos y presentación simulada de USD. |
| `tests/ui-ventas-empleado.test.js` | 3 | Presentación simulada de controles e historial de venta. |
| `tests/vinculos-unicos.test.js` | 2 | Unicidad de vínculos y tratamiento de vínculos anteriores. |

### 4.4 Limitaciones

Estas pruebas revisan lógica, permisos, validaciones, almacenamiento y respuestas simuladas de la API; algunas simulan partes de la interfaz. No comprueban por sí solas el diseño visual ni el comportamiento completo en un navegador real, Excel o la conexión real con el proveedor.

## 5. Pruebas en el navegador

### 5.1 Criterio y evidencia

En la sección 5.2, **aprobado por reporte del equipo** significa que el equipo comunicó haber realizado el recorrido y considerarlo aprobado. No se inspeccionó evidencia individual de esos recorridos ni se repitieron en el navegador para este informe; el estado no debe interpretarse como una nueva verificación externa. En 5.3 se registran observaciones y en 5.4 el estado de las demás comprobaciones.

### 5.2 Recorridos informados por el equipo

| Número | Rol | Caso | Pasos resumidos | Resultado esperado | Resultado obtenido | Estado |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Visitante | Inicio y catálogo | Abrir Inicio, buscar productos y abrir una ficha. | Visualizar Inicio, resultados y ficha. | Recorrido aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 2 | Visitante | Precio aproximado en USD | Consultar Inicio o Catálogo con tasa disponible. | Mostrar un importe aproximado en USD. | Caso aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 3 | Cliente | Registro e inicio de sesión | Crear una cuenta de cliente e iniciar sesión. | Crear la cuenta y acceder al espacio del cliente. | Recorrido aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 4 | Cliente | Datos y compras | Abrir **Mi espacio** con la cuenta vinculada. | Consultar datos personales e historial correspondiente. | Caso aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 5 | Empleado | Inventario y clientes | Aplicar filtros y consultar la lista de clientes. | Mostrar inventario filtrado y clientes en modo lectura. | Recorrido aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 6 | Empleado | Crear y confirmar venta | Elegir un cliente, crear la venta, agregar producto y confirmar. | Completar la venta propia. | Recorrido aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 7 | Administrador | Panel y módulos | Revisar panel, Productos, Inventario, Compras, Ventas, Clientes y Empleados. | Acceder a los módulos administrativos. | Recorrido aprobado según lo informado por el equipo; sin evidencia individual revisada. | Aprobado por reporte del equipo |
| 8 | Administrador | Mensaje al guardar perfil | Guardar un perfil desde el formulario administrativo. | Mostrar «Perfil guardado. No se creó ninguna cuenta de acceso.». | Caso aprobado según lo informado por el equipo; la cadena también se localizó en `js/controlador/controlador.js`. | Aprobado por reporte del equipo |

### 5.3 Observaciones

| Número | Rol | Caso y pasos resumidos | Resultado esperado | Resultado obtenido | Estado |
| ---: | --- | --- | --- | --- | --- |
| 9 | Empleado y administrador | Manejar las pantallas de ventas. | Poder registrar y consultar ventas. | El equipo informa que funcionan, pero que su manejo resulta complejo. No se repitió el recorrido para este informe. | Con observación |
| 10 | Visitante | Revisar el enlace **Iniciar sesión** y la franja superior. | Enlace legible y franja simplificada. | El equipo señaló el contraste anterior y su ajuste en v17. La regla CSS existe en v17 y v19; no se midió el contraste. En v17 la franja indica «PROYECTO UNIVERSITARIO» y en v19 indica «XERO». | Con observación |
| 11 | Todos | Buscar dobles espacios en mensajes, etiquetas y textos alternativos. | Mantener textos consistentes. | Los mensajes de inicio de sesión revisados en v15 y v19 ya no tienen los dobles espacios indicados. Persisten `Precio  en COP *` en `admin-productos.html:116` e `Ilustración  de un reloj` en el atributo `alt` de `producto.html:51`. | Con observación |

### 5.4 Comprobaciones adicionales

| Número | Rol | Caso | Pasos resumidos | Resultado esperado | Resultado obtenido | Estado |
| ---: | --- | --- | --- | --- | --- | --- |
| 12 | Administrador y empleado | Segundo empleado | Crear perfil y cuenta e iniciar sesión. | La cuenta inicia sesión como empleado. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |
| 13 | Administrador | CSV en Excel | Exportar productos y abrir el archivo en Excel. | Las tildes se ven correctamente. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |
| 14 | Cliente, empleado y administrador | Ancho de 360 px | Abrir las pantallas a 360 píxeles. | Contenido y controles utilizables. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |
| 15 | Visitante | API con conexión | Abrir Inicio y Catálogo con acceso a la API. | Mostrar tasa y precios aproximados. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |
| 16 | Visitante | API sin conexión | Desconectar la red y abrir Inicio o Catálogo. | Mostrar el aviso y conservar precios en COP. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |
| 17 | Administrador | Restablecer datos | Confirmar Restablecer datos y revisar los registros. | Recuperar los datos iniciales y avisar si falla la limpieza de imágenes. | Verificado por el autor el 17 de noviembre de 2026. | Aprobado |

## 6. Pruebas de la API

### 6.1 Consulta y manejo de errores

`obtenerTasaUSD()` consulta `https://open.er-api.com/v6/latest/COP`, verifica la respuesta y limita la espera a cinco segundos mediante `AbortController`. `PreciosUSD.cargar()` muestra «No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.» cuando no puede obtener una tasa válida. El valor en USD es aproximado y no modifica el precio guardado en COP.

### 6.2 Cobertura y comprobaciones

`tests/api-timeout.test.js` y otras pruebas verifican condiciones de la consulta y presentación mediante respuestas o entornos simulados. Se comprobó la consulta con conexión en el catálogo publicado. El autor informó haber verificado tanto la conexión como la desconexión y el mensaje correspondiente, según los casos 15 y 16.

## 7. Defectos encontrados y correcciones

Las versiones indicadas corresponden a las copias asociadas a los cambios. La presencia actual se verificó mediante lectura del código o pruebas automatizadas; no se atribuye una prueba visual nueva a esta revisión.

| Versión | Descripción | Corrección o cambio presente | Verificación |
| --- | --- | --- | --- |
| v15 | Mensajes de acceso con espacios dobles. | Los mensajes «Usuario o contraseña incorrectos.» y «Esta cuenta está inactiva o su perfil no está disponible.» utilizan un espacio. | Lectura de `js/modelo/modelo.js` en v15 y v19. Los otros dos espacios dobles encontrados se detallan en 5.3. |
| v16 | Controles para agregar o confirmar visibles en ventas cerradas. | Se ocultan los controles correspondientes en las vistas de venta. | Revisión de `js/vista/vista.js` y `js/controlador/controlador.js`, más pruebas `ui-ventas-empleado.test.js` y `busqueda-ventas.test.js`. |
| v16 | Se requería consultar compras previas del cliente durante una venta del empleado. | El modelo ofrece `relojesCompradosPorCliente()` y el controlador y la vista presentan el historial reducido. | Lectura del código y pruebas `historial-cliente-venta.test.js` y `ui-ventas-empleado.test.js`. |
| v17 | El enlace de inicio de sesión requería ajustes visuales y la franja superior contenía texto más largo. | Se añadió una regla específica para el enlace y se simplificó el aviso. | Regla observada en `css/estilos.css` de v17 y v19; texto de franja revisado en ambas versiones. No se midió contraste. |
| v19 | Inicio contenía herramientas administrativas. | `index.html` conserva la página pública sin los identificadores administrativos retirados. | Búsqueda de los identificadores y ejecución de `tests/inicio-publico.test.js`. |

## 8. Conclusiones

### 8.1 Resultados

La suite automatizada de v19 terminó con 147 pruebas aprobadas y ninguna fallida. El equipo informó recorridos aprobados de los cuatro perfiles, pero para este informe no se revisaron sus evidencias individuales ni se repitieron esos recorridos de navegador. El autor informó haber verificado correctamente los casos 12 a 17 el 17 de noviembre de 2026.

### 8.2 Riesgos abiertos

Los dos textos con espacios dobles siguen presentes. El detalle de los recorridos informados por el equipo no se revisó en este informe, y algunos datos de documentación requieren confirmación del autor.

### 8.3 Próximos pasos

1. Conservar los datos que no deban perderse antes de probar el restablecimiento.
2. Conservar los registros disponibles de los casos verificados por el autor de la sección 5.4.
3. Revisar los dos textos con espacios dobles y las observaciones de manejo de ventas en una tarea de corrección autorizada.
4. Completar la documentación del equipo que requiere confirmación.
