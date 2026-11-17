# XERO-COL

Tienda gestora de relojes: catálogo, inventario, clientes, empleados, compras y ventas.

Proyecto académico de la materia Herramientas de Programación III (ET0056), Institución Universitaria Pascual Bravo. XERO es una demostración de catálogo y gestión de productos, inventario, perfiles, compras y ventas de relojes en el navegador. No procesa pagos, envíos ni operaciones comerciales reales.

- Integrante: Santiago Restrepo Durango.
- Número de equipo: 7.
- Sitio publicado en GitHub Pages: https://santiagorestrepod.github.io/XERO-COL/.

La aplicación usa HTML5, CSS3 y JavaScript sin frameworks ni backend. Guarda los datos de demostración en `localStorage` del navegador y las imágenes subidas en IndexedDB. Las sesiones y los controles de rol son académicos y manipulables desde el cliente; no ofrecen seguridad de servidor.

## Ejecutar con Live Server en Visual Studio Code

1. Abre Visual Studio Code y selecciona **Archivo → Abrir carpeta**. Elige la carpeta que contiene `index.html`.
2. Si no la tienes, instala la extensión **Live Server** desde el catálogo de extensiones de Visual Studio Code.
3. Haz clic derecho en `index.html` y selecciona **Open with Live Server**.
4. Navega por el catálogo o entra en **Iniciar sesión**. Las cuentas y contraseñas de ejemplo permanecen visibles en la página para la demostración académica; no escribas contraseñas personales.
5. Usa el mismo navegador y origen local para conservar sus datos. Otro origen o navegador tiene su propio almacenamiento.

Con Live Server en ejecución, se pueden consultar los datos guardados sin conexión a internet. La tasa de cambio y las imágenes por enlace externo necesitan conexión a sus proveedores.

## Cuentas de demostración

Las siguientes cuentas y contraseñas son **ficticias**, solo para la demostración. No utilices credenciales personales. Corresponden a las cuentas iniciales; si ya cambiaste los datos locales, su acceso puede ser diferente.

| Perfil | Usuario | Contraseña de ejemplo |
| --- | --- | --- |
| Cliente | `cliente.demo` | `DemoCliente123!` |
| Empleado | `empleado.demo` | `DemoEmpleado123!` |
| Administrador | `admin.demo` | `DemoAdmin123!` |

La cuenta `cliente.demo` comienza vinculada al perfil `Cliente Demo Uno` en los datos iniciales; el administrador puede cambiar o retirar el vínculo explícitamente. Crear un perfil desde administración no crea automáticamente una cuenta de acceso; el registro público de cliente sí crea un perfil nuevo y su cuenta vinculada. La creación de la cuenta vinculada a un empleado es una acción separada. Los datos que ya estén guardados en el navegador no se reemplazan automáticamente.

## Roles y permisos

Resumen basado en `tests/permisos.test.js` y en las comprobaciones de `js/modelo/modelo.js`:

| Rol | Acciones permitidas |
| --- | --- |
| Cliente | Crear su propia cuenta desde `registro.html` con usuario, contraseña y datos de contacto; consultar catálogo y fichas; ver precios aproximados en USD en Inicio y Catálogo; ver los datos y las ventas del perfil vinculado a su cuenta. |
| Empleado | Consultar catálogo, fichas e inventario; ver precios aproximados en USD en Inicio y Catálogo; ver nombre, correo y estado de clientes; crear ventas, añadir productos y confirmar únicamente las que creó. Al elegir un cliente para una venta puede ver nombre, fecha y precio de los relojes de sus ventas confirmadas. |
| Administrador | Consultar catálogo e inventario; gestionar productos, existencias, clientes, empleados y cuentas; vincular cuentas de cliente con perfiles; consultar compras y todas las ventas; crear, confirmar y anular ventas; restablecer los datos. En Ventas puede usar «Registrar venta» y «Ver ventas pasadas»; esta última permite buscar por cliente, producto, fecha o referencia. |

Las ventas confirmadas son de solo lectura para los tres roles. El empleado no puede anular ventas ni modificar ventas ajenas. La validación de permisos en JavaScript no reemplaza controles en un servidor.

El registro público solo crea cuentas de cliente; las cuentas de empleado y administrador no se crean desde ese formulario.

## Estructura

```text
Proyecto/
├── *.html               Páginas públicas y por rol
├── css/                 Estilos y declaración de fuentes
├── fonts/               Fuentes y licencias
├── img/                 Imágenes del proyecto
├── js/
│   ├── app.js           Inicio común
│   ├── modelo/          Datos, reglas y almacenamiento local
│   ├── vista/           Construcción de componentes visuales
│   ├── controlador/     Coordinación, eventos y operaciones
│   ├── paginas/         Inicializadores de las páginas
│   └── servicios/       Tasas de cambio e imágenes
├── docs/                Normas y manuales de la entrega
└── tests/               Pruebas automatizadas
```

## API de tipos de cambio

