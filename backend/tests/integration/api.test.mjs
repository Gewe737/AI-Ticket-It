import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { crearAplicacion } from '../../src/app.mjs';
import { Coordinador } from '../../src/application/coordinador.mjs';

const organizador = 'organizador';
const comprador = 'comprador';
const tercero = 'comprador-2';
const inicio = '2030-04-05T12:00:00-03:00';
const fin = '2030-04-05T14:00:00-03:00';

async function escenario(t, opciones = {}) {
  let ahora = Date.parse('2030-04-04T23:00:00-03:00');
  const app = crearAplicacion({ reloj: () => ahora, ...opciones });
  const servidor = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) =>
    servidor.close(error => error ? reject(error) : resolve())));
  await once(servidor, 'listening');
  const base = 'http://127.0.0.1:' + servidor.address().port + '/api';
  async function pedir(metodo, ruta, { actor, datos, headers, raw } = {}) {
    const respuesta = await fetch(base + ruta, {
      method: metodo,
      signal: AbortSignal.timeout(5000),
      headers: {
        ...(actor && { 'X-Usuario-Demo': actor }),
        ...((datos !== undefined || raw !== undefined) && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: raw ?? (datos === undefined ? undefined : JSON.stringify(datos)),
    });
    return { estado: respuesta.status, cuerpo: await respuesta.json() };
  }
  async function ok(metodo, ruta, opciones, estado = 200) {
    const resultado = await pedir(metodo, ruta, opciones);
    assert.equal(resultado.estado, estado, JSON.stringify(resultado.cuerpo));
    return resultado.cuerpo;
  }
  async function error(metodo, ruta, opciones, estado, codigo) {
    const resultado = await pedir(metodo, ruta, opciones);
    assert.equal(resultado.estado, estado, JSON.stringify(resultado.cuerpo));
    assert.equal(resultado.cuerpo.error.codigo, codigo);
  }
  async function publicar(cambios = {}) {
    const evento = await ok('POST', '/eventos', { actor: organizador, datos: {
      nombre: 'Canción en vivo', descripcion: 'Una noche de música', categoriaId: 'musica',
      inicio, fin, tipos: [{ nombre: 'General', precio: '125,50', cupoTotal: '3' }],
      multimedia: ['https://example.test/concierto'], ...cambios,
    } }, 201);
    return { evento, ruta: '/eventos/' + evento.id, tipoId: evento.tipos[0].id };
  }
  async function comprar({ ruta, tipoId }, cantidad = '1', actor = comprador) {
    const compra = await ok('POST', ruta + '/compras', { actor, datos: { tipoId, cantidad } }, 201);
    return { compra, rutaCompra: ruta + '/compras/' + compra.id };
  }
  return { pedir, ok, error, publicar, comprar, momento: valor => { ahora = Date.parse(valor); } };
}

test('publicar, reservar, pagar y consultar una compra propia', async t => {
  const { ok, publicar, comprar } = await escenario(t);
  const datos = await publicar();
  const { compra, rutaCompra } = await comprar(datos, '2');
  assert.equal(compra.estado, 'PENDIENTE');
  assert.equal(compra.totalPactado, '251.00');
  assert.equal(compra.informacionTemporal, null);
  assert.equal((await ok('POST', rutaCompra + '/pagar', { actor: comprador })).realizada, true);
  const [pagada] = await ok('GET', '/mis-compras', { actor: comprador });
  const detalle = await ok('GET', datos.ruta);
  assert.equal(pagada.estado, 'CONFIRMADA');
  assert.equal(pagada.importePagado, '251.00');
  assert.equal(pagada.historial[0].momento, '2030-04-05T02:00:00.000Z');
  assert.deepEqual(pagada.informacionTemporal, { diasRestantes: 1, descripcion: '1 día' });
  assert.deepEqual(await ok('GET', rutaCompra, { actor: organizador }), pagada);
  assert.equal(detalle.tipos[0].disponibilidad, '1');
  assert.equal(Object.hasOwn(detalle, 'compras'), false);
});

test('cancelaciones concurrentes reembolsan el total y liberan cupo una sola vez', async t => {
  const { ok, publicar, comprar, momento } = await escenario(t);
  const datos = await publicar();
  const { rutaCompra } = await comprar(datos, '3');
  const pagos = await Promise.all([1, 2].map(() =>
    ok('POST', rutaCompra + '/pagar', { actor: comprador })));
  assert.deepEqual(pagos.map(p => p.realizada).sort(), [false, true]);
  const cancelaciones = await Promise.all([1, 2].map(() =>
    ok('POST', rutaCompra + '/cancelar', { actor: comprador })));
  assert.deepEqual(cancelaciones.map(c => c.realizada).sort(), [false, true]);
  const compra = await ok('GET', rutaCompra, { actor: comprador });
  assert.equal(compra.estado, 'REEMBOLSADA');
  assert.equal(compra.importeReembolsado, '376.50');
  assert.deepEqual(compra.historial.map(c => c.destino),
    ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REEMBOLSADA']);
  const [cancelacion, reembolso] = compra.historial.slice(-2);
  assert.deepEqual(reembolso.actor, { tipo: 'Sistema' });
  assert.equal(reembolso.causa, cancelacion.secuencia);
  assert.equal(reembolso.momento, cancelacion.momento);
  assert.equal((await ok('GET', datos.ruta)).tipos[0].disponibilidad, '3');
  momento(fin);
  for (const accion of ['pagar', 'cancelar']) {
    assert.deepEqual(await ok('POST', rutaCompra + '/' + accion, { actor: comprador }),
      { realizada: false, mensaje: 'operación ya realizada' });
  }
});

test('identidad, roles y propiedad se resuelven en el servidor', async t => {
  const { ok, error, publicar, comprar } = await escenario(t);
  const usuarios = await ok('GET', '/usuarios-demo');
  assert.deepEqual(usuarios.map(u => u.id), [organizador, comprador, tercero]);
  const datos = await publicar();
  const { rutaCompra } = await comprar(datos);
  await error('GET', '/mis-compras', {}, 401, 'IDENTIDAD_DEMO_INVALIDA');
  await error('GET', rutaCompra, {}, 401, 'IDENTIDAD_DEMO_INVALIDA');
  await error('GET', '/mis-compras', { actor: 'no-existe' }, 401, 'IDENTIDAD_DEMO_INVALIDA');
  await error('POST', datos.ruta + '/compras', {
    actor: organizador, datos: { tipoId: datos.tipoId, cantidad: '1' },
  }, 403, 'NO_AUTORIZADO');
  await error('POST', '/eventos', { actor: comprador, datos: {
    nombre: 'Evento', descripcion: 'Descripción', categoriaId: 'musica', inicio, fin,
    tipos: [{ nombre: 'General', precio: '1', cupoTotal: '1' }], roles: ['ORGANIZADOR'],
  } }, 403, 'NO_AUTORIZADO');
  for (const accion of ['pagar', 'cancelar', 'utilizar']) {
    await error('POST', rutaCompra + '/' + accion, { actor: tercero }, 403, 'NO_AUTORIZADO');
  }
  await error('GET', rutaCompra, { actor: tercero }, 403, 'NO_AUTORIZADO');
  await error('GET', datos.ruta + '/compras/no-existe', { actor: tercero }, 403, 'NO_AUTORIZADO');
  assert.deepEqual(await ok('GET', '/mis-compras', { actor: tercero }), []);
});

test('mensajes privados disponibles tras cancelar y panel del organizador por tipo', async t => {
  const { ok, error, publicar, comprar } = await escenario(t);
  const datos = await publicar({ tipos: [
    { nombre: 'General', precio: '10', cupoTotal: '3' },
    { nombre: 'VIP', precio: '20', cupoTotal: '4' },
  ] });
  const { rutaCompra } = await comprar(datos, '2');
  const mensajes = rutaCompra + '/mensajes';
  const panel = datos.ruta + '/compras';
  await error('GET', panel, { actor: tercero }, 403, 'NO_AUTORIZADO');
  assert.ok((await ok('GET', '/mis-eventos', { actor: organizador })).some(e => e.id === datos.evento.id));
  assert.deepEqual((await ok('GET', panel, { actor: organizador })).tipos.map(t => t.disponibilidad), ['1', '4']);
  await error('GET', mensajes, { actor: tercero }, 403, 'NO_AUTORIZADO');
  await error('POST', mensajes, { actor: tercero, datos: { texto: 'Intruso' } }, 403, 'NO_AUTORIZADO');
  await error('POST', mensajes, { actor: comprador, datos: { texto: '   ' } }, 400, 'DATOS_INVALIDOS');
  const pregunta = await ok('POST', mensajes, { actor: comprador, datos: { texto: ' ¿Dónde? ' } }, 201);
  await ok('POST', rutaCompra + '/cancelar', { actor: comprador });
  const respuesta = await ok('POST', mensajes, { actor: organizador, datos: { texto: 'Por la puerta principal' } }, 201);
  assert.deepEqual([pregunta.secuencia, pregunta.texto, respuesta.secuencia, respuesta.autorId],
    [1, '¿Dónde?', 2, organizador]);
  assert.equal(respuesta.enviado, '2030-04-05T02:00:00.000Z');
  for (const actor of [comprador, organizador]) {
    assert.deepEqual(await ok('GET', mensajes, { actor }), [pregunta, respuesta]);
  }
  assert.equal((await ok('GET', panel, { actor: organizador })).compras[0].estado, 'CANCELADA');
});

test('uso completo desde el inicio, reseña al fin y reputación en otro evento', async t => {
  const { ok, error, publicar, comprar, momento } = await escenario(t);
  const datos = await publicar();
  const siguiente = await publicar({ nombre: 'Próxima fecha',
    inicio: '2030-04-07T12:00:00Z', fin: '2030-04-07T14:00:00Z' });
  const { rutaCompra } = await comprar(datos, '3');
  const utilizar = rutaCompra + '/utilizar';
  const resenias = datos.ruta + '/resenas';
  const opinion = { actor: comprador, datos: { puntaje: 5, comentario: ' Excelente ' } };
  await ok('POST', rutaCompra + '/pagar', { actor: comprador });
  await error('POST', utilizar, { actor: organizador }, 409, 'FUERA_DE_FECHA');
  momento(inicio);
  await error('POST', utilizar, { actor: comprador }, 403, 'NO_AUTORIZADO');
  assert.equal((await ok('POST', utilizar, { actor: organizador })).realizada, true);
  assert.equal((await ok('POST', utilizar, { actor: organizador })).realizada, false);
  assert.equal((await ok('GET', rutaCompra, { actor: comprador })).cantidad, '3');
  assert.equal((await ok('GET', datos.ruta)).tipos[0].disponibilidad, '0');
  await error('POST', resenias, opinion, 409, 'FUERA_DE_FECHA');
  momento(fin);
  await error('POST', resenias, { ...opinion, actor: tercero }, 409, 'OPERACION_NO_PERMITIDA');
  const reseña = await ok('POST', resenias, opinion, 201);
  assert.equal(reseña.publicada, '2030-04-05T17:00:00.000Z');
  await error('POST', resenias, opinion, 409, 'RESENIA_DUPLICADA');
  const detalleSiguiente = await ok('GET', siguiente.ruta);
  assert.deepEqual(detalleSiguiente.reputacion.promedio, { numerador: '5', denominador: '1' });
  assert.deepEqual(detalleSiguiente.reseniasPrevias, [{
    eventoId: datos.evento.id, nombreEvento: datos.evento.nombre, resenia: reseña,
  }]);
  assert.deepEqual((await ok('GET', '/eventos?criterio=puntaje')).find(e => e.id === siguiente.evento.id)
    .reputacion, detalleSiguiente.reputacion);
  assert.deepEqual((await ok('GET', datos.ruta)).resenias, [reseña]);
  assert.ok(!(await ok('GET', '/eventos')).some(e => e.id === datos.evento.id));
});

test('validación estructural y representación exacta de importes, cantidades y fechas', async t => {
  const { ok, error, publicar, comprar } = await escenario(t);
  const cantidad = '9007199254740993';
  const precio = '9007199254740993.01';
  const datos = await publicar({ tipos: [{ nombre: 'General', precio, cupoTotal: cantidad }] });
  assert.equal(datos.evento.inicio, '2030-04-05T15:00:00.000Z');
  assert.equal(datos.evento.tipos[0].precio, precio);
  assert.deepEqual(datos.evento.multimedia, ['https://example.test/concierto']);
  const base = { nombre: 'Inválido', descripcion: 'Prueba', categoriaId: 'musica', inicio, fin,
    tipos: [{ nombre: 'General', precio: '1', cupoTotal: '1' }] };
  for (const cambio of [
    { inicio: '2030-04-05T12:00:00' }, { inicio: '2030-04-31T12:00:00Z' },
    { multimedia: null }, { tipos: [null] }, { tipos: [{ nombre: 'E', precio: 1, cupoTotal: '1' }] },
  ]) {
    await error('POST', '/eventos', { actor: organizador, datos: { ...base, ...cambio } },
      400, 'DATOS_INVALIDOS');
  }
  await error('POST', '/eventos', { actor: organizador, raw: '{' }, 400, 'DATOS_INVALIDOS');
  await error('GET', '/eventos?criterio=precio&criterio=fecha', {}, 400, 'DATOS_INVALIDOS');
  assert.deepEqual(await ok('GET', '/eventos?texto=Inválido'), []);
  for (const invalida of ['0', '1.5', '1e2', 9007199254740992]) {
    await error('POST', datos.ruta + '/compras', { actor: comprador, datos: {
      cantidad: invalida, tipoId: datos.tipoId,
    } }, 400, 'DATOS_INVALIDOS');
  }
  const { compra } = await comprar(datos, cantidad);
  const centavos = 900719925474099301n * BigInt(cantidad);
  assert.equal(compra.totalPactado, String(centavos / 100n) + '.' + String(centavos % 100n).padStart(2, '0'));
  assert.equal(compra.cantidad, cantidad);
  assert.equal((await ok('GET', datos.ruta)).tipos[0].disponibilidad, '0');
});

test('catálogo por texto, categoría, precio y agotados, con favoritos privados', async t => {
  const { ok, publicar, comprar } = await escenario(t);
  assert.ok((await ok('GET', '/categorias')).some(c => c.id === 'musica'));
  const barato = await publicar({ tipos: [{ nombre: 'General', precio: '10', cupoTotal: '1' }] });
  const caro = await publicar();
  await publicar({ categoriaId: 'teatro' });
  await comprar(barato);
  const encontrados = await ok('GET', '/eventos?texto=CANCION&categoriaId=musica&criterio=precio&sentido=desc');
  const coincidencias = encontrados.filter(e => e.nombre === 'Canción en vivo');
  assert.deepEqual(coincidencias.map(e => e.id), [caro.evento.id, barato.evento.id]);
  assert.equal(coincidencias[1].agotado, true);
  const favorito = '/favoritos/' + barato.evento.id;
  await Promise.all([1, 2].map(() => ok('PUT', favorito, { actor: comprador })));
  assert.deepEqual(await ok('GET', '/favoritos', { actor: comprador }), [barato.evento.id]);
  assert.deepEqual(await ok('GET', '/favoritos', { actor: tercero }), []);
  await ok('PUT', favorito, { actor: tercero });
  await ok('DELETE', favorito, { actor: comprador });
  assert.deepEqual(await ok('GET', '/favoritos', { actor: comprador }), []);
  assert.deepEqual(await ok('GET', '/favoritos', { actor: tercero }), [barato.evento.id]);
});

test('dos solicitudes en vuelo por la última entrada dejan una sola reserva', async t => {
  const cola = new Coordinador();
  const encoladas = Promise.withResolvers();
  let intentos = 0;
  const coordinacionEvento = { ejecutar(id, operacion) {
    const resultado = cola.ejecutar(id, operacion);
    if (++intentos === 2) encoladas.resolve();
    return resultado;
  } };
  const { pedir, ok, publicar } = await escenario(t, { coordinacionEvento });
  const { evento, ruta, tipoId } = await publicar({
    tipos: [{ nombre: 'General', precio: '100', cupoTotal: '1' }],
  });
  const entrada = Promise.withResolvers();
  const libre = Promise.withResolvers();
  const bloqueo = cola.ejecutar(evento.id, async () => {
    entrada.resolve();
    await libre.promise;
  });
  await entrada.promise;
  const solicitudes = [comprador, tercero].map(actor =>
    pedir('POST', ruta + '/compras', { actor, datos: { tipoId, cantidad: '1' } }));
  try {
    await Promise.race([encoladas.promise, ...solicitudes.map(p => p.then(() =>
      assert.fail('Una respuesta llegó antes de liberar la raíz')))]);
  } finally {
    libre.resolve();
  }
  await bloqueo;
  const resultados = await Promise.all(solicitudes);
  assert.deepEqual(resultados.map(r => r.estado).sort(), [201, 409]);
  assert.equal(resultados.find(r => r.estado === 409).cuerpo.error.codigo, 'SIN_CUPO');
  assert.equal((await ok('GET', ruta)).tipos[0].disponibilidad, '0');
  assert.equal((await ok('GET', ruta + '/compras', { actor: organizador })).compras.length, 1);
});

test('una espera cruza el inicio y el rechazo libera la cola para el uso posterior', async t => {
  const cola = new Coordinador();
  let encolado;
  const coordinacionEvento = { ejecutar(id, operacion) {
    const resultado = cola.ejecutar(id, operacion);
    encolado?.resolve();
    return resultado;
  } };
  const { ok, error, publicar, comprar, momento } = await escenario(t, { coordinacionEvento });
  const datos = await publicar();
  const { rutaCompra: confirmada } = await comprar(datos);
  await ok('POST', confirmada + '/pagar', { actor: comprador });
  const enEspera = await comprar(datos);
  encolado = Promise.withResolvers();
  const liberar = Promise.withResolvers();
  const bloqueo = cola.ejecutar(datos.evento.id, () => liberar.promise);
  const pago = error('POST', enEspera.rutaCompra + '/pagar', { actor: comprador }, 409, 'FUERA_DE_FECHA');
  try {
    await Promise.race([encolado.promise, pago.then(() => assert.fail('Se omitió la cola'))]);
    momento(inicio);
  } finally {
    liberar.resolve();
  }
  await Promise.all([pago, bloqueo]);
  assert.equal((await ok('GET', enEspera.rutaCompra, { actor: comprador })).historial.length, 1);
  assert.equal((await ok('POST', confirmada + '/utilizar', { actor: organizador })).realizada, true);
});
