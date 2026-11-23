## Purpose

Permitir adquirir entradas dentro del cupo disponible y consultar o gestionar la situación de cada compra según sus participantes.

## ADDED Requirements

### Requirement: C1 Compra con disponibilidad

El sistema SHALL permitir seleccionar un evento, un tipo de entrada y una cantidad sin superar su cupo disponible. Fuente: CU12. Reserva confirmada en C7; validaciones en C12.

#### Scenario: Cantidad disponible

- **GIVEN** un tipo de entrada con tres unidades disponibles
- **WHEN** el comprador solicita dos
- **THEN** se registra una compra PENDIENTE de dos entradas de ese tipo para ese comprador y queda una unidad disponible.

#### Scenario: Cupo insuficiente

- **GIVEN** un tipo de entrada con dos unidades disponibles
- **WHEN** se solicitan tres
- **THEN** la operación se rechaza y no crea compra ni altera disponibilidad.

### Requirement: C2 Consulta del comprador

El sistema SHALL mostrar al comprador sus compras, distinguir sus estados y mostrar días restantes para las confirmadas. Fuente: CU1. Cálculo de días en C13.

#### Scenario: Compras de distinta situación

- **WHEN** el comprador consulta sus compras pendientes y confirmadas
- **THEN** distingue cada estado y ve los días restantes para el evento de cada confirmada.

### Requirement: C3 Consulta del organizador

El sistema SHALL mostrar al organizador las compras de un evento propio, sus estados y el cupo disponible por tipo. Fuente: CU2.

#### Scenario: Panel de un evento

- **WHEN** el organizador consulta un evento propio con tipos General y VIP
- **THEN** ve sus compras y la disponibilidad diferenciada de ambos tipos.

### Requirement: C4 Restricción de cancelación

El sistema SHALL permitir al comprador cancelar su compra antes de que el evento ocurra si no está utilizada. Fuente: CU7 y CU8. Transiciones de cancelación confirmadas en C8; cancelación estrictamente antes del inicio; repetición definida en C11.

#### Scenario: Cancelación admisible

- **GIVEN** una compra confirmada para un evento futuro
- **WHEN** su comprador solicita cancelarla
- **THEN** se registra CANCELADA y luego REEMBOLSADA automáticamente mediante la simulación, liberando el cupo una sola vez.

#### Scenario: Compra utilizada

- **WHEN** se intenta cancelar una compra utilizada
- **THEN** se rechaza sin alterar la compra ni el cupo.

#### Scenario: Evento ya ocurrido

- **WHEN** se intenta cancelar una compra de un evento ya realizado
- **THEN** se rechaza sin alterar la compra ni el cupo.

### Requirement: C5 Operaciones simuladas

El sistema SHALL permitir simular pago y reembolso dentro de la app y al organizador marcar utilizada una compra de su evento. Fuente: decisión de Malena. Pago definido en C10 y condiciones de uso en C9.

#### Scenario: Pago de demostración

- **WHEN** se realiza un pago simulado permitido
- **THEN** la compra refleja su confirmación sin efectuar cobros reales.

#### Scenario: Reembolso de demostración

- **WHEN** corresponde un reembolso de una compra pagada
- **THEN** la app refleja el reembolso sin transferir dinero real.

#### Scenario: Registro de uso

- **WHEN** el organizador marca utilizada una compra propia que cumple las condiciones acordadas
- **THEN** la compra muestra el estado UTILIZADA.

### Requirement: C6 Acceso según participante

El sistema SHALL impedir que un comprador consulte o modifique compras ajenas y que un organizador gestione compras de eventos ajenos. Derivado de “mis compras” y “sus eventos”; identidad de demostración definida en C14.

#### Scenario: Compra ajena

- **WHEN** un usuario ajeno a la compra intenta cancelarla o marcarla utilizada
- **THEN** se deniega la operación sin modificar datos.

### Requirement: C7 Reserva y liberación de cupos

El sistema SHALL reservar la cantidad al crear una compra PENDIENTE, conservarla al pagar y liberarla una sola vez al cancelar. Las reservas no vencen automáticamente en esta demo. Fuente: decisión confirmada por Malena el 22/11/2026.

#### Scenario: Pago sin segundo descuento

- **GIVEN** una compra pendiente de dos entradas ya reservadas y una unidad disponible
- **WHEN** se paga la compra
- **THEN** continúa disponible una unidad, sin descontar nuevamente las dos entradas.

#### Scenario: Cancelación devuelve la reserva

- **GIVEN** una compra cancelable de dos entradas reservadas y una unidad disponible
- **WHEN** su comprador la cancela
- **THEN** quedan tres unidades disponibles.

#### Scenario: Liberación única

- **GIVEN** una compra cancelada cuyo cupo ya fue liberado
- **WHEN** se repite la cancelación o se procesa su reembolso
- **THEN** la disponibilidad no aumenta nuevamente; la repetición informa “operación ya realizada”.

#### Scenario: Sin vencimiento automático

- **GIVEN** una compra pendiente con cupo reservado
- **WHEN** transcurre tiempo sin pago ni cancelación
- **THEN** la reserva no se libera automáticamente.

### Requirement: C8 Cancelación según estado de pago

El sistema SHALL pasar una compra PENDIENTE cancelable a CANCELADA. Al cancelar una compra pagada CONFIRMADA, SHALL registrar CANCELADA y luego REEMBOLSADA automáticamente mediante la simulación. Fuente: decisión confirmada por Malena el 22/11/2026. Se mantienen las restricciones de C4 y la liberación única de C7.

#### Scenario: Cancelación antes del pago

- **GIVEN** una compra PENDIENTE que cumple las condiciones para cancelar
- **WHEN** su comprador la cancela
- **THEN** queda CANCELADA, libera la cantidad reservada y no genera reembolso de un pago inexistente.

