import assert from 'node:assert/strict';
import test from 'node:test';
import { Categoria, Evento, catalogo } from '../../src/domain/index.mjs';
import { ANTES, INICIO, PUBLICACION, error, escenario, reservar } from './datos.mjs';

test('publicar conserva organizador, ambos tipos y multimedia, aislados de los datos de entrada', () => {
  const { organizador, datos } = escenario();
  const inicio = new Date(INICIO);
  const multimedia = ['https://example.test/recital'];
  const evento = Evento.crear(organizador, { ...datos, inicio, multimedia }, PUBLICACION);
  inicio.setTime(0);
  datos.tipos[0].precio = '0';
  datos.tipos.pop();
  multimedia[0] = 'https://example.test/otro';
  const detalle = evento.detallePublico();
  assert.equal(detalle.organizadorId, organizador.id);
  assert.equal(detalle.categoria.id, 'musica');
  assert.equal(detalle.inicio, Date.parse(INICIO));
  assert.equal(detalle.multimedia[0].valor, 'https://example.test/recital');
  assert.deepEqual(detalle.tipos.map(t => [t.nombre, t.precio.centavos, t.cupoTotal, t.disponibilidad]),
    [['General', 12550n, 3n, 3n], ['VIP', 20000n, 2n, 2n]]);
  assert.equal(Reflect.set(detalle.tipos[0], 'disponibilidad', 99n), false);
  assert.equal(Reflect.set(detalle.tipos[0].precio, 'centavos', 0n), false);
  assert.equal(evento.disponibilidad('general'), 3n);
});

test('publicar con datos inválidos rechaza todo el evento y permite reintentar con los mismos datos válidos', () => {
  const { organizador, comprador, datos } = escenario();
  const [general, vip] = datos.tipos;
  assert.throws(() => Evento.crear(comprador, datos, PUBLICACION), error('NO_AUTORIZADO'));
  for (const [cambios, codigo = 'DATOS_INVALIDOS'] of [
    [{ nombre: ' ' }], [{ descripcion: ' ' }], [{ categoria: null }],
    [{ inicio: PUBLICACION }, 'FUERA_DE_FECHA'], [{ fin: INICIO }, 'FUERA_DE_FECHA'],
    [{ tipos: [] }], [{ tipos: [general, { ...vip, nombre: '' }] }],
    [{ tipos: [general, { ...vip, cupoTotal: 0 }] }],
    [{ tipos: [general, { ...vip, cupoTotal: 1.5 }] }],
    [{ tipos: [general, { ...vip, precio: '-1' }] }],
    [{ tipos: [general, { ...vip, precio: '125,501' }] }],
    [{ tipos: [general, { ...vip, precio: 125.501 }] }],
    [{ multimedia: ['https://example.test/valida', '/relativa'] }],
  ]) {
    assert.throws(() => Evento.crear(organizador, { ...datos, ...cambios }, PUBLICACION), error(codigo));
  }
  const evento = Evento.crear(organizador, datos, PUBLICACION);
  assert.deepEqual(evento.detallePublico().tipos.map(t => [t.id, t.disponibilidad]),
    [['general', 3n], ['vip', 2n]]);
});

test('las ofertas mal formadas se rechazan como datos inválidos', () => {
  const { organizador, datos } = escenario();
  const [general] = datos.tipos;
  const incompletos = [general];
  incompletos.length = 2;
  for (const tipos of [[general, null], incompletos]) {
    assert.throws(() => Evento.crear(organizador, { ...datos, tipos }, PUBLICACION),
      error('DATOS_INVALIDOS'));
  }
  assert.throws(() => Evento.crear(organizador, null, PUBLICACION), error('DATOS_INVALIDOS'));
});

