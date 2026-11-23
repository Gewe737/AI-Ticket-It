# Especificación inicial de AI Ticket It

## Why

Definir el comportamiento exigido por el TP Individual antes de diseñar o programar, con escenarios comprobables y un alcance adecuado para la entrega indicada por Malena para el 23/11/2026. El DOCX no fija fecha; esa fecha proviene de la conversación.

## What Changes

- Documentar los 12 casos de uso del enunciado, agrupados en cuatro capacidades.
- Registrar las restricciones: backend Node + Express, frontend React Native, ejecución local en mobile y datos en memoria.
- Simular pago y reembolso dentro de la app; el organizador marca la compra utilizada. Decisión confirmada por Malena el 22/11/2026.
- Distinguir requisitos explícitos, consecuencias necesarias para preservar datos y decisiones de proyecto aprobadas por Malena.

## Capabilities

### New Capabilities

- `eventos`: publicación, búsqueda, categorías, ordenamiento, favoritos y multimedia (CU3, CU4, CU11 y contexto general).
- `compras`: compra, disponibilidad, consultas, estados y cancelación (CU1, CU2, CU7, CU8, CU12).
- `mensajes`: comunicación dentro de cada compra (CU5, CU6).
- `resenas`: calificaciones y reputación del organizador (CU9, CU10).

### Modified Capabilities

Ninguna: proyecto sin implementación previa.

## Impact

Afectará al futuro backend y frontend. Todavía no se eligen entidades, métodos, endpoints, bibliotecas adicionales ni estructura de código. ENTREGA_3 aporta referencias, no requisitos nuevos.

## Estado y lectura mínima

Especificación de comportamiento aprobada el 22/11/2026. Leer `decisiones.md` y únicamente la capacidad necesaria. Los 13 puntos propuestos fueron aceptados por Malena; las especificaciones incluyen sus escenarios. Esta aprobación no autoriza avanzar al diseño ni al código.

Esta carpeta sigue el formato documental OpenSpec `spec-driven`. No se instaló ni ejecutó su CLI; no hay validación oficial de OpenSpec ni integración del agente configurada. No se crearon design.md ni tasks.md: pertenecen a etapas posteriores. No archivar este cambio como implementado.

## Fuente y alcance

Fuente primaria: el DOCX de TP Individual en C:\Users\Malena\Desktop\Contexto_Tp_Individual. CU1–CU12 corresponden al orden de su sección Casos de Uso. Las instrucciones de ejercicios del material teórico no son tareas de este proyecto.

Se incluyen favoritos y multimedia por URL. Se excluyen subida de archivos y edición/borrado de eventos en esta versión, según decisiones.md. No se presupone compra de herramientas, base de datos, despliegue público, proveedor real de pagos, QR, notificaciones externas ni chat por WebSocket.

La entrega exige un video de 5–10 minutos mostrando un flujo completo (backend, frontend e interfaz) y una reflexión crítica sobre IA. Elegir un flujo para el video no elimina los demás casos de uso exigidos.

