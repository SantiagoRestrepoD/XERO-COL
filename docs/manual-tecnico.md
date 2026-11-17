# Manual técnico de XERO-COL

## 1. Introducción

### 1.1 Propósito y alcance

XERO-COL es una tienda gestora de relojes de alcance académico para la materia Herramientas de Programación III. Permite consultar un catálogo y practicar la gestión de productos, inventario, clientes, empleados, compras y ventas. Sus registros y cuentas son ficticios; no procesa pagos ni organiza envíos reales.

### 1.2 Tecnologías

La aplicación emplea HTML5, CSS3 y JavaScript moderno con características de ES2020 y posteriores. Utiliza `localStorage` para el estado, IndexedDB para archivos de imagen y una API pública para el cambio de COP a USD. No tiene backend ni frameworks. El navegador necesita compatibilidad con Web Crypto, IndexedDB y las demás API utilizadas.

### 1.3 Ejecución con Live Server

1. Abrir en Visual Studio Code la carpeta que contiene `index.html`.
2. Instalar la extensión Live Server si aún no está instalada.
3. Hacer clic derecho en `index.html` y seleccionar **Open with Live Server**.
4. Abrir la dirección local que indique la extensión y utilizar el mismo navegador y origen para recuperar los datos guardados.

La tasa de cambio y las imágenes alojadas en enlaces externos requieren acceso a sus respectivos servidores. No es necesario instalar Node.js para usar la aplicación; sí se necesita para ejecutar sus pruebas.

## 2. Arquitectura por capas

### 2.1 Responsabilidades

| Capa | Responsabilidad |
| --- | --- |
| Modelo | `js/modelo/modelo.js` administra el estado, las validaciones y las autorizaciones de las operaciones. |
| Vista | `js/vista/vista.js` crea nodos, tablas, tarjetas y mensajes para presentar la información. |
| Controlador | `js/controlador/controlador.js` coordina eventos, formularios, confirmaciones y llamadas al modelo y a la vista. |
| Servicios | `js/servicios/` agrupa la consulta de la tasa, las imágenes y la presentación compartida de USD. |
| Páginas y arranque | `js/paginas/` inicia cada pantalla; `js/app.js` configura comportamiento común y validaciones de formularios. |

### 2.2 Dependencias y excepciones

Como criterio de organización, el controlador coordina modelo y vista; el modelo concentra las reglas y la vista presenta datos sin llamar directamente al controlador o al modelo. Los servicios aíslan operaciones compartidas. La implementación no es una separación estricta: los scripts de `js/paginas/` llaman directamente a `Modelo`, `Vista` y `Controlador`; `js/paginas/empleado.js` también registra eventos y consulta el DOM. `js/app.js` utiliza validadores de `Modelo`; `Modelo.restablecer()` llama a `ServicioImagenes.borrarTodas()`; y `js/servicios/mostrar-imagen.js` consulta `Modelo.imagenes` en el evento `pageshow`. `PreciosUSD` también manipula el DOM. Estas dependencias deben considerarse antes de modificar o reutilizar las capas.

### 2.3 Estructura de carpetas

```text
XERO_v19_inicio_publico/
├── *.html                 Páginas públicas y de cada rol
├── css/                   Estilos y fuentes declaradas
├── fonts/                 Archivos tipográficos y licencias
├── img/                   Imágenes locales
├── js/
│   ├── app.js             Inicio y validación comunes
│   ├── modelo/            Estado y reglas
│   ├── vista/             Presentación
│   ├── controlador/       Coordinación y eventos
│   ├── paginas/           Inicio de cada pantalla
│   └── servicios/         Tasa, imágenes y precios en USD
├── docs/                  Manuales y normas de la entrega
└── tests/                 Pruebas con Node.js
```

### 2.4 Ejemplo de flujo: confirmar una venta

