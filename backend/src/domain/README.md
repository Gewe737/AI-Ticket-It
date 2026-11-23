# Dominio de AI Ticket It — opción A

Implementación JavaScript mediante módulos ES (`.mjs`), sin dependencias externas. Punto de entrada: `index.mjs`. No contiene aplicación HTTP, almacenamiento, frontend ni autenticación.

## Uso y convenciones

- Crear `Usuario({ id, nombre, apellido, roles })`, con roles `COMPRADOR` y/o `ORGANIZADOR`, y `Categoria({ id, nombre, descripcion })` desde datos confiables. Resolver identidad y referencias existentes corresponde al exterior.
- Publicar con `Evento.crear(actor, { id, nombre, descripcion, categoria, inicio, fin, tipos, multimedia }, ahora)`. Cada tipo contiene `{ id, nombre, precio, cupoTotal }`; multimedia contiene URLs. No se permite editar lo publicado.
- Comprar con `evento.crearCompra(actor, { id, tipoId, cantidad }, ahora)`. El exterior asigna IDs únicos. La respuesta es una vista inmutable; nunca la entidad Compra interna.
- Operar con `pagarCompra`, `cancelarCompra` o `utilizarCompra`, pasando `(actor, compraId, ahora)`. Devuelven `{ realizada, mensaje }`. Las repeticiones autorizadas no alteran historial/cupo. Consultar luego con `consultarCompra(actor, compraId, ahora)`.
- Consultas privadas: `comprasDelComprador(actor, ahora)`, `comprasDelOrganizador(actor, ahora)`, `conversacion(actor, compraId)`. Mensajes: `enviarMensaje(actor, compraId, texto, ahora)`.
- Reseñas: `publicarResenia(actor, puntaje, comentario, ahora)`; favoritas: métodos de Usuario `guardarFavorito(actor, evento)`, `quitarFavorito(actor, eventoId)` y `favoritosPropios(actor)`.
- `catalogo(eventos, { texto, categoriaId, criterio, sentido, ahora })` recibe **todos** los eventos relevantes, incluidos históricos para reputación. Criterios: `fecha`, `precio`, `puntaje`; sentido: `asc`/`desc`. `reputacion(organizadorId, eventos)` y `reseniasPrevias(eventoConsultado, eventos, ahora)` consultan las reseñas desde cada Evento; no reciben otra colección que pudiera contradecirla.
- `detallePublico()` permite consultar también eventos pasados sin revelar compras privadas. `resenias()` expone solamente opiniones inmutables.

Importes: preferir texto decimal (`'125,50'` o `'125.50'`) o DineroARS; centavos, cupos y cantidades se representan mediante BigInt. Cantidades/cupos aceptan BigInt, números enteros seguros o cadenas de dígitos. No hay conversión implícita a JSON: la futura capa externa deberá representar estos valores sin perder precisión. DineroARS.toString() muestra dos decimales con coma. Puntaje es un Number entero 1..5.

Tiempo: todas las operaciones reciben `ahora`; se aceptan milisegundos de época, Date válido o ISO con segundos y zona explícita. Se conservan milisegundos numéricos, nunca referencias Date mutables. Los días restantes se calculan por calendario argentino. Los errores son ErrorDominio con `codigo` y mensaje; no tienen significado HTTP.

## Encapsulamiento y atomicidad

Evento es la única entrada a cambios de sus compras. Compra y TipoEntrada son colaboraciones internas, no exportadas por index.mjs. Los registros de mensaje, reseña y cambio de estado se representan como objetos congelados con identidad local/natural: no necesitan clases sin comportamiento. Las colecciones internas son privadas; las lecturas son inmutables.

Disponibilidad se deriva de PENDIENTE, CONFIRMADA y UTILIZADA; estado, del historial. Cancelación pagada prepara y anexa CANCELADA y REEMBOLSADA juntas. Los comandos son síncronos y no llaman código asíncrono ni persistencia. **Eso no reemplaza el contrato externo de concurrencia:** usar la raíz vigente, serializar operaciones competidoras por evento, no publicar copias obsoletas, asegurar visibilidad indivisible y conservación del estado ante fallas de publicación. Para favoritos la raíz es Usuario. Resolver esa coordinación queda fuera de la capa de dominio.

El exterior debe aportar el momento efectivo de evaluación y objetos auténticos. No se debe construir un Usuario desde roles enviados libremente por un cliente. Los eventos recibidos por las consultas deben ser únicos por ID, completos y consistentes; los IDs de compra deben ser globalmente únicos. Ninguna de estas convenciones constituye autenticación segura.

## Estado de validación

Implementación solicitada el 22/11/2026. No se ejecutaron pruebas por instrucción expresa de la usuaria. No se afirma validación funcional ni de concurrencia. La referencia de comportamiento es `openspec/changes/especificar-ai-ticket-it/design.md` y las cuatro especificaciones aprobadas.
