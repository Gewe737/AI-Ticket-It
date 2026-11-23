# Decisiones y dudas de comportamiento

## Confirmado

- Por enunciado: Node + Express, React Native, ejecución local mobile, datos en memoria y los 12 casos de uso.
- Por Malena: pago y reembolso simulados dentro de la app; el organizador marca la compra utilizada.
- Por Malena (regla de cupos): crear una compra PENDIENTE reserva su cantidad; pagar conserva esa reserva sin descontar nuevamente; cancelar libera el cupo una sola vez. Sin vencimiento automático de reservas para la demo.
- Por Malena (cancelación): una PENDIENTE pasa a CANCELADA; una compra pagada CONFIRMADA pasa por CANCELADA y luego REEMBOLSADA automáticamente mediante la simulación.
- Por Malena (uso): solo el organizador del evento puede marcar una compra CONFIRMADA como UTILIZADA desde la fecha/hora del evento; todas las entradas de esa compra se utilizan juntas.
- Esta etapa solo especifica comportamiento. No autoriza implementación ni cierra el diseño.

## Decisiones aprobadas el 22/11/2026

Malena confirmó las recomendaciones de los 13 puntos en una única respuesta. Son decisiones del proyecto, diferenciadas de los requisitos explícitos de la cátedra. Los códigos P se conservan para trazabilidad; P2 también está confirmado.

| N.º | Referencia | Decisión |
|---|---|---|
| 1 | P1 | Pagar una PENDIENTE pasa a CONFIRMADA. Solo se paga antes del inicio del evento. UTILIZADA, CANCELADA y REEMBOLSADA no admiten nuevas transiciones iniciadas por el usuario; se conserva la transición automática CANCELADA → REEMBOLSADA ya confirmada para compras pagadas. |
| 2 | P1 | Repetir pago, cancelación o uso ya realizado informa “operación ya realizada”, sin cambios ni duplicados. Otras transiciones no permitidas se rechazan. Dos compras concurrentes nunca pueden reservar más que el cupo existente. |
| 3 | P3 | Cancelación estrictamente antes de fecha/hora de inicio. Incorporar fecha/hora de finalización, posterior al inicio, para permitir reseñas solo tras finalizar el evento y con compra UTILIZADA. Esta decisión reemplaza la aproximación anterior de permitir reseñar desde el inicio, para respetar el contexto del enunciado. |
| 4 | P3 | Mostrar días restantes por diferencia de fechas calendario en Argentina, mínimo cero: “hoy” el día del evento y “evento pasado” después. No confundir diferencia de días con bloques de 24 horas. |
| 5 | P4 | Puntaje entero de 1 a 5 y comentario obligatorio no vacío; una reseña por comprador y evento, aunque haya varias compras. Sin edición/borrado de reseñas en la demo. |
| 6 | P4 | Reputación = promedio de todas las reseñas de eventos del organizador con igual peso; mostrar un decimal, ordenar con el promedio sin redondear. Sin reseñas: “sin calificaciones”, siempre al final al ordenar por puntaje. |
| 7 | P4 | Precio de catálogo/orden = menor precio de los tipos ofrecidos, aunque ese tipo esté agotado, mostrando su disponibilidad. Orden inicial por fecha ascendente; precio ascendente y puntaje descendente al elegirlos; permitir invertir. Empates: fecha, nombre e identificador estable. |
| 8 | P5 | Usuarios precargados y selector de usuario, sin registro/login real; permisos validados en backend según identidad seleccionada. Demo de roles, no autenticación segura. Sin compra de entradas del propio evento. |
| 9 | P5 | Buscar en nombre y descripción sin distinguir mayúsculas ni tildes; combinar texto y categoría. Catálogo de eventos futuros, incluidos agotados claramente indicados; compras nuevas solo antes del inicio. Los anteriores siguen accesibles desde compras y reseñas. |
| 10 | P6 | Crear evento con nombre, descripción, categoría, inicio futuro, fin posterior y al menos un tipo con nombre, precio no negativo y cupo entero positivo. Cantidad de compra entera positiva; una compra elige un solo tipo. Validaciones inválidas no producen cambios parciales. |
| 11 | P6 | Moneda ARS; precios con hasta dos decimales. Total = precio unitario por cantidad, conservado con la compra; sin comisiones, descuentos ni pagos parciales. Cancelar una compra pagada reembolsa su total. |
| 12 | P6 | Mensajes y comentarios no vacíos tras quitar espacios externos. Conversación ordenada por envío, con autor y fecha/hora; mensajes sin edición/borrado. Para la demo se actualiza al abrir, enviar o pulsar actualizar; sin obligación de entrega instantánea. |
| 13 | P7 | Incluir favoritos y multimedia mediante URL por estar en el contexto general; sin subida de archivos. Sin edición/borrado de eventos, QR ni notificaciones externas en esta versión. Estas exclusiones son decisiones aprobadas, no requisitos del enunciado. |

Las 13 decisiones están aprobadas y reflejadas en las especificaciones. No quedan decisiones de comportamiento pendientes conocidas en esta etapa. El diseño técnico sigue siendo una etapa posterior.

## Lectura de fuentes

El diagrama es tentativo: enumera estados, pero no determina transiciones. El CU9 habla de entrada utilizada y el contexto de evento finalizado; P3 (decisión 3) incorpora el fin del evento para resolver la tensión. “Chat en cualquier momento” no exige transporte en tiempo real ni autoriza conversaciones ajenas.




