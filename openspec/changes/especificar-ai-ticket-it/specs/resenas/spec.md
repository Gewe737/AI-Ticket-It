## Purpose

Permitir a asistentes evaluar su experiencia y a futuros compradores conocer las opiniones sobre eventos del organizador.

## ADDED Requirements

### Requirement: R1 Calificación de una experiencia

El sistema SHALL permitir al comprador con entrada utilizada puntuar numéricamente el evento y dejar un comentario. Fuente: CU9. Exigir fecha/hora de fin alcanzada, puntaje entero 1–5 y comentario no vacío tras quitar espacios externos. Admitir una reseña por comprador/evento, sin edición ni borrado (decisiones 3 y 5).

#### Scenario: Experiencia habilitada para reseñar

- **GIVEN** una compra utilizada cuyo evento ya finalizó
- **WHEN** su comprador publica un puntaje y comentario válidos
- **THEN** la reseña queda asociada al comprador y evento.

#### Scenario: Sin utilización

- **GIVEN** un comprador sin entrada utilizada para el evento
- **WHEN** intenta publicar una reseña
- **THEN** se rechaza y no se incorpora a la reputación del organizador.

### Requirement: R2 Reseñas previas del organizador

El sistema SHALL mostrar en los eventos de un organizador reseñas de sus eventos anteriores. Fuente: CU10. Promedio definido en R3.

#### Scenario: Consulta de reputación

- **GIVEN** un organizador con reseñas de eventos anteriores
- **WHEN** un comprador consulta otro evento de ese organizador
- **THEN** puede leer aquellas reseñas identificando el evento reseñado.

#### Scenario: Organizador nuevo

- **WHEN** se consulta un evento de un organizador sin reseñas
- **THEN** se informa la ausencia de calificaciones sin inventar un puntaje.

### Requirement: R3 Puntaje del organizador

El sistema SHALL calcular la reputación como promedio de todas las reseñas de eventos del organizador con igual peso, mostrar un decimal y ordenar por el promedio sin redondear. Sin reseñas se muestra “sin calificaciones”, al final del orden por puntaje en ambas direcciones. Fuente: decisión 6.

#### Scenario: Promedio entre eventos

- **GIVEN** un organizador con reseñas 5 y 4 en un evento y 1 en otro
- **WHEN** se consulta su reputación
- **THEN** se muestra 3,3 y se ordena usando 10/3, no el promedio de promedios por evento.

### Requirement: R4 Rechazo de reseñas no admisibles

El sistema SHALL rechazar reseñas antes del fin del evento, sin compra utilizada, duplicadas por comprador/evento o con puntaje/comentario inválidos, sin alterar reputación ni reseñas existentes. Fuente: decisiones 3, 5 y 12.

#### Scenario: Evento aún en curso

- **GIVEN** una compra utilizada de un evento que todavía no terminó
- **WHEN** el comprador intenta reseñarlo
- **THEN** se rechaza; desde la fecha/hora de fin puede reseñarlo si cumple las demás condiciones.

#### Scenario: Segunda compra del mismo evento

- **GIVEN** un comprador que ya reseñó el evento y tiene otra compra utilizada
- **WHEN** intenta publicar otra reseña del mismo evento
- **THEN** se rechaza sin duplicar su participación en la reputación.

#### Scenario: Puntaje o comentario inválido

- **WHEN** se envía puntaje fuera de 1–5, no entero o comentario compuesto solo por espacios
- **THEN** se rechaza sin guardar una reseña.
