export class RepositorioMemoria {
  #registros = new Map();

  agregar(registro) {
    if (this.#registros.has(registro.id)) {
      throw new Error('Identificador repetido en memoria.');
    }
    this.#registros.set(registro.id, registro);
  }

  buscar(id) {
    return this.#registros.get(id);
  }

  listar() {
    return [...this.#registros.values()];
  }
}
