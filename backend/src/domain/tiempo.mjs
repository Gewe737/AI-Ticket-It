import { instante } from './validaciones.mjs';

const calendario = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
});

function diaCalendario(valor) {
  const partes = Object.fromEntries(calendario.formatToParts(instante(valor)).map(p => [p.type, p.value]));
  const fecha = new Date(0);
  fecha.setUTCFullYear(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
  return fecha.getTime() / 86400000;
}

export function informacionTemporal(inicio, ahora) {
  const dias = diaCalendario(inicio) - diaCalendario(ahora);
  return Object.freeze({ diasRestantes: Math.max(0, dias),
    descripcion: dias < 0 ? 'evento pasado' : dias === 0 ? 'hoy' : `${dias} día${dias === 1 ? '' : 's'}` });
}
