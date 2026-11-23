import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi, eventPath, purchasePath, catalogPath } from '../src/api.ts';
import { ars, priceInput, positiveInteger, argentinaInput, dateLabel } from '../src/format.ts';

const result = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('cada cliente mantiene su identidad incluso con solicitudes pendientes', async () => {
  const seen = [];
  let resolveFirst;
  const transport = (url, options) => {
    seen.push([url, options.headers['X-Usuario-Demo']]);
    if (seen.length === 1) return new Promise(resolve => { resolveFirst = resolve; });
    return Promise.resolve(result([{ id: 'compra-2' }]));
  };
  const first = createApi('http://pc:3000/api/', 'Ana', transport).get('/mis-compras');
  const second = await createApi('http://pc:3000/api', 'Bruno', transport).get('/mis-compras');
  resolveFirst(result([{ id: 'compra-1' }]));
  assert.deepEqual(await first, [{ id: 'compra-1' }]);
  assert.deepEqual(second, [{ id: 'compra-2' }]);
  assert.deepEqual(seen, [['http://pc:3000/api/mis-compras', 'Ana'], ['http://pc:3000/api/mis-compras', 'Bruno']]);
  const publicClient = createApi('http://pc:3000/api', undefined, transport);
  await publicClient.get('/usuarios-demo');
  assert.equal(seen[2][1], undefined);
});

test('el cliente conserva código y mensaje de rechazo y distingue escrituras inciertas', async () => {
  const conflict = createApi('http://pc/api', 'Ana', async () =>
    result({ error: { codigo: 'SIN_CUPO', mensaje: 'No hay cupo suficiente.' } }, 409));
  await assert.rejects(conflict.send('/x', 'POST'), { code: 'SIN_CUPO', message: 'No hay cupo suficiente.', uncertain: false });
  let calls = 0;
  const offline = createApi('http://pc/api', 'Ana', async () => { calls++; throw new TypeError('Network'); });
  await assert.rejects(offline.send('/x', 'POST', { cantidad: '9007199254740993' }), { code: 'RED', uncertain: true });
  assert.equal(calls, 1);
  await assert.rejects(offline.get('/x'), { code: 'RED', uncertain: false });
  const malformed = createApi('http://pc/api', 'Ana', async () => new Response('html'));
  await assert.rejects(malformed.send('/x', 'POST'), { code: 'RESPUESTA_INVALIDA', uncertain: true });
  await assert.rejects(createApi('').get('/x'), { code: 'CONFIGURACION', uncertain: false });
});

test('consultas y rutas codifican filtros e identificadores sin alterar su contenido', () => {
  assert.equal(eventPath('a/b'), '/eventos/a%2Fb');
  assert.equal(purchasePath('a/b', 'x?'), '/eventos/a%2Fb/compras/x%3F');
  const query = new URL(catalogPath({ texto: 'música & teatro', categoriaId: 'a/b', criterio: 'puntaje', sentido: 'asc' }), 'http://host').searchParams;
  assert.deepEqual(Object.fromEntries(query), { texto: 'música & teatro', categoriaId: 'a/b', criterio: 'puntaje', sentido: 'asc' });
});

test('precios y cantidades preservan todos los dígitos', () => {
  assert.equal(priceInput(' 9.007.199.254.740.993,09 '), '9007199254740993.09');
  assert.equal(priceInput('125.5'), '125.5');
  assert.equal(priceInput('0'), '0');
  assert.throws(() => priceInput('12,345'));
  assert.throws(() => priceInput('1e9'));
  assert.equal(ars('9007199254740993.09'), 'ARS 9.007.199.254.740.993,09');
  assert.equal(positiveInteger('09007199254740993'), '9007199254740993');
  for (const input of ['0', '-1', '1.2', '1e3']) assert.throws(() => positiveInteger(input));
});

test('fechas argentinas estrictas con zona y cambio de día', () => {
  assert.equal(argentinaInput('29/02/2032 23:15'), '2032-02-29T23:15:00-03:00');
  for (const date of ['29/02/2030 23:15', '31/04/2030 09:00', '01/01/2030 24:00']) assert.throws(() => argentinaInput(date));
  assert.match(dateLabel('2030-01-01T02:30:00Z'), /31\/12\/2029.*23:30/);
});