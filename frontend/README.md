# AI Ticket It · Aplicación mobile

React Native 0.81, React 19.1 y Expo SDK 54. Usá Node.js 22.13 o superior para Expo y las pruebas. La app utiliza los usuarios demo y el almacenamiento en memoria del backend.

## Arranque en Windows

Abrí las terminales desde Inicio de Windows. Si los servicios arrancan en un entorno aislado, pueden responder en la PC y quedar inaccesibles desde el teléfono.

En una terminal, desde la raíz del proyecto:

```powershell
cd backend
npm.cmd ci
$env:HOST = '0.0.0.0'
$env:PORT = '3000'
npm.cmd start
```

En otra terminal, desde la raíz:

```powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env
ipconfig
```

Editá `.env` y poné la IPv4 de la PC en esa red, por ejemplo `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api`. Para un teléfono físico, usá la IP de la PC. Con el emulador estándar de Android, podés usar `http://10.0.2.2:3000/api`.

```powershell
npm.cmd start
```

1. Conectá el teléfono y la PC a la misma red local de confianza. Abrí `http://<IPv4-de-la-PC>:3000/api/usuarios-demo` en el navegador del teléfono y comprobá que responde con JSON.
2. Abrí el QR de Expo con una versión de [Expo Go compatible con SDK 54](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/). En Android podés obtener esa versión en [Expo Go](https://expo.dev/go). En iPhone, usá la versión compatible de App Store indicada por Expo y permití el acceso a la red local si se solicita.
3. Si el navegador del teléfono no llega a la API, verificá IP, Wi‑Fi y que el backend escuche en `0.0.0.0:3000`. Si la API responde pero el QR falla, verificá disponibilidad de Metro en el puerto anunciado en la terminal. Si parece un bloqueo del firewall, revisá el acceso con quien administra el equipo.

Usá la app en la red local. Los usuarios demo y la API HTTP están pensados para esta prueba. Reiniciar Express restablece los datos. Los formularios de publicación usan hora argentina (UTC−03:00). Las fechas se muestran en hora argentina y los importes en ARS.

## Comprobaciones

Con las dependencias de ambas carpetas instaladas:

```powershell
npm.cmd test
npm.cmd run check
npx.cmd expo install --check
npm.cmd run export
```

`npm test` ejecuta cinco pruebas del cliente y una integración HTTP que arranca Express en un puerto efímero. La integración verifica publicación, catálogo, favoritos, permisos, reserva, pago, conversación, cancelación, reembolso y cupo liberado. También verifica uso y reseña con el reloj de prueba de Express en los momentos habilitados. `npm run export` genera bundles para Android e iOS en `dist/`.

### Expo en este entorno de Windows

Si Expo indica que no encuentra el SDK aunque esté instalado, y el diagnóstico muestra `EPERM` al resolver `C:\`, podés usar el lanzador local desde `frontend`. Usa la resolución nativa de Node para rutas del proyecto y guarda los archivos temporales de Expo dentro de `.expo/`.

```powershell
node --preserve-symlinks --preserve-symlinks-main scripts/expo-windows.cjs install --check
node --preserve-symlinks --preserve-symlinks-main scripts/expo-windows.cjs export --platform android --no-bytecode --max-workers 2
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.1.34'
node --preserve-symlinks --preserve-symlinks-main scripts/expo-windows.cjs start --go --lan --port 8081 --max-workers 2
```

En esta PC, la API escucha en `http://192.168.1.34:3000/api` y Expo anuncia `exp://192.168.1.34:8081`. Si la IPv4 cambia, actualizá el archivo `.env` y el valor de `REACT_NATIVE_PACKAGER_HOSTNAME`. La verificación de dependencias, la exportación Android en JavaScript y la descarga del bundle de desarrollo desde la PC pasaron. La exportación con bytecode Hermes recibió un error de permisos al ejecutar el compilador de Windows.

### Recorrido en Android

1. En Chrome, abrí `http://192.168.1.34:3000/api/usuarios-demo`. Verificá que aparezcan Lucía, Martín y Elena. Si la página no carga, confirmá que Android esté en la misma red que la PC.
2. Abrí [Expo Go para Android con SDK 54](https://expo.dev/go?device=true&platform=android&sdkVersion=54) y escaneá el QR de Metro, o ingresá `exp://192.168.1.34:8081` manualmente en Expo Go. La primera pantalla debe mostrar el selector de usuarios.
3. Elegí **Martín Paz** → **Eventos** → **Recital de jazz**. Anotá el cupo de **General** y reservá una entrada. Abrí la compra registrada y pulsá **Simular pago**. Debe quedar **CONFIRMADA** por **ARS 125,50**.
4. Entrá en **Conversación de la compra** y enviá un mensaje. Cambiá a **Lucía Vega** → **Organizar** → **Recital de jazz** → **Compras de este evento**. Abrí la misma compra, entrá en la conversación y respondé.
5. Volvé a **Martín Paz** → **Mis compras**. Confirmá que se ve la respuesta y que la disponibilidad bajó en una entrada. Pulsá **Cancelar compra** y confirmá. El detalle debe mostrar **REEMBOLSADA**, **ARS 125,50** de reembolso y el cupo inicial de **General**. La conversación debe seguir disponible.

En el teléfono, elegí el perfil organizador y creá un evento que empiece más tarde, con dos tipos de entrada. Cambiá a un comprador, reservá y simulá el pago. Enviá un mensaje, cambiá al organizador y respondé desde las compras del evento. Volvé al comprador, cancelá y verificá el importe reembolsado, el cupo disponible y la conversación. Para verificar uso y reseña en el teléfono, reservá y pagá otra compra antes del inicio, marcala utilizada desde el inicio y publicá la reseña una vez terminado el evento.
