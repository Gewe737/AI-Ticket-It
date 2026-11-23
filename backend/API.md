# API de AI Ticket It

## Ejecución local

Desde la carpeta `backend`, con Node.js 22 o superior:

```powershell
npm ci
npm start
npm test
```

La API queda en `http://127.0.0.1:3000/api`. `npm test` ejecuta el dominio y la integración sin servidores externos. Las pruebas HTTP abren un puerto efímero en loopback y controlan el reloj. `src/app.mjs` construye una aplicación con su propia memoria y `src/server.mjs` abre el puerto. Cada arranque carga tres usuarios demo, las categorías Música y Teatro y dos eventos que empiezan 48 y 120 horas después del arranque. Reiniciar borra los cambios y vuelve a cargar esos datos.

Desde Windows, para abrir el servidor a un teléfono en la misma red local de confianza:

```powershell
$env:HOST = '0.0.0.0'
$env:PORT = '3000'
npm start
```

Usá `ipconfig` para encontrar la IPv4 del equipo y configurá en el cliente `http://<IPv4-del-equipo>:3000/api`. Si el firewall bloquea la conexión, habilitá el puerto en el perfil de red privada. En el teléfono, la dirección debe apuntar a la PC. La configuración de red HTTP del cliente depende de su plataforma y del entorno de desarrollo.

## Identidad y formato

- Las rutas privadas requieren `X-Usuario-Demo` con el ID devuelto por `GET /usuarios-demo`. Para cambiar de identidad, cambiá esa cabecera en las siguientes solicitudes. Los permisos se resuelven con el usuario almacenado en el servidor. La cabecera permite suplantación y **no constituye autenticación segura**.
- Enviá los cuerpos como objetos JSON con `Content-Type: application/json`. El servidor toma los campos documentados para cada operación. El límite de cuerpo es 100 KiB.
- Los importes están en **ARS**. Al publicar, `precio` es texto decimal no negativo con hasta dos decimales, con punto o coma. En las respuestas todos los importes son cadenas con punto y dos decimales, por ejemplo `"125.50"`. `importePagado` e `importeReembolsado` son `null` hasta que la acción correspondiente se registre.
- `cantidad` y `cupoTotal` se envían como cadenas de dígitos que representan enteros positivos. `cantidad`, `cupoTotal`, `disponibilidad` y los enteros del cálculo de reputación salen como cadenas. Se puede conservar su exactitud en el cliente con texto o `BigInt`. El puntaje, las secuencias y los días restantes salen como números JSON.
- `inicio` y `fin` se envían como ISO 8601 con segundos y zona explícita, por ejemplo `"2030-04-05T12:00:00-03:00"`. La respuesta usa ISO UTC con sufijo `Z` para fechas de eventos, historial, mensajes y reseñas.
- Los IDs son cadenas asignadas por el servidor. Los tipos se identifican dentro del evento. Las compras tienen ID único dentro de la aplicación y se consultan con su evento.

## Usuarios, eventos y catálogo

Las rutas de la tabla empiezan con `/api`. «Pública» indica que la cabecera de identidad es opcional.

| Método y ruta | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `GET /usuarios-demo` | Pública | — | `200`, lista de `{id,nombre,apellido,roles}` |
| `GET /categorias` | Pública | — | `200`, lista de `{id,nombre,descripcion}` |
| `GET /eventos` | Pública | Query opcional `texto`, `categoriaId`, `criterio` (`fecha`, `precio`, `puntaje`), `sentido` (`asc`, `desc`) | `200`, catálogo de eventos futuros con reputación, incluidos los agotados. `[]` si no hay coincidencias |
| `POST /eventos` | Organizador | `nombre`, `descripcion`, `categoriaId`, `inicio`, `fin`, lista `tipos` de `{nombre,precio,cupoTotal}` y lista opcional `multimedia` de URL absolutas | `201`, evento publicado y cabecera `Location`. `400` por datos inválidos o categoría inexistente, `409` por fechas fuera de rango |
| `GET /eventos/:eventoId` | Pública | ID de evento | `200`, detalle disponible también para eventos pasados, con reputación y opiniones previas del mismo organizador. `404` si el evento no existe |
| `GET /mis-eventos` | Organizador | — | `200`, eventos publicados por el actor, incluidos los pasados |

