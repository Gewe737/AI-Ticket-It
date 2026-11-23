import { exigir, texto, lista, resultado } from './validaciones.mjs';

export class Usuario {
  #favoritos = new Set();

  constructor({ id, nombre, apellido = '', roles }) {
    this.id = texto(id, 'ID de usuario');
    this.nombre = texto(nombre, 'Nombre');
    exigir(typeof apellido === 'string', 'DATOS_INVALIDOS', 'Apellido inválido.');
    this.apellido = apellido.trim();
    exigir(lista(roles, 'Roles').length > 0 && roles.every(r => ['COMPRADOR', 'ORGANIZADOR'].includes(r)),
      'DATOS_INVALIDOS', 'Roles de usuario inválidos.');
    this.roles = Object.freeze([...new Set(roles)]);
    Object.freeze(this);
  }

  exigirRol(rol) {
    exigir(this.roles.includes(rol), 'NO_AUTORIZADO', `Se requiere capacidad ${rol}.`);
  }

  #autorizar(actor) {
    exigirActor(actor);
    exigir(actor.id === this.id, 'NO_AUTORIZADO', 'Los favoritos son privados.');
    this.exigirRol('COMPRADOR');
  }

  guardarFavorito(actor, evento) {
    this.#autorizar(actor);
    // El exterior resuelve el evento existente; no se incorpora una dependencia circular.
    exigir(evento && typeof evento.detallePublico === 'function', 'DATOS_INVALIDOS', 'Se requiere un evento existente.');
    const id = texto(evento.id, 'Evento');
    const nuevo = !this.#favoritos.has(id);
    this.#favoritos.add(id);
    return resultado(nuevo);
  }

  quitarFavorito(actor, eventoId) {
    this.#autorizar(actor);
    return resultado(this.#favoritos.delete(texto(eventoId, 'Evento')));
  }

  favoritosPropios(actor) {
    this.#autorizar(actor);
    return Object.freeze([...this.#favoritos]);
  }
}

export function exigirActor(actor, rol) {
  exigir(actor instanceof Usuario, 'NO_AUTORIZADO', 'Se requiere un usuario resuelto.');
  if (rol) actor.exigirRol(rol);
}