#### Scenario: Cancelación después del pago

- **GIVEN** una compra CONFIRMADA pagada que cumple las condiciones para cancelar
- **WHEN** su comprador la cancela
- **THEN** se registra el paso por CANCELADA y luego queda REEMBOLSADA automáticamente, sin requerir otra acción del usuario ni liberar dos veces el cupo.

### Requirement: C9 Uso de una compra completa

El sistema SHALL permitir únicamente al organizador del evento marcar una compra CONFIRMADA como UTILIZADA desde la fecha/hora de inicio del evento. La operación utiliza juntas todas las entradas de la compra. Fuente: decisión confirmada por Malena el 22/11/2026.

#### Scenario: Uso de todas las entradas

- **GIVEN** una compra CONFIRMADA de tres entradas cuyo evento ya comenzó
- **WHEN** el organizador del evento registra su uso
- **THEN** la compra queda UTILIZADA para las tres entradas juntas.

#### Scenario: Uso anticipado

- **WHEN** el organizador intenta marcar utilizada una compra antes del inicio del evento
- **THEN** se rechaza sin modificarla.

#### Scenario: Estado no confirmado

- **WHEN** se intenta utilizar una compra PENDIENTE, CANCELADA o REEMBOLSADA
- **THEN** se rechaza sin modificarla.

#### Scenario: Actor no autorizado

- **WHEN** el comprador u otro organizador intenta registrar el uso
- **THEN** se rechaza sin modificar la compra.

### Requirement: C10 Pago y transiciones admitidas

El sistema SHALL convertir una PENDIENTE en CONFIRMADA mediante pago simulado solo antes del inicio del evento. UTILIZADA, CANCELADA y REEMBOLSADA no admiten nuevas transiciones por el usuario; se mantiene el paso automático CANCELADA → REEMBOLSADA de C8. Fuente: decisión 1.

#### Scenario: Confirmación de pago

- **GIVEN** una compra PENDIENTE de un evento futuro
- **WHEN** se paga mediante la simulación
- **THEN** queda CONFIRMADA conservando el cupo reservado y el total comprado.

#### Scenario: Límite del inicio

- **WHEN** se intenta pagar o cancelar al alcanzar la fecha/hora de inicio del evento o después
- **THEN** se rechaza sin alterar estado, importe ni disponibilidad, salvo informar sin cambios una operación ya realizada según C11.

#### Scenario: Estado final

- **WHEN** se intenta una nueva transición desde UTILIZADA, CANCELADA o REEMBOLSADA fuera del reembolso automático acordado
- **THEN** se rechaza sin cambios; si es repetición de una operación ya realizada se aplica C11.

### Requirement: C11 Operaciones repetidas y cupos concurrentes

El sistema SHALL informar “operación ya realizada” al repetir pago, cancelación o uso ya realizado, sin duplicar efectos. Las compras concurrentes no pueden reservar más que la disponibilidad existente. Fuente: decisión 2.

#### Scenario: Repetir una acción completada

- **GIVEN** un pago, cancelación o uso ya realizado
- **WHEN** el actor autorizado repite esa operación
- **THEN** se informa “operación ya realizada”, conservando estado, importe y cupo, sin generar otra operación.

#### Scenario: Dos compradores para una entrada

- **GIVEN** una sola entrada disponible
- **WHEN** dos compradores intentan reservar una entrada cada uno simultáneamente
- **THEN** solo una compra se acepta, la otra informa falta de cupo y la disponibilidad queda en cero.

### Requirement: C12 Cantidad e importes de compra

El sistema SHALL aceptar compras de un único tipo y cantidad entera positiva, solo antes del inicio y sin ser el organizador del evento. Total ARS = precio unitario por cantidad, conservado en la compra; sin comisiones, descuentos ni pagos parciales. El reembolso simulado devuelve el total pagado. Fuente: decisiones 8–11.

#### Scenario: Total y reembolso

- **GIVEN** una compra de tres entradas a ARS 125,50 cada una
- **WHEN** se paga y posteriormente se cancela cumpliendo las condiciones
- **THEN** su total y reembolso son ARS 376,50, sin recargos ni descuentos.

#### Scenario: Compra inválida

- **WHEN** se compra cantidad cero, negativa o fraccionaria, un tipo que no pertenece al evento, entradas del propio evento o para un evento ya iniciado
- **THEN** se rechaza sin crear compras ni alterar disponibilidad.

### Requirement: C13 Días restantes

El sistema SHALL mostrar para compras CONFIRMADAS la diferencia de fechas calendario de Argentina hasta el inicio del evento, sin números negativos: “hoy” en la misma fecha y “evento pasado” en fechas posteriores. Fuente: decisión 4.

#### Scenario: Cambio de día y no de 24 horas

- **GIVEN** que en Argentina es 22/11 a las 23:00 y el evento inicia el 23/11 a las 10:00
- **WHEN** se consulta una compra confirmada
- **THEN** se muestra un día restante, aunque falten menos de 24 horas.

#### Scenario: Mismo día o día posterior

- **WHEN** se consulta una compra confirmada el día del evento o en una fecha posterior
- **THEN** se muestra respectivamente “hoy” o “evento pasado”, sin valores negativos.

### Requirement: C14 Identidad de demostración

El sistema SHALL ofrecer usuarios precargados y selección de usuario sin registro/login real. El backend valida participación y propiedad según la identidad seleccionada; esta simulación no constituye autenticación segura. Fuente: decisión 8.

#### Scenario: Cambio de usuario

- **WHEN** se cambia de un comprador a otro
- **THEN** se muestran solo las compras del seleccionado y no se permite operar sobre compras ajenas, incluso mediante una petición directa.
