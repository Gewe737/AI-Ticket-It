import assert from 'node:assert/strict';
import test from 'node:test';
import { ANTES, FIN, error, escenario, reservar } from './datos.mjs';

test('la conversación pertenece a una compra y continúa ordenada tras cancelarla', () => {
  const { evento, comprador, organizador } = escenario();
  reservar(evento, comprador);
  reservar(evento, comprador, 'otra');
  evento.enviarMensaje(comprador, 'compra', ' ¿Dónde se ingresa? ', ANTES);
  evento.cancelarCompra(comprador, 'compra', ANTES);
  evento.enviarMensaje(organizador, 'compra', 'Por la puerta principal', ANTES);
  evento.enviarMensaje(comprador, 'compra', 'Gracias', FIN);
  const conversacion = evento.conversacion(comprador, 'compra');
  assert.deepEqual(conversacion, [
    { compraId: 'compra', secuencia: 1, autorId: comprador.id, texto: '¿Dónde se ingresa?', enviado: Date.parse(ANTES) },
    { compraId: 'compra', secuencia: 2, autorId: organizador.id, texto: 'Por la puerta principal', enviado: Date.parse(ANTES) },
    { compraId: 'compra', secuencia: 3, autorId: comprador.id, texto: 'Gracias', enviado: Date.parse(FIN) },
  ]);
  assert.equal(Reflect.set(conversacion[0], 'texto', 'editado'), false);
  assert.equal(Reflect.deleteProperty(conversacion, '0'), false);
  assert.deepEqual(evento.conversacion(organizador, 'compra'), conversacion);
  assert.deepEqual(evento.conversacion(organizador, 'otra'), []);
});

test('un tercero y un mensaje vacío no alteran la conversación ni consumen secuencia', () => {
  const { evento, comprador, organizador, tercero } = escenario();
  reservar(evento, comprador);
  assert.throws(() => evento.conversacion(tercero, 'compra'), error('NO_AUTORIZADO'));
  assert.throws(() => evento.enviarMensaje(tercero, 'compra', 'Mensaje ajeno', ANTES), error('NO_AUTORIZADO'));
  assert.throws(() => evento.enviarMensaje(comprador, 'compra', ' \t\n ', ANTES), error('DATOS_INVALIDOS'));
  assert.deepEqual(evento.conversacion(organizador, 'compra'), []);
  assert.equal(evento.enviarMensaje(organizador, 'compra', 'Hola', ANTES).secuencia, 1);
});
