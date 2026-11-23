import { Categoria, Evento, Usuario } from '../../src/domain/index.mjs';

export const PUBLICACION = '2026-11-20T09:00:00-03:00';
export const ANTES = '2026-11-23T09:59:59.999-03:00';
export const INICIO = '2026-11-23T10:00:00-03:00';
export const FIN = '2026-11-23T12:00:00-03:00';

export function usuario(id, ...roles) {
  return new Usuario({ id, nombre: id, roles: roles.length ? roles : ['COMPRADOR'] });
}

export function escenario() {
  const organizador = usuario('organizador', 'ORGANIZADOR', 'COMPRADOR');
  const comprador = usuario('comprador');
  const tercero = usuario('tercero', 'COMPRADOR', 'ORGANIZADOR');
  const categoria = new Categoria({ id: 'musica', nombre: 'Música' });
  const datos = {
    id: 'evento', nombre: 'Recital', descripcion: 'Música en vivo', categoria,
    inicio: INICIO, fin: FIN,
    tipos: [
      { id: 'general', nombre: 'General', precio: '125,50', cupoTotal: 3 },
      { id: 'vip', nombre: 'VIP', precio: '200', cupoTotal: 2 },
    ],
  };
  return { organizador, comprador, tercero, datos,
    evento: Evento.crear(organizador, datos, PUBLICACION) };
}

export function reservar(evento, comprador, id = 'compra', cantidad = 1, ahora = ANTES) {
  return evento.crearCompra(comprador, { id, tipoId: 'general', cantidad }, ahora);
}

export function error(codigo) {
  return { name: 'ErrorDominio', codigo };
}
