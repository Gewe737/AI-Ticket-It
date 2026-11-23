const iso = momento => new Date(momento).toISOString();
const importe = dinero => dinero === null ? null : dinero.toString().replace(',', '.');

export function tipoEntrada(tipo) {
  return {
    ...tipo,
    precio: importe(tipo.precio),
    cupoTotal: tipo.cupoTotal.toString(),
    disponibilidad: tipo.disponibilidad.toString(),
  };
}

export function resenia(vista) {
  return { ...vista, publicada: iso(vista.publicada) };
}

function reputacion(vista) {
  return {
    suma: vista.suma.toString(),
    cantidad: vista.cantidad.toString(),
    promedio: vista.promedio === null ? null : {
      numerador: vista.promedio.numerador.toString(),
      denominador: vista.promedio.denominador.toString(),
    },
    descripcion: vista.descripcion,
  };
}

export function evento(vista) {
  return {
    ...vista,
    inicio: iso(vista.inicio),
    fin: iso(vista.fin),
    multimedia: vista.multimedia.map(url => url.valor),
    tipos: vista.tipos.map(tipoEntrada),
    precioRepresentativo: importe(vista.precioRepresentativo),
    resenias: vista.resenias.map(resenia),
    ...(vista.reputacion && { reputacion: reputacion(vista.reputacion) }),
    ...(vista.reseniasPrevias && { reseniasPrevias: vista.reseniasPrevias.map(opinion =>
      ({ ...opinion, resenia: resenia(opinion.resenia) })) }),
  };
}

export function compra(vista) {
  return {
    ...vista,
    cantidad: vista.cantidad.toString(),
    precioUnitarioPactado: importe(vista.precioUnitarioPactado),
    totalPactado: importe(vista.totalPactado),
    importePagado: importe(vista.importePagado),
    importeReembolsado: importe(vista.importeReembolsado),
    historial: vista.historial.map(cambio => ({ ...cambio, momento: iso(cambio.momento) })),
  };
}

export function mensaje(vista) {
  return { ...vista, enviado: iso(vista.enviado) };
}
