import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventPhase, watchEventDates } from '../src/eventDates.ts';

function observe(start, end) {
  const phases = [];
  let resume;
  const stop = watchEventDates(start, end, () => phases.push(eventPhase(start, end)), listener => {
    resume = listener;
    return () => { resume = undefined; };
  });
  return { phases, stop, resume: () => resume?.() };
}

test('la pantalla abierta cambia de fase en el inicio y el fin exactos', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  assert.equal(eventPhase(100, 200), 'upcoming');
  const screen = observe(100, 200);
  t.mock.timers.tick(99);
  assert.deepEqual(screen.phases, []);
  t.mock.timers.tick(1);
  assert.deepEqual(screen.phases, ['started']);
  t.mock.timers.tick(100);
  assert.deepEqual(screen.phases, ['started', 'ended']);
  t.mock.timers.tick(1000);
  assert.deepEqual(screen.phases, ['started', 'ended']);
  screen.stop();
});

test('volver al primer plano recupera el tiempo transcurrido y desmontar cancela las actualizaciones', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const screen = observe(100, 200);
  t.mock.timers.setTime(150);
  screen.resume();
  assert.deepEqual(screen.phases, ['started']);
  screen.stop();
  screen.resume();
  t.mock.timers.tick(100);
  assert.deepEqual(screen.phases, ['started']);
});

test('un inicio lejano supera el máximo de un temporizador sin adelantar la fase', t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 });
  const limit = 2 ** 31 - 1;
  const screen = observe(limit + 100, limit + 200);
  t.mock.timers.tick(limit);
  assert.deepEqual(screen.phases, []);
  t.mock.timers.tick(100);
  assert.deepEqual(screen.phases, ['started']);
  screen.stop();
});