1. En `empleado.html`, el evento registrado en `js/paginas/empleado.js` solicita una confirmación mediante `Controlador.confirmar()`.
2. Tras confirmar, se llama a `Modelo.transicion('ventas', ventaActual, 'confirmar')`.
3. `autorizarDocumento()` y `comprobarAutorizacionEnDatos()` comprueban el acceso y la sesión; `comprobarBorradorPropio()` verifica la autoría del empleado.
4. `transicion()` valida el borrador y sus líneas, usa `moverExistencias()` y `actualizarVentas()`, y cambia su estado. `cambiar()` guarda la copia en `localStorage` antes de sustituir el estado en memoria.
5. `dibujarTodo()` vuelve a presentar la información y `Vista.mensaje()` muestra el resultado. Si una comprobación falla, se presenta el error y no se confirma la modificación de esa operación.

## 3. Descripción de módulos

Las funciones internas indicadas se nombran para facilitar la lectura del código; no todas se exportan para uso externo.

| Archivo | Responsabilidad | Funciones principales | Dependencias |
| --- | --- | --- | --- |
| `js/app.js` | Inicialización y validación común de formularios. | `validarCampo`, `mostrarError`, `limpiarError` | DOM, `Controlador`, validadores de `Modelo`. |
| `js/modelo/modelo.js` | Estado, cuentas, reglas, documentos e inventario. | `cambiar`, `validar`, `guardarDocumento`, `transicion`, `registrarCliente`, `evaluarAcceso` | `localStorage`, Web Crypto, `ServicioImagenes` al restablecer y API del navegador. |
| `js/vista/vista.js` | Construcción y actualización de componentes. | `crear`, `mensaje`, `tabla`, `tarjetas`, `dibujarCliente`, `dibujarNavegacion` | DOM, `Intl`, `ImagenProducto` para las imágenes. |
| `js/controlador/controlador.js` | Eventos comunes, formularios y gestión de módulos. | `iniciarComun`, `iniciarPersonas`, `iniciarDocumentos`, `iniciarProductos`, `iniciarInventario`, `iniciarInicio`, `iniciarRegistro` | `Modelo`, `Vista`, servicios de imágenes y precios, DOM. |
| `js/paginas/admin-clientes.js` | Inicia la administración de clientes. | `Controlador.iniciarModulo`, `Controlador.iniciarPersonas('clientes')` | `Controlador`. |
| `js/paginas/admin-compras.js` | Inicia los documentos de compra. | `Controlador.iniciarModulo`, `Controlador.iniciarDocumentos('compras')` | `Controlador`. |
| `js/paginas/admin-empleados.js` | Inicia la administración de empleados. | `Controlador.iniciarModulo`, `Controlador.iniciarPersonas('empleados')` | `Controlador`. |
| `js/paginas/admin-inventario.js` | Inicia ajustes y consultas de inventario. | `Controlador.iniciarModulo`, `Controlador.iniciarInventario` | `Controlador`. |
| `js/paginas/admin-productos.js` | Inicia la tabla y el formulario de productos. | `Controlador.iniciarModulo`, `Controlador.iniciarProductos` | `Controlador`. |
| `js/paginas/admin-ventas.js` | Inicia los documentos de venta. | `Controlador.iniciarModulo`, `Controlador.iniciarDocumentos('ventas')` | `Controlador`. |
| `js/paginas/admin.js` | Presenta los indicadores del panel. | `Controlador.iniciarModulo`, `Modelo.resumen`, `Modelo.listar`, `Vista.crear` | `Controlador`, `Modelo`, `Vista`. |
| `js/paginas/catalogo.js` | Presenta y filtra el catálogo y sus precios aproximados. | `dibujar`, `Vista.tarjetas`, `PreciosUSD.crear` | `Controlador`, `Modelo`, `Vista`, `PreciosUSD`. |
| `js/paginas/cliente.js` | Presenta el perfil y las ventas disponibles de la cuenta. | `dibujar`, `Vista.dibujarCliente` | `Controlador`, `Modelo`, `Vista`. |
| `js/paginas/empleado.js` | Coordina inventario, clientes y ventas del empleado. | `dibujarInventario`, `dibujarClientes`, `dibujarVenta`, `dibujarTodo` | `Controlador`, `Modelo`, `Vista`. |
| `js/paginas/index.js` | Inicia la página de inicio pública. | `Controlador.iniciarModulo`, `Controlador.iniciarInicio` | `Controlador`. |
| `js/paginas/login.js` | Coordina acceso y visibilidad de la contraseña. | `Modelo.prepararAccesoDemo`, `Modelo.iniciarSesionDemo` | `Controlador`, `Modelo`, `Vista`. |
| `js/paginas/producto.js` | Muestra la ficha del producto. | `Modelo.producto`, `Vista.moneda`, `ImagenProducto.asignar` | `Controlador`, `Modelo`, `Vista`, `ImagenProducto`. |
| `js/paginas/registro.js` | Inicia el formulario de registro público. | `Controlador.iniciarModulo`, `Controlador.iniciarRegistro` | `Controlador`. |
| `js/servicios/api.js` | Solicita y valida la tasa de cambio. | `obtenerTasaUSD` | `fetch`, `AbortController`, temporizador. |
| `js/servicios/imagenes.js` | Valida y almacena archivos de imagen. | `disponible`, `validarArchivo`, `guardarImagen`, `obtenerImagen`, `eliminarImagen`, `borrarTodas` | IndexedDB, archivos y Web Crypto. |
| `js/servicios/mostrar-imagen.js` | Resuelve referencias y administra URL temporales. | `asignar`, `liberar`, `liberarContenedor` | `ServicioImagenes`, `URL`, DOM y `Modelo.imagenes` en `pageshow`. |
| `js/servicios/precios-usd.js` | Comparte la presentación del valor aproximado en USD. | `PreciosUSD.crear`, `agregar`, `cargar` | `obtenerTasaUSD`, DOM, `Intl.NumberFormat`. |

