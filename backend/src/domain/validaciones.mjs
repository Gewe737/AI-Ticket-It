export class ErrorDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
  }
}

export function exigir(condicion, codigo, mensaje) {
  if (!condicion) throw new ErrorDominio(codigo, mensaje);
}

export function texto(valor, campo) {
  exigir(typeof valor === 'string' && valor.trim().length > 0,
    'DATOS_INVALIDOS', `${campo} es obligatorio.`);
  return valor.trim();
}

// BigInt permite operar cantidades e importes sin pérdida de precisión.
export function enteroPositivo(valor, campo) {
  const valido = typeof valor === 'bigint'
    || (typeof valor === 'number' && Number.isSafeInteger(valor))
    || (typeof valor === 'string' && /^\d+$/.test(valor));
  exigir(valido, 'DATOS_INVALIDOS', `${campo} debe ser entero positivo exacto.`);
  const numero = BigInt(valor);
  exigir(numero > 0n, 'DATOS_INVALIDOS', `${campo} debe ser positivo.`);
  return numero;
}

export function instante(valor) {
  if (typeof valor === 'string') {
    const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(valor);
    exigir(partes, 'DATOS_INVALIDOS', 'Usar fecha ISO con hora, segundos y zona explícita.');
    const [, anio, mes, dia, hora, minuto, segundo] = partes.map((p, i) => i > 0 && i < 7 ? Number(p) : p);
    const calendario = new Date(0);
    calendario.setUTCFullYear(anio, mes - 1, dia);
    exigir(calendario.getUTCFullYear() === anio && calendario.getUTCMonth() === mes - 1
      && calendario.getUTCDate() === dia && hora < 24 && minuto < 60 && segundo < 60,
    'DATOS_INVALIDOS', 'Fecha u hora inválida.');
  }
  const resultado = valor instanceof Date ? valor.getTime()
    : typeof valor === 'string' ? Date.parse(valor) : valor;
  exigir(typeof resultado === 'number' && Number.isSafeInteger(resultado)
    && Math.abs(resultado) <= 8640000000000000,
  'DATOS_INVALIDOS', 'Se requiere un instante válido.');
  return resultado;
}

export function lista(valor, campo) {
  exigir(Array.isArray(valor), 'DATOS_INVALIDOS', `${campo} debe ser una lista.`);
  return valor;
}

export function resultado(realizada) {
  return Object.freeze({ realizada, mensaje: realizada ? 'operación realizada' : 'operación ya realizada' });
}
