export class Coordinador {
  #colas = new Map();

  async ejecutar(id, operacion) {
    const anterior = this.#colas.get(id);
    const { promise: turno, resolve: liberar } = Promise.withResolvers();
    this.#colas.set(id, turno);
    try {
      await anterior;
      return await operacion();
    } finally {
      liberar();
      if (this.#colas.get(id) === turno) this.#colas.delete(id);
    }
  }
}
