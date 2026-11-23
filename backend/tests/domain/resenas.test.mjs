import assert from 'node:assert/strict';
import test from 'node:test';
import { Evento, catalogo, reputacion, reseniasPrevias } from '../../src/domain/index.mjs';
import { ANTES, FIN, INICIO, PUBLICACION, error, escenario, reservar, usuario } from './datos.mjs';

function usar(evento, organizador, comprador, id) {
  reservar(evento, comprador, id);
  evento.pagarCompra(comprador, id, ANTES);
  evento.utilizarCompra(organizador, id, INICIO);
}

test('reseñar exige uso propio, fin inclusivo, puntaje entero del 1 al 5 y comentario', () => {
  const { evento, comprador, organizador, tercero } = escenario();
  usar(evento, organizador, comprador, 'usada');
  reservar(evento, tercero, 'sin-uso');
  evento.pagarCompra(tercero, 'sin-uso', ANTES);
  assert.throws(() => evento.publicarResenia(tercero, 3, 'Sin uso', FIN), error('OPERACION_NO_PERMITIDA'));
  assert.throws(() => evento.publicarResenia(comprador, 3, 'Temprana', Date.parse(FIN) - 1),
    error('FUERA_DE_FECHA'));
  for (const puntaje of [0, 6, 2.5, '5']) {
    assert.throws(() => evento.publicarResenia(comprador, puntaje, 'Opinión', FIN), error('DATOS_INVALIDOS'));
  }
  assert.throws(() => evento.publicarResenia(comprador, 5, ' \t ', FIN), error('DATOS_INVALIDOS'));
  assert.deepEqual(evento.resenias(), []);
  assert.equal(reputacion(organizador.id, [evento]).promedio, null);
  const esperada = {
    eventoId: evento.id, compradorId: comprador.id, puntaje: 5, comentario: 'Muy bien', publicada: Date.parse(FIN),
  };
  assert.deepEqual(evento.publicarResenia(comprador, 5, ' Muy bien ', FIN), esperada);
  assert.equal(Reflect.set(evento.resenias()[0], 'puntaje', 1), false);
  assert.deepEqual(evento.resenias(), [esperada]);
});

test('una segunda compra utilizada no habilita otra reseña del mismo comprador y evento', () => {
  const { evento, organizador, comprador } = escenario();
  usar(evento, organizador, comprador, 'primera');
  usar(evento, organizador, comprador, 'segunda');
  const resenia = evento.publicarResenia(comprador, 1, 'Regular', FIN);
  assert.throws(() => evento.publicarResenia(comprador, 5, 'Otra opinión', FIN), error('RESENIA_DUPLICADA'));
  assert.deepEqual(evento.resenias(), [resenia]);
  assert.deepEqual(reputacion(organizador.id, [evento]).promedio, { numerador: 1n, denominador: 1n });
});

test('la reputación pondera por reseña, ordena con la razón exacta y deja sin calificaciones al final', () => {
  const { evento, organizador, comprador, tercero, datos } = escenario();
  const otro = usuario('otro-organizador', 'ORGANIZADOR');
  const nuevo = usuario('nuevo-organizador', 'ORGANIZADOR');
  const historico = (actor, id, cupoTotal) => Evento.crear(actor, {
    ...datos, id, tipos: [{ ...datos.tipos[0], cupoTotal }],
  }, PUBLICACION);
  const segundo = historico(organizador, 'segundo', 1);
  const comparacion = historico(otro, 'comparacion', 10);
  usar(evento, organizador, comprador, 'cinco');
  usar(evento, organizador, tercero, 'cuatro');
  usar(segundo, organizador, comprador, 'uno');
  evento.publicarResenia(comprador, 5, 'Excelente', FIN);
  evento.publicarResenia(tercero, 4, 'Bien', FIN);
  segundo.publicarResenia(comprador, 1, 'Mal', FIN);
  // 33/10 y 10/3 se muestran como 3,3; el orden debe distinguirlos.
  for (const [indice, puntaje] of [4, 4, 4, 3, 3, 3, 3, 3, 3, 3].entries()) {
    const asistente = usuario('asistente-' + indice);
    usar(comparacion, otro, asistente, 'compra-' + indice);
    comparacion.publicarResenia(asistente, puntaje, 'Opinión', FIN);
  }
  const futuro = (actor, id, nombre) => Evento.crear(actor, {
    ...datos, id, nombre, inicio: '2026-11-25T10:00:00-03:00', fin: '2026-11-25T12:00:00-03:00',
  }, PUBLICACION);
  const futuroPropio = futuro(organizador, 'propio', 'Zeta');
  const eventos = [
    futuro(nuevo, 'nuevo', 'Apertura'), comparacion, futuro(otro, 'otro', 'Alfa'),
    segundo, futuroPropio, evento,
  ];
  const reputacionPropia = reputacion(organizador.id, eventos);
  assert.deepEqual(reputacionPropia.promedio, { numerador: 10n, denominador: 3n });
  assert.equal(reputacionPropia.descripcion, '3,3');
  assert.equal(reputacion(otro.id, eventos).descripcion, '3,3');
  assert.equal(reputacion(nuevo.id, eventos).promedio, null);
  assert.equal(reputacion(nuevo.id, eventos).descripcion, 'sin calificaciones');
  const opciones = { ahora: FIN, criterio: 'puntaje' };
  assert.deepEqual(catalogo(eventos, opciones).map(e => e.id), ['propio', 'otro', 'nuevo']);
  assert.deepEqual(catalogo(eventos, { ...opciones, sentido: 'asc' }).map(e => e.id), ['otro', 'propio', 'nuevo']);
  assert.deepEqual(reseniasPrevias(futuroPropio, eventos, FIN)
    .map(r => [r.eventoId, r.nombreEvento, r.resenia.puntaje]).sort(),
    [['evento', 'Recital', 4], ['evento', 'Recital', 5], ['segundo', 'Recital', 1]]);
});