test('el catálogo combina texto normalizado y categoría, incluye agotados y conserva el mínimo ofrecido', () => {
  const { organizador, comprador, datos } = escenario();
  const crear = cambios => Evento.crear(organizador, { ...datos, ...cambios }, PUBLICACION);
  const tipo = (precio, id = 'general') => ({ id, nombre: id, precio, cupoTotal: 1 });
  const comun = { inicio: '2026-11-24T10:00:00-03:00', fin: '2026-11-24T12:00:00-03:00' };
  const parcial = crear({ ...comun, id: 'parcial', descripcion: 'Una Canción en vivo',
    tipos: [tipo('100'), tipo('200', 'vip')] });
  const agotado = crear({ ...comun, id: 'agotado', nombre: 'Canción acústica', tipos: [tipo('150')] });
  const otra = crear({ ...comun, id: 'otra', nombre: 'Otra Canción', categoria: new Categoria({ id: 'teatro', nombre: 'Teatro' }) });
  const iniciado = crear({ id: 'iniciado', nombre: 'Canción anterior' });
  reservar(parcial, comprador, 'parcial');
  reservar(agotado, comprador, 'agotado');
  reservar(iniciado, comprador, 'vieja');
  const eventos = [otra, agotado, iniciado, parcial];
  const filtros = { texto: '  CANCION ', categoriaId: 'musica', criterio: 'precio', ahora: INICIO };
  const filas = catalogo(eventos, filtros);
  assert.deepEqual(filas.map(f => [f.id, f.precioRepresentativo.centavos, f.agotado]),
    [['parcial', 10000n, false], ['agotado', 15000n, true]]);
  assert.deepEqual(filas[0].tipos.map(t => [t.agotado, t.disponibilidad]), [[true, 0n], [false, 1n]]);
  assert.deepEqual(catalogo(eventos, { ...filtros, sentido: 'desc' }).map(f => f.id), ['agotado', 'parcial']);
  assert.deepEqual(catalogo(eventos, { ...filtros, texto: 'inexistente' }), []);
  const compra = iniciado.consultarCompra(comprador, 'vieja', INICIO);
  assert.equal(iniciado.detallePublico().id, compra.eventoId);
  assert.equal(Object.hasOwn(iniciado.detallePublico(), 'compras'), false);
});

test('el catálogo ordena inicialmente por fecha y desempata precio por fecha, nombre e ID en ambos sentidos', () => {
  const { organizador, datos } = escenario();
  const crear = (id, nombre, inicio, precio = '100') => Evento.crear(organizador, {
    ...datos, id, nombre, inicio, fin: '2026-11-27T12:00:00-03:00',
    tipos: [{ ...datos.tipos[0], precio }],
  }, PUBLICACION);
  const temprano = crear('primero', 'Zeta', '2026-11-24T10:00:00-03:00');
  const tarde = '2026-11-25T10:00:00-03:00';
  const empateB = crear('b', 'Alfa', tarde);
  const empateA = crear('a', 'Alfa', tarde);
  const porNombre = crear('nombre', 'Zeta', tarde);
  const caro = crear('caro', 'Alfa', INICIO, '200');
  const eventos = [empateB, caro, porNombre, empateA, temprano];
  const ahora = ANTES;
  assert.deepEqual(catalogo(eventos, { ahora }).map(e => e.id), ['caro', 'primero', 'a', 'b', 'nombre']);
  assert.deepEqual(catalogo(eventos, { ahora, criterio: 'precio' }).map(e => e.id),
    ['primero', 'a', 'b', 'nombre', 'caro']);
  assert.deepEqual(catalogo(eventos, { ahora, criterio: 'precio', sentido: 'desc' }).map(e => e.id),
    ['caro', 'primero', 'a', 'b', 'nombre']);
});

test('favoritos privados sin duplicados y protegidos de cambios desde la vista', () => {
  const { evento, comprador, tercero } = escenario();
  comprador.guardarFavorito(comprador, evento);
  comprador.guardarFavorito(comprador, evento);
  tercero.guardarFavorito(tercero, evento);
  const vista = comprador.favoritosPropios(comprador);
  assert.deepEqual(vista, [evento.id]);
  assert.equal(Reflect.set(vista, '0', 'otro'), false);
  assert.throws(() => comprador.favoritosPropios(tercero), error('NO_AUTORIZADO'));
  assert.throws(() => comprador.quitarFavorito(tercero, evento.id), error('NO_AUTORIZADO'));
  assert.deepEqual(comprador.favoritosPropios(comprador), [evento.id]);
  comprador.quitarFavorito(comprador, evento.id);
  comprador.quitarFavorito(comprador, evento.id);
  assert.deepEqual(comprador.favoritosPropios(comprador), []);
  assert.deepEqual(tercero.favoritosPropios(tercero), [evento.id]);
});