El catálogo busca en nombre y descripción sin distinguir tildes ni mayúsculas. Combina texto y categoría. Los sentidos por defecto son fecha y precio ascendentes, y puntaje descendente. Precio usa el menor importe ofrecido, incluidos los tipos agotados. Los empates se resuelven por fecha, nombre e ID ascendentes. Al ordenar por puntaje, los organizadores sin calificaciones siempre quedan al final. Un valor repetido en un filtro reconocido se rechaza con `400`.

El evento contiene `id`, `nombre`, `descripcion`, `categoria`, `organizadorId`, `inicio`, `fin`, `multimedia`, `tipos`, `resenias`, `precioRepresentativo` y `agotado`. Cada tipo contiene `id`, `nombre`, `precio`, `cupoTotal`, `disponibilidad` y `agotado`.

Ejemplo de publicación con `X-Usuario-Demo: organizador`. Usá fechas futuras respecto del servidor.

```json
{"nombre":"Recital","descripcion":"Música en vivo","categoriaId":"musica","inicio":"2030-04-05T12:00:00-03:00","fin":"2030-04-05T14:00:00-03:00","tipos":[{"nombre":"General","precio":"125,50","cupoTotal":"3"}],"multimedia":["https://example.com/recital"]}
```

Ejemplo de búsqueda: `GET /api/eventos?texto=recital&categoriaId=musica&criterio=precio&sentido=desc`.

## Favoritos

| Método y ruta | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `GET /favoritos` | Comprador | — | `200`, lista de IDs favoritos propios, por ejemplo `["evento-1"]` |
| `PUT /favoritos/:eventoId` | Comprador | ID de evento existente, sin cuerpo | `200`, resultado de agregar al conjunto propio. `404` si el evento no existe |
| `DELETE /favoritos/:eventoId` | Comprador | ID de evento, sin cuerpo | `200`, resultado de quitar del conjunto propio |

Las mutaciones devuelven `{"realizada":true,"mensaje":"operación realizada"}` si cambian el conjunto. Guardar un evento ya guardado o quitar uno ausente devuelve `{"realizada":false,"mensaje":"operación ya realizada"}`. Se admiten eventos pasados.

## Compras, pagos y utilización

En la tabla, `{compra}` representa `/eventos/:eventoId/compras/:compraId`.

| Método y ruta | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `POST /eventos/:eventoId/compras` | Comprador distinto del organizador del evento | `{"tipoId":"tipo-1","cantidad":"3"}` | `201`, compra PENDIENTE con cupo reservado y cabecera `Location`. `400` por tipo o cantidad inválida, `409` por fecha o cupo |
| `GET /mis-compras` | Comprador | — | `200`, lista de compras del actor |
| `GET /eventos/:eventoId/compras` | Organizador propietario | ID de evento | `200`, objeto `{compras,tipos}` con estados y disponibilidad por tipo |
| `GET {compra}` | Comprador de la compra u organizador del evento | Ambos IDs | `200`, vista de la compra |
| `POST {compra}/pagar` | Comprador de la compra | Ambos IDs, sin cuerpo | `200`, resultado del pago simulado total. Confirma una PENDIENTE antes del inicio |
| `POST {compra}/cancelar` | Comprador de la compra | Ambos IDs, sin cuerpo | `200`, resultado de cancelar antes del inicio. Cancela una PENDIENTE o cancela y reembolsa automáticamente una CONFIRMADA |
| `POST {compra}/utilizar` | Organizador propietario | Ambos IDs, sin cuerpo | `200`, resultado de utilizar una CONFIRMADA completa desde el inicio |

Pago, cancelación y uso devuelven `{realizada,mensaje}`, igual que favoritos. Si la acción ya ocurrió, el participante autorizado recibe `realizada: false` aunque haya cambiado la fecha o el estado. Para una transición nueva inválida se devuelve `409`. Para obtener el estado vigente, consultá la compra. Crear otra compra genera una reserva independiente. Una reserva pendiente conserva su cupo hasta que se cancele o pase a otro estado.