## 4. Datos y almacenamiento

### 4.1 Estado local

La clave de `localStorage` es `xeroUniversidadDemoV1`. `inicial()` crea el objeto con `version`, `productos`, `clientes`, `empleados`, `compras`, `ventas`, `movimientos`, `tema` y `rol`. La preparación del acceso incorpora `usuariosDemo`; `sesionDemo` se utiliza cuando corresponde una sesión. Los productos guardan el precio en COP como texto decimal y los documentos guardan importes de sus líneas en centavos enteros.

Una cuenta de cliente se vincula por `clienteId` al identificador de un perfil de cliente. Una cuenta de empleado puede contener `empleadoId` de su perfil; en una venta creada por empleado, `empleadoId` identifica a la cuenta creadora. Una venta también conserva `clienteId` y el texto `contacto`. Las ventas antiguas sin `clienteId` no se asignan a un historial de cliente, y las que carecen de `empleadoId` no aparecen en «Mis ventas»; administración puede consultarlas.

`cambiar()` sincroniza, crea una copia, aplica la operación y guarda antes de reemplazar el estado en memoria. No existe un bloqueo transaccional entre pestañas: la lectura previa no elimina todas las condiciones de carrera.

### 4.2 Imágenes en IndexedDB

La base es `xeroImagenes`, con el almacén `imagenes`. El producto guarda `idb:` seguido del identificador, no el archivo binario en el JSON de `localStorage`. También admite las seis ilustraciones locales y enlaces HTTPS válidos. El servicio verifica un máximo de 500 KB (512 000 bytes), tipo declarado y firma de WebP, PNG o JPEG. `ImagenProducto.asignar()` genera URL de objeto para mostrar los archivos; las funciones de liberación las revocan cuando dejan de utilizarse.

### 4.3 Datos iniciales

