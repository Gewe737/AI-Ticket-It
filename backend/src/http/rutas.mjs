import { Router } from 'express';
import * as entrada from './entrada.mjs';
import * as salida from './salida.mjs';

export function rutasTickets(servicio) {
  const router = Router();
  const evento = '/eventos/:eventoId';
  const compras = evento + '/compras';
  const compra = compras + '/:compraId';
  const actor = req => req.get('X-Usuario-Demo');

  router.get('/usuarios-demo', (req, res) => res.json(servicio.usuariosDemo()));
  router.get('/categorias', (req, res) => res.json(servicio.categorias()));
  router.get('/eventos', (req, res) =>
    res.json(servicio.catalogo(entrada.filtrosCatalogo(req.query)).map(salida.evento)));
  router.post('/eventos', (req, res) => {
    const publicado = salida.evento(servicio.publicarEvento(actor(req), entrada.datosEvento(req.body)));
    res.location('/api/eventos/' + publicado.id).status(201).json(publicado);
  });
  router.get(evento, (req, res) =>
    res.json(salida.evento(servicio.detalleEvento(req.params.eventoId))));
  router.get('/mis-eventos', (req, res) =>
    res.json(servicio.misEventos(actor(req)).map(salida.evento)));

  router.get('/favoritos', (req, res) => res.json(servicio.favoritos(actor(req))));
  router.put('/favoritos/:eventoId', async (req, res) =>
    res.json(await servicio.guardarFavorito(actor(req), req.params.eventoId)));
  router.delete('/favoritos/:eventoId', async (req, res) =>
    res.json(await servicio.quitarFavorito(actor(req), req.params.eventoId)));

  router.get('/mis-compras', (req, res) =>
    res.json(servicio.misCompras(actor(req)).map(salida.compra)));
  router.get(compras, (req, res) => {
    const panel = servicio.comprasDelEvento(actor(req), req.params.eventoId);
    res.json({ compras: panel.compras.map(salida.compra), tipos: panel.tipos.map(salida.tipoEntrada) });
  });
  router.post(compras, async (req, res) => {
    const creada = salida.compra(await servicio.crearCompra(
      actor(req), req.params.eventoId, entrada.datosCompra(req.body)));
    res.location('/api/eventos/' + creada.eventoId + '/compras/' + creada.id).status(201).json(creada);
  });
  router.get(compra, (req, res) => res.json(salida.compra(
    servicio.consultarCompra(actor(req), req.params.eventoId, req.params.compraId))));

  for (const accion of ['pagar', 'cancelar', 'utilizar']) {
    router.post(compra + '/' + accion, async (req, res) =>
      res.json(await servicio[accion](actor(req), req.params.eventoId, req.params.compraId)));
  }

  router.get(compra + '/mensajes', (req, res) => res.json(
    servicio.conversacion(actor(req), req.params.eventoId, req.params.compraId).map(salida.mensaje)));
  router.post(compra + '/mensajes', async (req, res) => res.status(201).json(salida.mensaje(
    await servicio.enviarMensaje(actor(req), req.params.eventoId, req.params.compraId,
      entrada.textoMensaje(req.body)))));
  router.post(evento + '/resenas', async (req, res) => res.status(201).json(salida.resenia(
    await servicio.publicarResenia(actor(req), req.params.eventoId, entrada.datosResenia(req.body)))));

  return router;
}
