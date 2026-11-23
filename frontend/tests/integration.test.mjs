import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { crearAplicacion } from '../../backend/src/app.mjs';
import { catalogPath, createApi, eventPath, purchasePath } from '../src/api.ts';
import { argentinaInput, positiveInteger, priceInput } from '../src/format.ts';

test('cliente mobile con Express: compra, pago, conversación, reembolso, uso y reseña', async t => {
  let clock = Date.parse('2030-04-05T12:00:00-03:00');
  const server = crearAplicacion({ reloj: () => clock }).listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');

  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const guest = createApi(base);
  const users = await guest.get('/usuarios-demo');
  const organizer = createApi(base, users.find(user => user.roles.includes('ORGANIZADOR')).id);
  const buyer = createApi(base, users.find(user => user.roles.length === 1).id);
  const other = createApi(base, users.filter(user => user.roles.length === 1)[1].id);
  const [category] = await guest.get('/categorias');
  const first = await organizer.send('/eventos', 'POST', {
    nombre: 'Música móvil', descripcion: 'Prueba de la API', categoriaId: category.id,
    inicio: argentinaInput('06/04/2030 12:00'), fin: argentinaInput('06/04/2030 14:00'),
    multimedia: ['https://example.com/recital'],
    tipos: [{ nombre: 'General', precio: priceInput('125,50'), cupoTotal: '3' }],
  });
  const path = eventPath(first.id);
  const filter = { texto: 'musica movil', categoriaId: category.id, criterio: 'puntaje', sentido: 'asc' };
  assert.deepEqual((await guest.get(catalogPath(filter))).map(event => event.id), [first.id]);
  assert.equal((await guest.get(path)).reputacion.descripcion, 'sin calificaciones');

  const favorite = '/favoritos/' + encodeURIComponent(first.id);
  await buyer.send(favorite, 'PUT');
  assert.deepEqual(await buyer.get('/favoritos'), [first.id]);
  assert.deepEqual(await other.get('/favoritos'), []);
  await buyer.send(favorite, 'DELETE');
  assert.deepEqual(await buyer.get('/favoritos'), []);

  const ticket = first.tipos[0].id;
  const book = quantity => buyer.send(path + '/compras', 'POST', {
    tipoId: ticket, cantidad: positiveInteger(quantity),
  });
  assert.ok((await organizer.get('/mis-eventos')).some(event => event.id === first.id));
  await assert.rejects(other.get(path + '/compras'), { code: 'NO_AUTORIZADO' });

  const pending = await book('3');
  const purchase = purchasePath(first.id, pending.id);
  assert.equal(pending.totalPactado, '376.50');
  assert.equal(pending.estado, 'PENDIENTE');
  const soldOut = (await guest.get(catalogPath({ ...filter, criterio: 'precio', sentido: 'desc' })))[0];
  assert.equal(soldOut.agotado, true);
  assert.equal(soldOut.precioRepresentativo, '125.50');
  assert.equal((await organizer.get(path + '/compras')).tipos[0].disponibilidad, '0');
  await assert.rejects(book('1'), { code: 'SIN_CUPO' });

  assert.equal((await buyer.send(purchase + '/pagar', 'POST')).realizada, true);
  assert.equal((await buyer.get(purchase)).estado, 'CONFIRMADA');
  assert.equal((await organizer.get(path + '/compras')).tipos[0].disponibilidad, '0');
  await buyer.send(purchase + '/mensajes', 'POST', { texto: '¿Dónde se ingresa?' });
  await organizer.send(purchase + '/mensajes', 'POST', { texto: 'Por la puerta principal.' });
  await assert.rejects(other.get(purchase + '/mensajes'), { code: 'NO_AUTORIZADO' });
  assert.deepEqual(await other.get('/mis-compras'), []);

  assert.equal((await buyer.send(purchase + '/cancelar', 'POST')).realizada, true);
  const refunded = await buyer.get(purchase);
  assert.equal(refunded.estado, 'REEMBOLSADA');
  assert.equal(refunded.importeReembolsado, '376.50');
  assert.deepEqual(refunded.historial.map(change => change.destino),
    ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REEMBOLSADA']);
  assert.equal(refunded.historial.at(-1).actor.tipo, 'Sistema');
  assert.equal(refunded.historial.at(-1).causa, refunded.historial.at(-2).secuencia);
  assert.deepEqual((await organizer.get(purchase + '/mensajes')).map(message => message.texto),
    ['¿Dónde se ingresa?', 'Por la puerta principal.']);
  await buyer.send(purchase + '/mensajes', 'POST', { texto: 'Gracias.' });
  assert.equal((await buyer.get(purchase + '/mensajes')).length, 3);
  assert.equal((await guest.get(path)).tipos[0].disponibilidad, '3');

  const next = await book('2');
  const use = purchasePath(first.id, next.id);
  await buyer.send(use + '/pagar', 'POST');
  await assert.rejects(organizer.send(use + '/utilizar', 'POST'), { code: 'FUERA_DE_FECHA' });
  clock = Date.parse(first.inicio);
  assert.equal((await organizer.send(use + '/utilizar', 'POST')).realizada, true);
  assert.equal((await buyer.get(use)).estado, 'UTILIZADA');
  const review = { puntaje: 5, comentario: 'Excelente.' };
  await assert.rejects(buyer.send(path + '/resenas', 'POST', review), { code: 'FUERA_DE_FECHA' });
  clock = Date.parse(first.fin);
  await buyer.send(path + '/resenas', 'POST', review);
  await assert.rejects(buyer.send(path + '/resenas', 'POST', review), { code: 'RESENIA_DUPLICADA' });
  const rated = await guest.get(path);
  assert.equal(rated.resenias[0].comentario, review.comentario);
  assert.equal(rated.reputacion.descripcion, '5,0');
  assert.deepEqual(await guest.get(catalogPath(filter)), []);
  const another = (await organizer.get('/mis-eventos')).find(event => event.id !== first.id);
  const prior = (await guest.get(eventPath(another.id))).reseniasPrevias;
  assert.ok(prior.some(item => item.eventoId === first.id && item.resenia.puntaje === 5));
});