`inicial()` contiene seis productos Demo, tres clientes de ejemplo, un empleado activo de ejemplo, dos ventas confirmadas y las listas de compras y movimientos vacías. Cada venta inicial contiene dos líneas y está vinculada al primer o al segundo cliente. La cuenta inicial `cliente.demo` se vincula a `cliente-demo-01`; el empleado de ejemplo no recibe una cuenta adicional. `tema` comienza en `claro` y `rol` en `null`. Los datos existentes en el navegador no se reemplazan automáticamente por esta semilla.

### 4.4 Restablecimiento

`Modelo.restablecer()` exige autorización administrativa y reemplaza el estado local por `inicial()`. Luego intenta vaciar el almacén de imágenes con `ServicioImagenes.borrarTodas()`. Si esa limpieza falla, devuelve `imagenesBorradas: false`; el reemplazo del estado ya efectuado no se revierte. Las cuentas de demostración se preparan nuevamente cuando se necesita el acceso.

## 5. Control de acceso por rol

### 5.1 Páginas y operaciones

| Perfil | Páginas según `politicaAcceso` | Alcance principal |
| --- | --- | --- |
| Visitante | `index.html`, `catalogo.html`, `producto.html`, `login.html`, `registro.html` | Navegar, consultar productos, iniciar sesión o registrar una cuenta de cliente. |
| Cliente | Páginas públicas y `cliente.html` | Consultar el perfil vinculado y las ventas asociadas a su `clienteId`. |
| Empleado | Páginas públicas y `empleado.html` | Consultar inventario y datos reducidos de clientes; crear, completar y confirmar sus ventas propias y consultar el historial reducido del cliente seleccionado. |
| Administrador | Páginas públicas, `admin.html`, `admin-productos.html`, `admin-inventario.html`, `admin-compras.html`, `admin-ventas.html`, `admin-clientes.html` y `admin-empleados.html` | Administrar productos, inventario, perfiles, cuentas y documentos; vincular perfiles; anular documentos y restablecer datos. |

El empleado no puede anular ventas ni modificar ventas ajenas. Nadie edita un documento confirmado como si fuera borrador; el administrador puede anularlo con las comprobaciones correspondientes. El historial reducido para empleados se limita a nombre, fecha y precio de líneas de ventas confirmadas del cliente activo elegido. La lista de clientes entregada al empleado contiene `id`, nombre, correo y estado.

### 5.2 Evaluación de rutas

`evaluarAcceso()` toma el último segmento de la ruta, elimina consulta y fragmento cuando se pasan en el argumento, y normaliza a minúsculas. Consulta `politicaAcceso`, trata el patrón `admin-*.html` como administrativo y rechaza rutas desconocidas. La comprobación por nombre de página no depende del prefijo del subdirectorio, por lo que se adapta a rutas bajo un subdirectorio de GitHub Pages; esto describe la lógica, no verifica una publicación existente. Si falta sesión o el rol no corresponde, devuelve el destino y el motivo de redirección.

### 5.3 Límite de seguridad

Las comprobaciones del modelo y de las páginas se ejecutan en el navegador. Una persona con control sobre este puede modificar el código o el almacenamiento; los controles no sustituyen autenticación, autorización ni protección de datos en un servidor.

## 6. API consumida

### 6.1 Proveedor y solicitud

El código consulta ExchangeRate-API Open Access mediante `GET https://open.er-api.com/v6/latest/COP`. La URL base es `https://open.er-api.com/v6/`; `COP` se envía en la ruta como moneda base, sin parámetros de consulta ni clave en el código.

### 6.2 Respuesta validada

`obtenerTasaUSD()` comprueba `respuesta.ok`, que `result` sea `success`, que `base_code` sea `COP`, que `rates` sea un objeto y que `rates.USD` sea un número finito mayor que cero. No se incluye un ejemplo de tasa numérica para evitar presentar una cotización no comprobada.

### 6.3 Tiempo límite y errores

