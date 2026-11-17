# Manual de usuario · XERO-COL

XERO-COL es una tienda gestora de relojes para una demostración académica. Permite consultar productos y, según el rol, gestionar inventario, perfiles y documentos de compra o venta. No realiza pagos ni envíos reales.

## Entrada al sistema

1. Abre la carpeta del proyecto en Visual Studio Code y, con la extensión Live Server instalada, haz clic derecho en `index.html` y selecciona **Open with Live Server**.
2. En la página de inicio, pulsa **Iniciar sesión**. Las credenciales de demostración aparecen en esa pantalla.
3. Escribe el usuario y la contraseña correspondientes y pulsa **Iniciar sesión**. La aplicación abre la página del rol: cliente, empleado o administrador.
4. Para terminar, pulsa **Cerrar sesión**.

Usa únicamente información y credenciales ficticias; no introduzcas contraseñas personales.

[CAPTURA: 1 - formulario de inicio de sesión con las cuentas de demostración]

## Cliente

El cliente puede consultar el catálogo, las fichas, el precio aproximado en USD cuando está disponible, sus datos y las ventas vinculadas a su perfil. No puede editar su perfil ni consultar el inventario administrativo.

### Crear una cuenta de cliente

1. En **Iniciar sesión**, pulsa **Crear cuenta de cliente**.
2. Completa nombre, teléfono, correo, usuario, contraseña y confirmación. La cédula, la dirección y la ciudad son opcionales. Usa datos ficticios.
3. El teléfono debe tener entre 7 y 10 dígitos. El correo es obligatorio, debe tener formato válido y no puede superar 120 caracteres. El usuario debe ser único y tener de 3 a 60 caracteres: letras, números, punto, guion o guion bajo, sin espacios. La contraseña debe tener entre 8 y 100 caracteres; las dos entradas de contraseña deben coincidir.
4. Pulsa **Crear cuenta**. Al aparecer **«Cuenta creada. Ya puedes iniciar sesión.»**, abre **Iniciar sesión** y entra con el usuario y la contraseña que elegiste.

El registro crea un perfil nuevo y una cuenta de cliente vinculada a él. Las cuentas de empleado y administrador son gestionadas por el administrador. Los datos se guardan en este navegador y origen; la aplicación no tiene seguridad de servidor.

### Consultar productos

1. Pulsa **Catálogo** o **Explorar catálogo**.
2. Utiliza la búsqueda y los filtros para encontrar un reloj.
3. Pulsa **Ver ficha** para consultar sus datos. En Inicio y Catálogo se muestra el valor aproximado en USD cuando llega la tasa; el precio en pesos colombianos sigue visible.

[CAPTURA: 2 - catálogo con filtros y precio aproximado en USD]

### Consultar datos y compras

1. Inicia sesión como cliente y abre **Mi espacio**.
2. En **Datos personales**, revisa la información del perfil vinculado. Un dato ausente se presenta como **No indicado**.
3. En **Compras**, consulta las ventas vinculadas a ese perfil y su estado. Las ventas anteriores sin vínculo no aparecen en este historial.
4. Si aparece el aviso de cuenta sin vincular, pide al administrador que seleccione el perfil correspondiente.

[CAPTURA: 3 - datos personales y compras del cliente]

## Empleado

El empleado puede consultar productos y existencias, ver nombre, correo y estado de los clientes, y crear y confirmar sus propias ventas. No puede editar productos, ajustar inventario, anular ventas ni administrar cuentas.

### Consultar inventario y clientes

1. Inicia sesión como empleado y abre su panel.
2. En **Inventario**, busca el producto o utiliza los filtros de estado y categoría. Usa **Ver ficha** para consultar el reloj.
3. En **Clientes**, consulta los nombres, correos y estados; la lista es de solo lectura.

[CAPTURA: 4 - consulta de inventario y clientes del empleado]

### Crear y continuar una venta

1. En **Registrar una venta**, selecciona un cliente activo y pulsa **Crear venta**. Debe existir previamente un perfil de cliente activo.
2. En **Agregar producto**, selecciona el reloj, indica la cantidad y pulsa **Agregar producto**. El precio se toma del catálogo.
3. Repite el paso para añadir productos. Para terminar, pulsa **Confirmar venta** y acepta la confirmación.
4. Para continuar después un borrador propio, pulsa **Continuar** en la fila correspondiente de **Mis ventas**. Las ventas confirmadas son de solo lectura.

[CAPTURA: 5 - creación de venta y tabla Mis ventas del empleado]

## Administrador

El administrador puede consultar todos los módulos, crear y modificar productos y perfiles, ajustar inventario, gestionar cuentas y vínculos, y registrar o anular compras y ventas. Los documentos confirmados quedan en solo lectura; la anulación se realiza mediante su acción específica y confirmación.

### Gestionar productos

