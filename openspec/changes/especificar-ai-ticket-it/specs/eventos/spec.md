## Purpose

Permitir a compradores descubrir eventos y a organizadores ofrecer entradas con distintos precios y capacidades.

## ADDED Requirements

### Requirement: E1 Publicación de eventos

El sistema SHALL permitir al organizador crear un evento con distintos tipos de entrada, cada uno con precio y cupo. Fuente: CU4. Validaciones en E4 (P6 aprobado).

#### Scenario: Evento con dos tipos

- **WHEN** un organizador crea un evento válido con General y VIP, sus precios y cupos
- **THEN** el evento queda asociado a ese organizador y conserva ambos tipos con sus valores.

### Requirement: E2 Búsqueda y categorías

El sistema SHALL permitir buscar eventos por texto y explorarlos por categoría. Fuente: CU3. Buscar en nombre y descripción ignorando mayúsculas y tildes; combinar texto y categoría (P5 aprobado).

#### Scenario: Exploración por categoría

- **WHEN** el comprador selecciona una categoría que contiene eventos
- **THEN** obtiene eventos de esa categoría.

#### Scenario: Búsqueda textual

- **WHEN** el comprador busca por el nombre completo y exacto de un evento existente
- **THEN** el evento aparece entre los resultados.

#### Scenario: Sin coincidencias

- **WHEN** la búsqueda no tiene resultados
- **THEN** se informa que no hay coincidencias, sin presentar una falla del sistema.

### Requirement: E3 Ordenamiento del catálogo

El sistema SHALL permitir ordenar resultados por precio, fecha del evento y puntaje del organizador. Fuente: CU11. Orden inicial por fecha ascendente; precio ascendente y puntaje descendente al elegirlos, con inversión disponible. Precio representativo: mínimo de los tipos ofrecidos, incluso agotados. Desempatar por fecha, nombre e identificador estable. Sin calificaciones siempre al final (P4 aprobado).

#### Scenario: Selección de criterio

- **WHEN** el comprador cambia el criterio de ordenamiento
- **THEN** los resultados respetan el criterio seleccionado sin perder los filtros aplicados.

#### Scenario: Precio de tipo agotado

- **GIVEN** General agotada a ARS 100 y VIP disponible a ARS 200
- **WHEN** se muestra u ordena el evento por precio
- **THEN** se usa ARS 100 como precio representativo y se indica que General está agotada.

#### Scenario: Inversión y desempate

- **WHEN** se invierte el criterio seleccionado o dos eventos tienen el mismo valor
- **THEN** se invierte el criterio principal y los empates se resuelven establemente por fecha, nombre e identificador; los organizadores sin calificaciones permanecen al final del orden por puntaje.

### Requirement: E4 Datos válidos del evento

El sistema SHALL exigir nombre y descripción no vacíos, categoría, inicio futuro, fin posterior al inicio y al menos un tipo de entrada con nombre, precio ARS no negativo de hasta dos decimales y cupo entero positivo. Un error no deja cambios parciales. Fuente: decisiones 3 y 10.

#### Scenario: Datos inválidos

- **WHEN** se crea un evento con campos vacíos, inicio no futuro, fin no posterior, sin tipos, precio negativo o cupo no entero positivo
- **THEN** se rechaza sin crear evento ni tipos parciales, indicando el dato inválido.

### Requirement: E5 Catálogo y búsqueda combinada

El sistema SHALL listar eventos cuyo inicio sea futuro, incluidos agotados identificados como tales. Los eventos anteriores siguen accesibles desde compras y reseñas. Fuente: decisión 9.

#### Scenario: Texto normalizado y categoría

- **GIVEN** un evento futuro de música cuya descripción contiene “Canción”
- **WHEN** se busca “CANCION” en categoría música
- **THEN** aparece el evento; no aparecen coincidencias de otras categorías.

#### Scenario: Evento agotado o iniciado

- **WHEN** se consulta el catálogo
- **THEN** un evento futuro agotado aparece identificado como agotado y uno ya iniciado no aparece; este último conserva acceso desde sus compras y reseñas.

### Requirement: E6 Favoritos personales

El sistema SHALL permitir al comprador guardar, consultar y quitar eventos favoritos propios, sin duplicarlos. Fuente: contexto general y decisión 13.

#### Scenario: Guardar y quitar

- **WHEN** un comprador guarda dos veces un evento y luego lo quita
- **THEN** antes de quitarlo aparece una sola vez en sus favoritos y después deja de aparecer, sin modificar los de otros usuarios.

### Requirement: E7 Multimedia por URL

El sistema SHALL permitir asociar y consultar material multimedia del evento mediante URL, sin subida de archivos. Fuente: contexto general y decisión 13.

#### Scenario: Material del evento

- **WHEN** el organizador incluye una URL de material multimedia al crear un evento
- **THEN** los compradores pueden acceder al material desde ese evento sin que la app requiera subir un archivo.