`AbortController` cancela la operación tras cinco segundos, incluido el tiempo de lectura del cuerpo. El temporizador se limpia en `finally`. Ante una caída de red, HTTP no correcto, JSON o tasa inválidos, o agotamiento del tiempo, `PreciosUSD.cargar()` muestra: «No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.» Durante la consulta muestra «Cargando tasa de cambio...». La consulta del catálogo y los precios en COP siguen disponibles.

### 6.4 Presentación

`PreciosUSD.agregar()` multiplica el precio en COP por la tasa obtenida y usa `Intl.NumberFormat('es-CO', ...)` para el importe aproximado. Inicio y Catálogo muestran el resultado; el precio almacenado permanece en COP.

## 7. Procesos principales

### 7.1 Registro público de cliente

1. `registro.html` carga `js/paginas/registro.js`, que inicia `Controlador.iniciarRegistro()`.
2. El controlador obtiene los campos y llama a `Modelo.registrarCliente()`. El formulario no asigna el rol; el modelo solo admite `cliente`.
3. `validarCliente()` y las comprobaciones de registro validan los campos, el usuario y el correo. `prepararAccesoDemo()` prepara las cuentas de ejemplo antes de comprobar duplicados.
4. `credencial()` genera una sal de 16 bytes y `derivarClaveDemo()` deriva la credencial con PBKDF2, SHA-256 y 100 000 iteraciones.
5. En `cambiar()` se revisan de nuevo usuario y correo y se crea un perfil nuevo y su cuenta con `clienteId` en una sola escritura del estado. Un fallo de esa escritura no deja una mitad de la pareja. No se vincula un perfil existente ni se inicia sesión automáticamente.

### 7.2 Inicio de sesión

1. `js/paginas/login.js` prepara las cuentas con `Modelo.prepararAccesoDemo()`.
2. Al enviar el formulario, `Modelo.iniciarSesionDemo()` busca el usuario normalizado, verifica estado y credencial y vuelve a comprobar la cuenta antes de guardar la sesión.
3. El resultado indica un destino por rol; el script navega a `cliente.html`, `empleado.html` o `admin.html`. `cerrarSesionDemo()` elimina la sesión y el rol reflejado en el estado.

### 7.3 Venta del empleado e historial

1. `Controlador.iniciarHistorialVentaEmpleado()` responde a la selección y consulta `Modelo.relojesCompradosPorCliente(clienteId)`; `Vista.dibujarHistorialClienteVenta()` presenta los datos reducidos.
2. El evento de `js/paginas/empleado.js` llama a `Modelo.guardarDocumento('ventas', ...)` con el cliente activo. El documento guarda `clienteId` y el identificador de la cuenta creadora en `empleadoId`.
3. `Modelo.guardarDetalle()` agrega un producto activo con la cantidad indicada y usa el precio del producto. `Modelo.quitarDetalle()` puede retirar una línea de un borrador propio.
4. La lista se obtiene con `Modelo.ventasDelEmpleado(cuentaId)` y el modelo restringe el acceso a la cuenta en sesión.

### 7.4 Confirmación y anulación

1. `Controlador.confirmar()` solicita confirmación en la interfaz. `Modelo.transicion()` comprueba permisos, estado, detalle y sesión.
2. Confirmar una venta descuenta existencias con `moverExistencias()`, registra los conteos de venta y establece `confirmado`.
3. La anulación está reservada al administrador y exige motivo. Si el documento estaba confirmado, intenta revertir las existencias y, cuando existe `ventasContabilizadas`, el contador correspondiente. Una venta antigua sin esa marca conserva el contador previo. Si las reglas de inventario impiden la reversión, la operación falla sin aplicar cambios parciales.

### 7.5 Búsqueda de ventas de administración

`Controlador.iniciarDocumentos('ventas')` alterna el formulario y la tabla. Al cambiar la búsqueda o el estado, `Modelo.filtrarVentas()` filtra la lista autorizada por contacto, identificador, fecha, nombre de producto y estado sin recargar la página.

### 7.6 Exportación de productos

