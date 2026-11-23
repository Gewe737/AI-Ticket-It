import { exigir, texto, enteroPositivo, instante, lista } from './validaciones.mjs';
import { Categoria, TipoEntrada, URLMultimedia } from './valores.mjs';
import { exigirActor } from './usuario.mjs';
import { Compra } from './compra.mjs';

export class Evento {
  #tipos;
  #compras = new Map();
  #resenias = new Map();
  #contexto;
  #creado;

  static crear(actor, datos, ahora) { return new Evento(actor, datos, ahora); }

  constructor(actor, datos, ahora) {
    exigirActor(actor, 'ORGANIZADOR');
    const { id, nombre, descripcion, categoria, inicio, fin, tipos, multimedia = [] } = datos ?? {};
    this.id = texto(id, 'ID de evento');
    this.nombre = texto(nombre, 'Nombre');
    this.descripcion = texto(descripcion, 'Descripción');
    exigir(categoria instanceof Categoria, 'DATOS_INVALIDOS', 'Se requiere una categoría existente.');
    this.categoria = categoria;
    this.organizadorId = actor.id;
    this.inicio = instante(inicio);
    this.fin = instante(fin);
    this.#creado = instante(ahora);
    exigir(this.inicio > this.#creado && this.fin > this.inicio,
      'FUERA_DE_FECHA', 'El inicio debe ser futuro y el fin posterior al inicio.');
    exigir(lista(tipos, 'Tipos').length > 0, 'DATOS_INVALIDOS', 'Se requiere al menos un tipo de entrada.');
    const ofertas = Array.from(tipos, tipo => new TipoEntrada(this.id, tipo));
    exigir(new Set(ofertas.map(t => t.id)).size === ofertas.length,
      'DATOS_INVALIDOS', 'Los identificadores de tipo no pueden repetirse.');
    this.#tipos = new Map(ofertas.map(t => [t.id, t]));
    this.multimedia = Object.freeze(lista(multimedia, 'Multimedia').map(url =>
      url instanceof URLMultimedia ? url : new URLMultimedia(url)));
    this.#contexto = Object.freeze({ eventoId: this.id, organizadorId: this.organizadorId, inicio: this.inicio });
    Object.freeze(this);
  }

