import { Evento, catalogo, reputacion, reseniasPrevias } from '../domain/index.mjs';
import { Coordinador } from './coordinador.mjs';
import { ErrorAplicacion } from './error-aplicacion.mjs';

export class ServicioTickets {
  #datos;
  #reloj;
  #coordEvento;
  #coordFavoritos = new Coordinador();

  constructor(datos, reloj, coordinacionEvento = new Coordinador()) {
    this.#datos = datos;
    this.#reloj = reloj;
    this.#coordEvento = coordinacionEvento;
  }

  #actor(id) {
    const actor = this.#datos.usuarios.buscar(id);
    if (!actor) throw new ErrorAplicacion('IDENTIDAD_DEMO_INVALIDA', 'Seleccioná un usuario demo válido.');
    return actor;
  }

  #evento(id) {
    const evento = this.#datos.eventos.buscar(id);
    if (!evento) throw new ErrorAplicacion('EVENTO_INEXISTENTE', 'No se encontró el evento.');
    return evento;
  }

  #cambiarEvento(actorId, eventoId, operacion) {
    const actor = this.#actor(actorId);
    return this.#coordEvento.ejecutar(eventoId, () =>
      operacion(this.#evento(eventoId), actor, this.#reloj()));
  }

  usuariosDemo() {
    return this.#datos.usuarios.listar().map(({ id, nombre, apellido, roles }) =>
      ({ id, nombre, apellido, roles: [...roles] }));
  }

  categorias() {
    return this.#datos.categorias.listar().map(({ id, nombre, descripcion }) =>
      ({ id, nombre, descripcion }));
  }

  publicarEvento(actorId, { categoriaId, tipos, ...datos }) {
    const actor = this.#actor(actorId);
    const evento = Evento.crear(actor, {
      ...datos,
      id: this.#datos.nuevoId('evento'),
      categoria: this.#datos.categorias.buscar(categoriaId),
      tipos: tipos.map((tipo, indice) => ({ ...tipo, id: 'tipo-' + (indice + 1) })),
    }, this.#reloj());
    const detalle = evento.detallePublico();
    this.#datos.eventos.agregar(evento);
    return detalle;
  }

  catalogo(filtros) {
    return catalogo(this.#datos.eventos.listar(), { ...filtros, ahora: this.#reloj() });
  }

  detalleEvento(id) {
    const evento = this.#evento(id);
    const todos = this.#datos.eventos.listar();
    return {
      ...evento.detallePublico(),
      reputacion: reputacion(evento.organizadorId, todos),
      reseniasPrevias: reseniasPrevias(evento, todos, this.#reloj()),
    };
  }

  misEventos(actorId) {
    const actor = this.#actor(actorId);
    actor.exigirRol('ORGANIZADOR');
    return this.#datos.eventos.listar().filter(evento => evento.organizadorId === actor.id)
      .map(evento => evento.detallePublico());
  }

  favoritos(actorId) {
    const actor = this.#actor(actorId);
    return actor.favoritosPropios(actor);
  }

  guardarFavorito(actorId, eventoId) {
    return this.#coordFavoritos.ejecutar(actorId, () => {
      const actor = this.#actor(actorId);
      return actor.guardarFavorito(actor, this.#evento(eventoId));
    });
  }

  quitarFavorito(actorId, eventoId) {
    return this.#coordFavoritos.ejecutar(actorId, () => {
      const actor = this.#actor(actorId);
      return actor.quitarFavorito(actor, eventoId);
    });
  }

  crearCompra(actorId, eventoId, datos) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.crearCompra(actor, { ...datos, id: this.#datos.nuevoId('compra') }, ahora));
  }

  misCompras(actorId) {
    const actor = this.#actor(actorId);
    actor.exigirRol('COMPRADOR');
    const ahora = this.#reloj();
    return this.#datos.eventos.listar().flatMap(evento => evento.comprasDelComprador(actor, ahora));
  }

  comprasDelEvento(actorId, eventoId) {
    const actor = this.#actor(actorId);
    return this.#evento(eventoId).comprasDelOrganizador(actor, this.#reloj());
  }

  consultarCompra(actorId, eventoId, compraId) {
    const actor = this.#actor(actorId);
    return this.#evento(eventoId).consultarCompra(actor, compraId, this.#reloj());
  }

  pagar(actorId, eventoId, compraId) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.pagarCompra(actor, compraId, ahora));
  }

  cancelar(actorId, eventoId, compraId) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.cancelarCompra(actor, compraId, ahora));
  }

  utilizar(actorId, eventoId, compraId) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.utilizarCompra(actor, compraId, ahora));
  }

  conversacion(actorId, eventoId, compraId) {
    const actor = this.#actor(actorId);
    return this.#evento(eventoId).conversacion(actor, compraId);
  }

  enviarMensaje(actorId, eventoId, compraId, texto) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.enviarMensaje(actor, compraId, texto, ahora));
  }

  publicarResenia(actorId, eventoId, { puntaje, comentario }) {
    return this.#cambiarEvento(actorId, eventoId, (evento, actor, ahora) =>
      evento.publicarResenia(actor, puntaje, comentario, ahora));
  }
}