Dentro de `Controlador.iniciarProductos()`, `obtenerProductos()` aplica búsqueda, filtros y orden. `exportarCsv()` utiliza la lista completa filtrada y ordenada, no solo la página visible. `escaparCsv()` escapa comas, comillas y saltos de línea y antepone una comilla simple a texto que comienza con `=`, `+`, `-`, `@`, tabulador o retorno de carro. El archivo usa `Blob`, BOM UTF-8 y un enlace temporal; precio y cantidad se conservan como valores numéricos. Si no hay filas, se muestra un aviso y no se descarga el archivo.

## 8. Validaciones

La tabla reúne reglas de negocio y mensajes literales del modelo y de los servicios. `js/app.js` también puede mostrar primero mensajes genéricos compuestos con el nombre, los límites y el tipo del campo; por ello no siempre se ve primero el texto del modelo.

| Campo o condición | Regla | Mensaje exacto del código |
| --- | --- | --- |
| Nombre de cliente o empleado | Entre 2 y 150 caracteres. | `Escribe un nombre de 2 a 150 caracteres.` |
| Teléfono de cliente | Obligatorio, de 7 a 10 dígitos; en empleado es opcional, pero se valida si se escribe. | `El teléfono es obligatorio.` / `El teléfono debe contener entre 7 y 10 dígitos.` |
| Correo | Formato validado por `validarCorreo`, máximo 120 caracteres; obligatorio en el registro. | `El correo es obligatorio.` / `Escribe un correo válido de hasta 120 caracteres.` |
| Dirección de cliente | Opcional; de 5 a 120 caracteres si se escribe. | `La dirección debe tener entre 5 y 120 caracteres.` |
| Ciudad de cliente | Opcional; de 2 a 60 letras Unicode y espacios. | `La ciudad debe tener entre 2 y 60 letras y espacios.` |
| Cédula de cliente | Opcional; de 6 a 10 dígitos si se escribe. | `La cédula debe contener entre 6 y 10 dígitos.` |
| Usuario de acceso | Normalizado, de 3 a 60 caracteres; inicia con letra o número y admite letras, números, punto, guion y guion bajo. Debe ser único. | `Usuario: de 3 a 60 caracteres; letras, números, punto, guion o guion bajo, sin espacios.` / `Ya existe ese usuario de acceso.` |
| Correo de cuenta de registro | No puede corresponder a otra cuenta o a su perfil vinculado. | `Ya existe una cuenta con ese correo.` |
| Contraseña y confirmación | De 8 a 100 caracteres; confirmación idéntica. | `La contraseña debe tener de 8 a 100 caracteres.` / `Las contraseñas no coinciden.` |
| Nombre de producto | Obligatorio, único y de 3 a 60 caracteres normalizados. | `El nombre es obligatorio.` / `El nombre debe tener de 3 a 60 caracteres normalizados.` / `Ya existe un producto con ese nombre.` |
| Precio de producto | Número finito no negativo, de 0 a 9999999999.99 COP, sin separadores y con hasta dos decimales. | `El precio es obligatorio, numérico, finito y no negativo.` / `Precio: de 0 a 9999999999.99 COP, sin separadores y con hasta dos decimales.` |
| Cantidad de producto | Entero entre 0 y 500. | `La cantidad debe ser entera entre 0 y 500.` |
| Categoría de producto | `Clásicos`, `Deportivos` o `Urbanos`. | `Elige una categoría permitida.` |
| Imagen de producto | Ilustración permitida, URL HTTPS válida o referencia `idb:` no vacía. | `Elige una ilustración, un enlace HTTPS válido o una imagen subida.` |
| Archivo de imagen | WebP, PNG o JPEG, firma compatible y hasta 500 KB. | `Solo se permiten imágenes WebP, PNG o JPEG.` / `El contenido del archivo no coincide con un formato de imagen permitido.` / `La imagen no debe superar los 500 KB.` |
| Variación de inventario | Entero entre -500 y 500, distinto de cero; resultado entre 0 y 500. | `La variación debe ser entera entre -500 y 500, distinta de cero.` / `La operación requiere productos activos y existencias finales entre 0 y 500. No se aplicó ningún cambio.` |
| Motivo de ajuste | De 3 a 500 caracteres. | `Escribe un motivo de 3 a 500 caracteres.` |
| Contacto y observaciones de documento | Contacto de 2 a 150 caracteres; notas de hasta 1000. | `Indica un contacto de 2 a 150 caracteres y notas de hasta 1000.` |
| Cliente de venta | Debe ser un perfil activo. | `Selecciona un perfil de cliente activo para la venta.` |
| Producto de detalle | Debe estar activo y no repetirse en el documento. | `Selecciona un producto activo.` / `Ese producto ya está en el documento. Edita su línea.` |
| Cantidad de detalle | Entero de 1 a 500. | `Indica una cantidad.` / `La cantidad debe ser entera entre 1 y 500.` |
| Precio de detalle | Sin separadores, no negativo, hasta dos decimales y dentro del límite de importe. | `Precio: número sin separadores, desde 0, con máximo dos decimales.` / `El importe supera el límite de la aplicación.` |
| Detalle para confirmar | Al menos una línea en un borrador. | `Agrega al menos un detalle antes de confirmar.` |
| Motivo de anulación | De 3 a 500 caracteres. | `Escribe un motivo de anulación de 3 a 500 caracteres.` |
| Vínculo de cuenta cliente | Un perfil no puede asignarse a otra cuenta cliente. | `Ese perfil ya está vinculado a otra cuenta.` |