  #tipo(id) {
    const tipo = this.#tipos.get(id);
    exigir(tipo, 'DATOS_INVALIDOS', 'El tipo no pertenece al evento.');
    return tipo;
  }

  #compra(actor, id) {
    exigirActor(actor);
    const compra = this.#compras.get(id);
    // No revela si un identificador ajeno existe en otro evento.
    exigir(compra, 'NO_AUTORIZADO', 'Compra no accesible en este evento.');
    compra.autorizarParticipante(actor);
    return compra;
  }

  disponibilidad(tipoId) {
    const tipo = this.#tipo(tipoId);
    let ocupacion = 0n;
    for (const compra of this.#compras.values()) {
      if (compra.tipoId === tipoId && compra.ocupaCupo) ocupacion += compra.cantidad;
    }
    return tipo.cupoTotal - ocupacion;
  }

  precioRepresentativo() {
    return [...this.#tipos.values()].reduce((minimo, tipo) =>
      minimo === null || tipo.precio.centavos < minimo.centavos ? tipo.precio : minimo, null);
  }

  crearCompra(actor, datos, momento) {
    exigirActor(actor, 'COMPRADOR');
    exigir(actor.id !== this.organizadorId, 'NO_AUTORIZADO', 'No se pueden comprar entradas del propio evento.');
    const ahora = instante(momento);
    exigir(ahora >= this.#creado && ahora < this.inicio, 'FUERA_DE_FECHA', 'La compra requiere un evento aún no iniciado.');
    const { id, tipoId, cantidad } = datos ?? {};
    const compraId = texto(id, 'ID de compra');
    exigir(!this.#compras.has(compraId), 'DATOS_INVALIDOS', 'El ID de compra ya existe.');
    const tipo = this.#tipo(tipoId);
    const unidades = enteroPositivo(cantidad, 'Cantidad');
    exigir(this.disponibilidad(tipoId) >= unidades, 'SIN_CUPO', 'No hay cupo suficiente.');
    const compra = new Compra({ id: compraId, compradorId: actor.id, tipo, cantidad: unidades,
      ahora, contexto: this.#contexto });
    const vista = compra.consultar(actor, ahora);
    this.#compras.set(compra.id, compra);
    return vista;
  }

  pagarCompra(actor, compraId, ahora) { return this.#compra(actor, compraId).operar('PAGAR', actor, ahora); }
  cancelarCompra(actor, compraId, ahora) { return this.#compra(actor, compraId).operar('CANCELAR', actor, ahora); }
  utilizarCompra(actor, compraId, ahora) { return this.#compra(actor, compraId).operar('UTILIZAR', actor, ahora); }
  consultarCompra(actor, compraId, ahora) { return this.#compra(actor, compraId).consultar(actor, ahora); }

  comprasDelComprador(actor, ahora) {
    exigirActor(actor, 'COMPRADOR');
    return Object.freeze([...this.#compras.values()].filter(c => c.compradorId === actor.id)
      .map(c => c.consultar(actor, ahora)));
  }

  comprasDelOrganizador(actor, ahora) {
    exigirActor(actor, 'ORGANIZADOR');
    exigir(actor.id === this.organizadorId, 'NO_AUTORIZADO', 'El evento pertenece a otro organizador.');
    return Object.freeze({ compras: Object.freeze([...this.#compras.values()].map(c => c.consultar(actor, ahora))),
      tipos: this.detallePublico().tipos });
  }

  enviarMensaje(actor, compraId, textoMensaje, ahora) {
    return this.#compra(actor, compraId).enviarMensaje(actor, textoMensaje, ahora);
  }

  conversacion(actor, compraId) { return this.#compra(actor, compraId).conversacion(actor); }

  publicarResenia(actor, puntaje, comentario, momento) {
    exigirActor(actor, 'COMPRADOR');
    const utilizada = [...this.#compras.values()].find(c => c.compradorId === actor.id && c.estado === 'UTILIZADA');
    exigir(utilizada, 'OPERACION_NO_PERMITIDA', 'Se requiere una compra utilizada del evento.');
    const ahora = instante(momento);
    exigir(ahora >= this.fin, 'FUERA_DE_FECHA', 'El evento todavía no finalizó.');
    const uso = utilizada.consultar(actor, ahora).historial.at(-1);
    exigir(ahora >= uso.momento, 'DATOS_INVALIDOS', 'La reseña no puede preceder a la utilización.');
    exigir(!this.#resenias.has(actor.id), 'RESENIA_DUPLICADA', 'Ya existe una reseña del comprador para el evento.');
    exigir(Number.isInteger(puntaje) && puntaje >= 1 && puntaje <= 5,
      'DATOS_INVALIDOS', 'El puntaje debe ser entero entre 1 y 5.');
    const resenia = Object.freeze({ eventoId: this.id, compradorId: actor.id, puntaje,
      comentario: texto(comentario, 'Comentario'), publicada: ahora });
    this.#resenias.set(actor.id, resenia);
    return resenia;
  }

  resenias() { return Object.freeze([...this.#resenias.values()]); }

  detallePublico() {
    const tipos = [...this.#tipos.values()].map(tipo => {
      const disponible = this.disponibilidad(tipo.id);
      return Object.freeze({ id: tipo.id, nombre: tipo.nombre, precio: tipo.precio,
        cupoTotal: tipo.cupoTotal, disponibilidad: disponible, agotado: disponible === 0n });
    });
    return Object.freeze({ id: this.id, nombre: this.nombre, descripcion: this.descripcion,
      categoria: this.categoria, organizadorId: this.organizadorId, inicio: this.inicio, fin: this.fin,
      multimedia: this.multimedia, tipos: Object.freeze(tipos), resenias: this.resenias(),
      precioRepresentativo: this.precioRepresentativo(), agotado: tipos.every(t => t.agotado) });
  }
}
