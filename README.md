# AI Ticket It

TP Individual de Desarrollo con IA — DDS UTN, 2C 2026.

Aplicación local de eventos y entradas: catálogo, favoritos, reserva de cupos, pagos y reembolsos simulados, conversaciones y reseñas. Usuarios de demostración; no hay pagos reales ni autenticación de producción. Los datos se restablecen al reiniciar el backend.

## Estructura

- `openspec/changes/especificar-ai-ticket-it/`: requisitos, decisiones y alternativas de diseño.
- `backend/src/domain/`: dominio enriquecido sin dependencias externas; Evento es la raíz de consistencia.
- `backend/`: API Express y almacenamiento en memoria. Contratos en [API.md](backend/API.md).
- `frontend/`: aplicación React Native con Expo. Instalación, conexión mobile y recorrido en [README.md](frontend/README.md).

## Ejecución y comprobaciones

Usar Node.js 22.13 o superior. Instalar con `npm ci` por separado en backend y frontend, y seguir la configuración de red del README mobile. Copiar `frontend/.env.example` a `frontend/.env` y ajustar la URL de la API.

En backend: `npm test`. En frontend: `npm test` y `npm run check`.

Verificación de esta importación (23/11/2026): 38 pruebas pasaron y TypeScript no informó errores. En este entorno de Windows se ejecutaron directamente con Node y las opciones `--preserve-symlinks --preserve-symlinks-main`, debido a un error de permisos del lanzador npm. Esto no sustituye una comprobación visual en un teléfono ni demuestra una compilación nativa de producción.

## Flujo de trabajo

GitHub Flow: `main` como base; ramas cortas para cambios; commits por responsabilidad; pull request con descripción y verificaciones antes de integrar.

El historial inicial organiza el trabajo existente por etapas (especificación, diseño, dominio, API y mobile). No reconstruye fechas ni autoría de las conversaciones originales. Los estados históricos de los documentos describen el momento en que fueron escritos.
