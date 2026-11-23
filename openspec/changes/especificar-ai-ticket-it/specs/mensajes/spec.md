## Purpose

Permitir consultas y respuestas entre comprador y organizador dentro del contexto de una compra identificada.

## ADDED Requirements

### Requirement: M1 Conversación por compra

El sistema SHALL permitir al comprador enviar mensajes y al organizador responder dentro de la compra en cualquier momento, sin restringir por estado. Fuente: CU5 y CU6. Actualización definida en M3; no prescribe WebSocket.

#### Scenario: Intercambio entre participantes

- **WHEN** el comprador envía una consulta y el organizador responde en esa compra
- **THEN** ambos pueden consultar los mensajes con autor y fecha/hora, asociados a esa compra.

#### Scenario: Compra cancelada

- **GIVEN** una compra cancelada
- **WHEN** sus participantes intercambian mensajes
- **THEN** la conversación sigue disponible pese al estado.

### Requirement: M2 Privacidad de la conversación

El sistema SHALL restringir lectura y envío de mensajes al comprador y organizador de la compra. Regla derivada de la comunicación entre ambas partes descrita en el enunciado.

#### Scenario: Tercero ajeno

- **WHEN** un tercero intenta leer o enviar mensajes de una compra ajena
- **THEN** se deniega el acceso y no se agrega ningún mensaje.

### Requirement: M3 Consulta y actualización de mensajes

El sistema SHALL ordenar la conversación por envío, identificando autor y fecha/hora, y actualizarla al abrir, enviar o pulsar actualizar. No se exige entrega instantánea ni se permite editar/borrar mensajes en esta versión. Fuente: decisión 12.

#### Scenario: Respuesta disponible al actualizar

- **GIVEN** que el organizador respondió una consulta
- **WHEN** el comprador abre o actualiza la conversación
- **THEN** ve consulta y respuesta en orden de envío con sus autores y fechas.

#### Scenario: Envío visible

- **WHEN** un participante envía un mensaje válido
- **THEN** la conversación se actualiza e incluye el mensaje enviado.

### Requirement: M4 Contenido de mensajes

El sistema SHALL rechazar mensajes vacíos tras quitar espacios externos sin alterar la conversación. Fuente: decisión 12.

#### Scenario: Mensaje vacío

- **WHEN** un participante envía solo espacios
- **THEN** se informa que debe escribir un mensaje y no se registra uno nuevo.
