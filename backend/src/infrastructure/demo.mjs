import { Categoria, Evento, Usuario } from '../domain/index.mjs';

const dia = 86_400_000;

export function cargarDemo({ usuarios, categorias, eventos, nuevoId }, ahora) {
  const organizador = new Usuario({
    id: 'organizador', nombre: 'Lucía', apellido: 'Vega', roles: ['ORGANIZADOR', 'COMPRADOR'],
  });
  const comprador = new Usuario({
    id: 'comprador', nombre: 'Martín', apellido: 'Paz', roles: ['COMPRADOR'],
  });
  const tercero = new Usuario({
    id: 'comprador-2', nombre: 'Elena', apellido: 'Ruiz', roles: ['COMPRADOR'],
  });
  for (const usuario of [organizador, comprador, tercero]) usuarios.agregar(usuario);

  const musica = new Categoria({ id: 'musica', nombre: 'Música', descripcion: 'Recitales y conciertos' });
  const teatro = new Categoria({ id: 'teatro', nombre: 'Teatro', descripcion: 'Obras y espectáculos' });
  for (const categoria of [musica, teatro]) categorias.agregar(categoria);

  eventos.agregar(Evento.crear(organizador, {
    id: nuevoId('evento'), nombre: 'Recital de jazz', descripcion: 'Jazz en vivo',
    categoria: musica, inicio: ahora + 2 * dia, fin: ahora + 2 * dia + 7_200_000,
    tipos: [
      { id: 'tipo-1', nombre: 'General', precio: '125.50', cupoTotal: '12' },
      { id: 'tipo-2', nombre: 'Preferencial', precio: '250.00', cupoTotal: '4' },
    ],
  }, ahora));
  eventos.agregar(Evento.crear(organizador, {
    id: nuevoId('evento'), nombre: 'Teatro de improvisación', descripcion: 'Una función de comedia',
    categoria: teatro, inicio: ahora + 5 * dia, fin: ahora + 5 * dia + 7_200_000,
    tipos: [{ id: 'tipo-1', nombre: 'General', precio: '180.00', cupoTotal: '20' }],
  }, ahora));
}