Los campos opcionales de cliente vacíos se guardan como `No indicado`. Los perfiles antiguos que no los contienen siguen siendo legibles.

## 9. Pruebas

### 9.1 Ejecución y resultado

Desde la raíz del proyecto se ejecuta:

```text
node --test tests/*.test.js
```

La ejecución realizada para este manual produjo **147 pruebas, 147 aprobadas, 0 fallidas, 0 canceladas y 0 omitidas**. El recuento corresponde al estado del proyecto revisado; no representa cobertura total.

### 9.2 Archivos de prueba

Los recuentos siguientes se obtuvieron ejecutando cada archivo individualmente con `node --test`.

| Archivo | Pruebas | Cobertura principal |
| --- | ---: | --- |
| `tests/api-timeout.test.js` | 6 | Plazo, cancelación y errores simulados de la consulta de tasa. |
| `tests/busqueda-ventas.test.js` | 4 | Búsqueda, filtros y controles de ventas administrativas. |
| `tests/clientes.test.js` | 11 | Validaciones, persistencia y compatibilidad de perfiles. |
| `tests/csp-gitignore.test.js` | 2 | Política CSP y entradas de `.gitignore`. |
| `tests/datos-iniciales.test.js` | 4 | Semilla, ventas iniciales, vínculo y restablecimiento. |
| `tests/historial-cliente-venta.test.js` | 2 | Historial reducido del cliente seleccionado y permisos. |
| `tests/imagenes.test.js` | 18 | Referencias, tipo, tamaño, firma y disponibilidad de imágenes. |
| `tests/inicio-publico.test.js` | 4 | Contenido público de Inicio y permanencia del control administrativo. |
| `tests/permisos.test.js` | 62 | Acciones autorizadas y rechazadas, roles y exposición de datos. |
| `tests/quitar-lineas.test.js` | 5 | Retiro de líneas propias y rechazo en otros estados o ventas. |
| `tests/registro.test.js` | 12 | Registro, unicidad, validaciones, vínculo y escritura. |
| `tests/requisitos.test.js` | 12 | Vínculos, ventas, permisos y presentación simulada de USD. |
| `tests/ui-ventas-empleado.test.js` | 3 | Controles y presentación simulada de ventas del empleado. |
| `tests/vinculos-unicos.test.js` | 2 | Unicidad de vínculo y conservación de duplicados antiguos. |

