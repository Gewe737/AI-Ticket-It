import assert from 'node:assert/strict';
import test from 'node:test';
import { Coordinador } from '../../src/application/coordinador.mjs';

test('la misma raíz espera hasta el final incluso ante un error; otra raíz avanza', async () => {
  const cola = new Coordinador();
  const entro = Promise.withResolvers();
  const liberar = Promise.withResolvers();
  const pasos = [];
  const primero = cola.ejecutar('evento-1', async () => {
    pasos.push('primero entró');
    entro.resolve();
    await liberar.promise;
    pasos.push('primero salió');
    throw new Error('rechazo controlado');
  });
  const rechazo = assert.rejects(primero, /rechazo controlado/);
  await entro.promise;
  const segundo = cola.ejecutar('evento-1', () => pasos.push('segundo'));
  try {
    await cola.ejecutar('evento-2', () => pasos.push('otra raíz'));
    assert.deepEqual(pasos, ['primero entró', 'otra raíz']);
  } finally {
    liberar.resolve();
  }
  await Promise.all([rechazo, segundo]);
  assert.deepEqual(pasos, ['primero entró', 'otra raíz', 'primero salió', 'segundo']);
});