1. Abre **Productos** y pulsa **Nuevo producto**. Completa los datos, selecciona una ilustración, un enlace HTTPS o una imagen admitida y pulsa **Guardar producto**.
2. En la tabla usa **Editar**, las acciones de estado o eliminación cuando corresponda y confirma si la aplicación lo solicita. Las cantidades se ajustan desde **Inventario**.
3. Usa búsqueda y filtros; pulsa un encabezado para cambiar el orden y elige el tamaño de página. **Exportar CSV** descarga los productos coincidentes con los filtros, en el orden actual.

[CAPTURA: 6 - formulario y tabla de productos de administración]

### Ajustar inventario

1. Abre **Inventario** y pulsa **Nuevo ajuste**.
2. Selecciona un producto, indica una variación entera positiva o negativa distinta de cero y escribe el motivo.
3. Pulsa **Registrar ajuste**. Consulta la tabla **Historial** para revisar los movimientos.

[CAPTURA: 7 - ajuste de inventario e historial]

### Registrar compras y ventas

1. En **Compras** o **Ventas**, pulsa **Nuevo borrador**.
2. Completa la cabecera. En una venta selecciona el **Perfil de cliente**. Pulsa **Guardar borrador**.
3. En la línea de detalle selecciona un producto, indica cantidad y precio y pulsa **Guardar detalle**; agrega las líneas necesarias.
4. Pulsa **Confirmar aplicación** y acepta la confirmación. Para anular un documento, escribe el motivo, pulsa **Anular aplicación** y confirma; las validaciones del inventario pueden impedir la reversión.
5. Utiliza la búsqueda y el filtro de estado para consultar los documentos.

[CAPTURA: 8 - editor de compra o venta con líneas de detalle]

### Gestionar clientes y vincular cuentas

1. En **Clientes**, pulsa **Nuevo perfil**, introduce el nombre y teléfono obligatorios y los demás datos ficticios que correspondan; luego pulsa **Guardar perfil**.
2. Para modificar o cambiar el estado de un perfil, utiliza las acciones de su fila.
3. En **Vincular cuenta de cliente**, selecciona la cuenta de acceso y el perfil y pulsa **Guardar vínculo**. Las cuentas no asignadas se identifican como **Sin vincular**; también se puede seleccionar esa opción para retirar un vínculo.

[CAPTURA: 9 - perfil de cliente y selector para vincular cuenta]

### Gestionar empleados

1. Abre **Empleados**, pulsa **Nuevo perfil**, completa los datos y guarda.
2. Usa las acciones de la tabla para editar o cambiar el estado del perfil. Las acciones de cuenta permiten crear o gestionar por separado el acceso del empleado.

[CAPTURA: 10 - tabla de empleados y gestión de acceso]

### Restablecer la demostración

En una página administrativa, pulsa **Restablecer datos** y lee el mensaje antes de confirmar. El restablecimiento reemplaza los datos locales de la demostración y elimina los cambios guardados; el almacenamiento de imágenes también se intenta limpiar.

[CAPTURA: 11 - confirmación para restablecer los datos de demostración]

## Errores y avisos comunes

- **«Tu cuenta aún no está vinculada a un perfil de cliente. Pide al administrador que la vincule.»**: solicita al administrador que vincule la cuenta con un perfil.
- **«Solo puedes modificar las ventas que creaste.»**: el empleado debe trabajar únicamente con sus propios borradores.
- **«El teléfono es obligatorio.»**: introduce el teléfono del perfil de cliente. Si el formato no es válido, se muestra **«El teléfono debe contener entre 7 y 10 dígitos.»**.
- **«El correo es obligatorio.»**: introduce un correo para crear la cuenta de cliente.
- **«Ya existe ese usuario de acceso.»**: elige otro usuario para tu cuenta.
- **«Ya existe una cuenta con ese correo.»**: utiliza un correo que no esté asociado a otra cuenta.
- **«La contraseña debe tener de 8 a 100 caracteres.»** y **«Las contraseñas no coinciden.»**: corrige la contraseña o su confirmación.
- **«La cédula debe contener entre 6 y 10 dígitos.»**: corrige la cédula ficticia o déjala vacía.
- **«Escribe un correo válido de hasta 120 caracteres.»**: corrige el formato o deja el campo opcional vacío.
- **«No fue posible cargar la imagen desde ese enlace.»**: revisa el enlace HTTPS y la conexión o selecciona otra imagen.
- **«No pudimos cargar la tasa de cambio. Puedes seguir consultando los precios en pesos colombianos.»**: comprueba la conexión; los precios en COP siguen disponibles.

## Datos y almacenamiento

Los datos de clientes y empleados y las cuentas son de demostración: utiliza datos ficticios. Los registros se guardan en el navegador mediante almacenamiento local y las imágenes subidas se guardan en IndexedDB. Cambiar de navegador, de perfil del navegador o borrar sus datos puede hacer que no veas la información anterior. La sesión y los permisos se aplican en el código del navegador y no ofrecen la seguridad de un servidor.
