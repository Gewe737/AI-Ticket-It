import { exigir, texto, enteroPositivo } from './validaciones.mjs';

export class DineroARS {
  constructor(centavos) {
    exigir(typeof centavos === 'bigint' && centavos >= 0n,
      'DATOS_INVALIDOS', 'Los centavos deben ser un BigInt no negativo.');
    this.centavos = centavos;
    Object.freeze(this);
  }

  static desdeDecimal(valor) {
    if (valor instanceof DineroARS) return valor;
    exigir(typeof valor === 'string' || (typeof valor === 'number' && Number.isFinite(valor)),
      'DATOS_INVALIDOS', 'Precio ARS inválido.');
    const partes = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(String(valor));
    exigir(partes, 'DATOS_INVALIDOS', 'El precio debe ser no negativo y tener hasta dos decimales.');
    if (typeof valor === 'number') {
      exigir(Number.isSafeInteger(Math.trunc(valor)), 'DATOS_INVALIDOS', 'Usar texto decimal para importes grandes.');
    }
    return new DineroARS(BigInt(partes[1]) * 100n + BigInt((partes[2] ?? '').padEnd(2, '0')));
  }

  multiplicar(cantidad) { return new DineroARS(this.centavos * enteroPositivo(cantidad, 'Cantidad')); }
  equals(otro) { return otro instanceof DineroARS && otro.centavos === this.centavos; }
  toString() { return `${this.centavos / 100n},${String(this.centavos % 100n).padStart(2, '0')}`; }
}

export class URLMultimedia {
  constructor(valor) {
    const cadena = texto(valor, 'URL');
    let url;
    try { url = new URL(cadena); } catch { /* Error de dominio debajo. */ }
    exigir(url, 'DATOS_INVALIDOS', 'La multimedia requiere una URL absoluta válida.');
    this.valor = url.href;
    Object.freeze(this);
  }
}

export class Categoria {
  constructor({ id, nombre, descripcion = '' }) {
    this.id = texto(id, 'ID de categoría');
    this.nombre = texto(nombre, 'Nombre de categoría');
    exigir(typeof descripcion === 'string', 'DATOS_INVALIDOS', 'Descripción de categoría inválida.');
    this.descripcion = descripcion.trim();
    Object.freeze(this);
  }
}

export class TipoEntrada {
  constructor(eventoId, datos) {
    const { id, nombre, precio, cupoTotal } = datos ?? {};
    this.eventoId = texto(eventoId, 'Evento');
    this.id = texto(id, 'ID de tipo');
    this.nombre = texto(nombre, 'Nombre de tipo');
    this.precio = DineroARS.desdeDecimal(precio);
    this.cupoTotal = enteroPositivo(cupoTotal, 'Cupo total');
    Object.freeze(this);
  }
}
