import assert from 'node:assert/strict';
import test from 'node:test';
import { ReservationSession } from '../src/reservations.ts';
import { ApiError } from '../src/api.ts';

test('reabrir un evento comparte la reserva pendiente y su resultado solo con el mismo comprador', async () => {
  const session = new ReservationSession();
  const gate = Promise.withResolvers();
  let sends = 0;
  const send = () => { sends++; return gate.promise; };
  const first = session.forEvent('ana', 'evento');
  const running = first.run(send, () => 'Registrada');
  const reopened = session.forEvent('ana', 'evento');
  assert.equal(reopened.snapshot().status, 'sending');
  await reopened.run(send, () => 'Registrada');
  assert.equal(sends, 1);
  assert.equal(session.forEvent('otro', 'evento').snapshot().status, 'idle');
  assert.equal(session.forEvent('ana', 'otro').snapshot().status, 'idle');
  gate.resolve({ id: 'compra-7' });
  await running;
  assert.equal(reopened.snapshot().purchase.id, 'compra-7');
});

test('una escritura incierta requiere una lectura completa antes de volver a reservar', async () => {
  const entry = new ReservationSession().forEvent('ana', 'evento');
  let sends = 0;
  const send = async () => { sends++; throw new ApiError('RED', 'Sin respuesta', true); };
  await entry.run(send, () => 'Registrada');
  await entry.run(send, () => 'Registrada');
  assert.equal(sends, 1);
  await entry.check(async () => false);
  assert.equal(entry.snapshot().status, 'uncertain');
  await entry.check(async () => { throw Error('Sin conexión'); });
  assert.equal(entry.snapshot().status, 'uncertain');
  await entry.check(async () => true);
  await entry.run(send, () => 'Registrada');
  assert.equal(sends, 2);
});