### 9.3 Límites de la verificación

Las pruebas anteriores utilizan simulaciones para varias API y componentes. No demuestran por sí solas el diseño visual en un navegador real, el comportamiento a 360 píxeles ni la consulta real de la API en línea o sin conexión. Para este manual no se ejecutó una comprobación manual nueva de esos casos; su resultado no está verificado. Una revisión posterior puede abrir el proyecto con Live Server, recorrer cada rol, reducir el ancho a 360 píxeles y desconectar la red para comprobar el aviso de tasa.

## 10. Normas de codificación

`docs/normas-codificacion.md` recomienda `camelCase` para variables y funciones, `kebab-case` para archivos nuevos HTML y CSS, dos espacios de sangría, comentarios en español, ausencia de mensajes de depuración y secretos, separación de responsabilidades y presentación segura del texto. También describe BEM para bloques, elementos con `__` y modificadores con `--`, y permite conservar clases compartidas aún no migradas.

En el código revisado existen nombres como `guardarDocumento` y `admin-productos.html`, y se usan `textContent` y nodos para presentar datos. Una búsqueda en `js/` no encontró `innerHTML` ni `console.log`. Las excepciones de dependencias aparecen en la sección 2.2. BEM se usa en clases como `tarjeta__precio`, pero no es universal: también existen clases como `menu-global` y `aviso-demo`, por lo que no se afirma una migración completa. La revisión de ejemplos y búsquedas no demuestra que cada línea cumpla todas las normas de formato.

## 11. Seguridad y limitaciones

### 11.1 Presentación de texto

Los datos variables revisados se insertan mediante `textContent`, atributos y creación de nodos. La búsqueda en los scripts no encontró `innerHTML`; esto reduce la necesidad de interpretar texto de usuario como marcado, pero no convierte al navegador en un entorno confiable frente a modificaciones locales.

### 11.2 Cuentas de ejemplo

Las credenciales de demostración aparecen deliberadamente en el código y en la pantalla de acceso. Las contraseñas se derivan para el almacenamiento con PBKDF2, pero la exposición de las claves iniciales y la ausencia de backend hacen que las cuentas sean solo de práctica. No deben utilizarse contraseñas personales.

### 11.3 Restricciones

Los datos permanecen en el navegador y en su origen; diferentes perfiles de navegador u orígenes tienen almacenamiento independiente, mientras que quienes comparten el mismo perfil y origen comparten el almacenamiento. Limpiar los datos del sitio puede eliminarlos. La aplicación carece de backend, procesamiento real de pagos y gestión real de envíos. Las URL externas y la tasa requieren conexión y dependen de servicios ajenos.

## 12. Uso de herramientas de IA

Durante el desarrollo del proyecto el equipo usó herramientas de inteligencia artificial: ChatGPT, Codex y Claude. Su uso fue de apoyo; las decisiones de diseño, el código entregado y la documentación fueron revisados y ajustados por el equipo.

Usamos estas herramientas para:

- Orientarnos sobre la organización de la aplicación y sus carpetas.
- Resolver dudas sobre JavaScript, HTML y CSS.
- Buscar la causa de errores cuando una función no funcionaba o un mensaje no aparecía.
- Redactar borradores de la documentación (manual de usuario, manual técnico y README), que el equipo revisó y corrigió.

### 12.1 Verificación de las respuestas

Cada respuesta se comprobó antes de usarse.

### 12.2 Alcance y limitaciones

Cada integrante debe poder explicar y modificar las partes del código que la IA ayudó a escribir.

## 13. Aportes del equipo

| Integrante | Aporte | Enlace al commit |
| --- | --- | --- |
| Santiago Restrepo Durango | Me encargué de la estructuración y creación del código, y de implementar los requerimientos del proyecto. La IA me ayudó a corregir errores. | No documentado |
