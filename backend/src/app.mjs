import express from 'express';
import { ServicioTickets } from './application/servicio.mjs';
import { cargarDemo } from './infrastructure/demo.mjs';
import { RepositorioMemoria } from './infrastructure/memoria.mjs';
import { rutasTickets } from './http/rutas.mjs';
import { responderError, rutaDesconocida } from './http/errores.mjs';

export function crearAplicacion({ reloj = Date.now, coordinacionEvento } = {}) {
  let secuencia = 0n;
  const datos = {
    usuarios: new RepositorioMemoria(),
    categorias: new RepositorioMemoria(),
    eventos: new RepositorioMemoria(),
    nuevoId: clase => clase + '-' + (++secuencia).toString(),
  };
  cargarDemo(datos, reloj());
  const servicio = new ServicioTickets(datos, reloj, coordinacionEvento);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', express.json({ limit: '100kb' }), rutasTickets(servicio));
  app.use(rutaDesconocida);
  app.use(responderError);
  return app;
}
