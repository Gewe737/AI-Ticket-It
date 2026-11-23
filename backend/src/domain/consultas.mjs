import { exigir, instante, texto as textoObligatorio } from './validaciones.mjs';

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Se reciben los eventos completos; las reseñas se obtienen de su única fuente de verdad.
export function reputacion(organizadorId, eventos) {
  textoObligatorio(organizadorId, 'Organizador');
  let suma = 0n;
  let cantidad = 0n;
  for (const evento of eventos) {
    if (evento.organizadorId !== organizadorId) continue;
    for (const resenia of evento.resenias()) {
      suma += BigInt(resenia.puntaje);
      cantidad += 1n;
    }
  }
  if (cantidad === 0n) return Object.freeze({ suma, cantidad, promedio: null, descripcion: 'sin calificaciones' });
  // Redondeo aritmético solo para presentación, sin convertir la razón a float.
  const decimas = (suma * 20n + cantidad) / (2n * cantidad);
  return Object.freeze({ suma, cantidad, promedio: Object.freeze({ numerador: suma, denominador: cantidad }),
    descripcion: `${decimas / 10n},${decimas % 10n}` });
}

export function reseniasPrevias(eventoConsultado, eventos, momento) {
  const ahora = instante(momento);
  return Object.freeze(eventos.filter(e => e.id !== eventoConsultado.id
    && e.organizadorId === eventoConsultado.organizadorId && e.fin <= ahora)
    .flatMap(e => e.resenias().map(resenia => Object.freeze({ eventoId: e.id, nombreEvento: e.nombre, resenia }))));
}

export function catalogo(eventos, { texto = '', categoriaId = null, criterio = 'fecha', sentido,
  ahora } = {}) {
  exigir(typeof texto === 'string', 'DATOS_INVALIDOS', 'El texto de búsqueda debe ser una cadena.');
  exigir(['fecha', 'precio', 'puntaje'].includes(criterio), 'DATOS_INVALIDOS', 'Criterio de orden inválido.');
  const direccion = sentido ?? (criterio === 'puntaje' ? 'desc' : 'asc');
  exigir(['asc', 'desc'].includes(direccion), 'DATOS_INVALIDOS', 'Sentido de orden inválido.');
  const momento = instante(ahora);
  const busqueda = normalizar(texto.trim());
  const reputaciones = new Map();
  const filas = eventos.filter(e => e.inicio > momento
    && (categoriaId === null || e.categoria.id === categoriaId)
    && (normalizar(e.nombre).includes(busqueda) || normalizar(e.descripcion).includes(busqueda)))
    .map(evento => {
      if (!reputaciones.has(evento.organizadorId)) {
        reputaciones.set(evento.organizadorId, reputacion(evento.organizadorId, eventos));
      }
      return Object.freeze({ ...evento.detallePublico(), reputacion: reputaciones.get(evento.organizadorId) });
    });
  filas.sort((a, b) => {
    let principal;
    if (criterio === 'puntaje') {
      const ar = a.reputacion, br = b.reputacion;
      if ((ar.cantidad === 0n) !== (br.cantidad === 0n)) return ar.cantidad === 0n ? 1 : -1;
      principal = comparar(ar.suma * br.cantidad, br.suma * ar.cantidad);
    } else if (criterio === 'precio') {
      principal = comparar(a.precioRepresentativo.centavos, b.precioRepresentativo.centavos);
    } else principal = comparar(a.inicio, b.inicio);
    return principal * (direccion === 'asc' ? 1 : -1)
      || comparar(a.inicio, b.inicio) || comparar(a.nombre, b.nombre) || comparar(a.id, b.id);
  });
  return Object.freeze(filas);
}