La vista de compra incluye `id`, `eventoId`, `compradorId`, `tipoId`, `cantidad`, `precioUnitarioPactado`, `totalPactado`, `estado`, `historial`, `pagoRealizado`, `reembolsoRealizado`, `importePagado`, `importeReembolsado` e `informacionTemporal`. Solo una confirmada tiene `informacionTemporal`, por ejemplo `{"diasRestantes":1,"descripcion":"1 día"}` según el calendario argentino.

Por ejemplo, al cancelar una compra pagada de tres entradas de `"125.50"`, el detalle siguiente muestra `"estado":"REEMBOLSADA"` e `"importeReembolsado":"376.50"`. El historial agrega `CANCELADA` y `REEMBOLSADA` juntas. El segundo cambio tiene actor `{"tipo":"Sistema"}` y su campo `causa` referencia la secuencia de la cancelación.

## Conversación y reseñas

| Método y ruta | Acceso | Entrada | Respuesta |
|---|---|---|---|
| `GET {compra}/mensajes` | Comprador de la compra u organizador del evento | Ambos IDs | `200`, mensajes ordenados por secuencia |
| `POST {compra}/mensajes` | Mismos participantes, en cualquier estado | Ambos IDs y `{"texto":"¿Dónde se ingresa?"}` | `201`, mensaje con `compraId`, `secuencia`, `autorId`, `texto` y `enviado`. `400` por texto inválido |
| `POST /eventos/:eventoId/resenas` | Comprador con compra utilizada en el evento | ID de evento y `{"puntaje":5,"comentario":"Excelente"}` | `201`, reseña con `eventoId`, `compradorId`, `puntaje`, `comentario` y `publicada`. `409` si falta uso, todavía no finalizó o ya reseñó |

Al abrir o actualizar la conversación, usá el GET de mensajes. Tras enviar podés incorporar la respuesta del POST y volver a consultar para ver posibles respuestas del otro participante.

`GET /eventos/:eventoId` devuelve sus opiniones en `resenias` y las de otros eventos finalizados del organizador en `reseniasPrevias` como objetos `{eventoId,nombreEvento,resenia}`. El detalle y el catálogo incluyen `reputacion`. Ejemplo con tres reseñas que suman diez puntos:

```json
{"suma":"10","cantidad":"3","promedio":{"numerador":"10","denominador":"3"},"descripcion":"3,3"}
```

Sin opiniones, `promedio` es `null` y `descripcion` vale `"sin calificaciones"`.

## Errores

El cuerpo tiene la forma `{"error":{"codigo":"SIN_CUPO","mensaje":"No hay cupo suficiente."}}`. Usá `codigo` para decidir el flujo de la interfaz.

| HTTP | Códigos |
|---|---|
| 400 | `DATOS_INVALIDOS`, incluidos JSON mal formado, tipo incorrecto o validación de datos del dominio |
| 401 | `IDENTIDAD_DEMO_INVALIDA`, por identidad requerida ausente o desconocida |
| 403 | `NO_AUTORIZADO`, por rol, propiedad o participación. También cubre compras inexistentes dentro de un evento existente |
| 404 | `EVENTO_INEXISTENTE`, `RUTA_INEXISTENTE` |
| 409 | `SIN_CUPO`, `FUERA_DE_FECHA`, `OPERACION_NO_PERMITIDA`, `RESENIA_DUPLICADA` |
| 413 | `CUERPO_DEMASIADO_GRANDE` |
| 415 | `FORMATO_NO_ADMITIDO`, por codificación o compresión del cuerpo no admitida |
| 500 | `ERROR_INTERNO` |

## Consistencia en memoria

Las escrituras de compras, pagos, cancelaciones, usos, mensajes y reseñas adquieren un turno por evento. Al entrar, el servicio obtiene la instancia vigente y lee el reloj. La publicación incorpora un evento nuevo completamente validado con ID propio. Los cambios de favoritos adquieren un turno por usuario.

Cada comando de dominio aplica sus efectos de forma síncrona dentro de su turno. El estado vigente vive en la raíz, por lo que no hay un guardado posterior de una copia. Las lecturas preparan su vista de forma síncrona y observan la versión anterior o posterior a cada comando. La cancelación pagada agrega todo el historial nuevo en un solo cambio. Un rechazo libera el turno para la siguiente solicitud. Estas garantías se limitan a una instancia de aplicación dentro de un solo proceso.