- Proveedor: [ExchangeRate-API Open Access](https://www.exchangerate-api.com/docs/free), sin clave en esta modalidad.
- URL base: `https://open.er-api.com/v6/`.
- Método y endpoint: `GET latest/COP`, es decir, `https://open.er-api.com/v6/latest/COP`.
- Parámetros: la moneda base `COP` forma parte de la ruta; no se envían parámetros de consulta ni una clave.
- `js/servicios/api.js` revisa `respuesta.ok`, el resultado, la moneda base y la tasa `rates.USD`. `js/servicios/precios-usd.js` presenta los precios aproximados en el índice y el catálogo. Mientras carga muestra un indicador; si falla, muestra un mensaje y conserva la consulta y los precios en COP. Los valores en USD no modifican el precio guardado.

Ejemplo de la estructura de la respuesta. Los valores son ilustrativos, se omitieron las demás monedas, y las tasas cambian con el tiempo:

```json
{
  "result": "success",
  "time_last_update_utc": "Mon, 16 Nov 2026 00:02:31 +0000",
  "base_code": "COP",
  "rates": {
    "COP": 1,
    "USD": 0.000302
  }
}
```

[Consultar respuesta completa](https://open.er-api.com/v6/latest/COP). Los datos se usan sujetos a los [términos del proveedor](https://www.exchangerate-api.com/terms).

Tasas de cambio por ExchangeRate-API (https://www.exchangerate-api.com).

## Fuentes tipográficas e imágenes

Las licencias incluidas identifican los siguientes proyectos como titulares de las fuentes; la fuente exacta de descarga de los archivos locales no está registrada.

| Fuente | Archivo y proyecto | Licencia |
| --- | --- | --- |
| Archivo Black | `fonts/ArchivoBlack-Regular.ttf`; Archivo Black Project Authors. | SIL Open Font License 1.1; texto incluido en [ArchivoBlack-OFL.txt](fonts/ArchivoBlack-OFL.txt). |
| Cairo | `fonts/Cairo.ttf`; Cairo Project Authors. | SIL Open Font License 1.1; texto incluido en [Cairo-OFL.txt](fonts/Cairo-OFL.txt). |

La procedencia y los permisos de uso de las imágenes no constan en los archivos revisados. El equipo debe documentarlos antes de la publicación:

- `img/hero.webp` y `img/watch-1.webp` a `img/watch-6.webp`: ilustraciones generadas con ChatGPT (OpenAI). Fecha de creación: 24 de octubre de 2026, aproximadamente a las 8:19 p. m.

Las imágenes añadidas mediante enlaces externos deben citarse aquí antes de publicar: incluye su origen, autoría y licencia o autorización correspondiente.

El código de la aplicación fue escrito por el equipo. No se copió código de páginas, tutoriales ni repositorios externos.

## Fuentes de documentación

- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch): `fetch` y `await` en `js/servicios/api.js`, función `obtenerTasaUSD()`, para solicitar la tasa de cambio.
- [MDN: Response: ok property](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok): `respuesta.ok` en `js/servicios/api.js`, función `obtenerTasaUSD()`, para comprobar si la respuesta HTTP fue correcta.
- [MDN: Window: localStorage property](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): `localStorage` en `js/modelo/modelo.js`, función `cambiar()`, para guardar el estado de la aplicación en el navegador.
- [MDN: JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) y [MDN: JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify): en `js/modelo/modelo.js`, función `copiar()`, para convertir valores a JSON y reconstruir una copia.
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat): en `js/vista/vista.js`, función `moneda()`, para dar formato a los precios en pesos colombianos.
- [MDN: Node: textContent property](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent): en `js/vista/vista.js`, función `crear()`, para insertar texto en los nodos de la interfaz.
- [MDN: EventTarget: addEventListener() method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener): en `js/controlador/controlador.js`, función `escuchar()`, para registrar manejadores de eventos.
- [MDN: Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob): en `js/controlador/controlador.js`, función `exportarCsv()` dentro de `iniciarProductos()`, para crear el archivo CSV descargable.
- [MDN: Array.prototype.sort()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort): en `js/controlador/controlador.js`, función `obtenerProductos()` dentro de `iniciarProductos()`, para ordenar la tabla de productos.
- [Documentación Open Access de ExchangeRate-API](https://www.exchangerate-api.com/docs/free): endpoint, estructura de datos, uso sin clave y atribución.

## Pruebas

Con Node.js instalado, ejecuta desde la carpeta del proyecto:

```text
node --test tests/*.test.js
```

La ejecución realizada para esta actualización terminó con **147 pruebas aprobadas y 0 fallidas**. Las pruebas automatizadas no sustituyen la revisión de la interfaz en un navegador real.

## Manuales y normas

- [Manual técnico](docs/manual-tecnico.md).
- [Manual de usuario](docs/manual-usuario.md).
- [Normas de codificación](docs/normas-codificacion.md).
