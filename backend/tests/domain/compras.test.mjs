import assert from 'node:assert/strict';
import test from 'node:test';
import { ANTES, FIN, INICIO, error, escenario, reservar } from './datos.mjs';

test('una compra pendiente de un solo tipo reserva su cantidad y el pago conserva el cupo', () => {
  const { evento, comprador } = escenario();
  const compra = reservar(evento, comprador, 'compra', 2);
  assert.equal(compra.estado, 'PENDIENTE');
  assert.equal(compra.tipoId, 'general');
  assert.equal(compra.cantidad, 2n);
  assert.equal(compra.pagoRealizado, false);
  assert.equal(evento.disponibilidad('general'), 1n);
  assert.equal(evento.disponibilidad('vip'), 2n);
  assert.equal(evento.pagarCompra(comprador, 'compra', ANTES).realizada, true);
  const pagada = evento.consultarCompra(comprador, 'compra', ANTES);
  assert.equal(pagada.estado, 'CONFIRMADA');
  assert.equal(pagada.totalPactado.centavos, 25100n);
  assert.equal(pagada.importePagado.centavos, 25100n);
  assert.deepEqual(evento.pagarCompra(comprador, 'compra', ANTES),
    { realizada: false, mensaje: 'operación ya realizada' });
  assert.deepEqual(evento.consultarCompra(comprador, 'compra', ANTES), pagada);
  assert.equal(evento.disponibilidad('general'), 1n);
});

test('dos intentos sucesivos sobre la misma raíz solo reservan una vez la última entrada', () => {
  const { evento, comprador, tercero, organizador } = escenario();
  reservar(evento, comprador, 'previa', 2);
  assert.equal(evento.disponibilidad('general'), 1n);
  assert.equal(reservar(evento, comprador, 'ultima').estado, 'PENDIENTE');
  assert.throws(() => reservar(evento, tercero, 'rechazada'), error('SIN_CUPO'));
  assert.deepEqual(evento.comprasDelComprador(tercero, ANTES), []);
  assert.deepEqual(evento.comprasDelOrganizador(organizador, ANTES).compras.map(c => c.id),
    ['previa', 'ultima']);
  assert.equal(evento.disponibilidad('general'), 0n);
});

test('los datos inválidos, el tipo ajeno y el ID repetido se rechazan sin cambios parciales', () => {
  const { evento, comprador, organizador } = escenario();
  const original = reservar(evento, comprador);
  for (const datos of [
    { cantidad: 0 }, { cantidad: -1 }, { cantidad: 1.5 }, { tipoId: 'ajeno' },
    { id: 'compra' }, { id: '   ' }, null,
  ]) {
    const solicitud = datos === null ? null : { id: 'nueva', tipoId: 'general', cantidad: 1, ...datos };
    assert.throws(() => evento.crearCompra(comprador, solicitud, ANTES), error('DATOS_INVALIDOS'));
    assert.deepEqual(evento.comprasDelOrganizador(organizador, ANTES).compras, [original]);
    assert.equal(evento.disponibilidad('general'), 2n);
    assert.equal(evento.disponibilidad('vip'), 2n);
  }
});

test('cancelar una pendiente libera una vez y conserva la ausencia de pago y reembolso', () => {
  const { evento, comprador } = escenario();
  reservar(evento, comprador, 'compra', 2);
  assert.equal(evento.cancelarCompra(comprador, 'compra', ANTES).realizada, true);
  const cancelada = evento.consultarCompra(comprador, 'compra', ANTES);
  assert.equal(cancelada.estado, 'CANCELADA');
  assert.equal(cancelada.importePagado, null);
  assert.equal(cancelada.importeReembolsado, null);
  assert.equal(cancelada.reembolsoRealizado, false);
  assert.deepEqual(cancelada.historial.map(c => c.destino), ['PENDIENTE', 'CANCELADA']);
  assert.equal(evento.disponibilidad('general'), 3n);
  assert.equal(evento.cancelarCompra(comprador, 'compra', FIN).realizada, false);
  assert.throws(() => evento.pagarCompra(comprador, 'compra', ANTES), error('OPERACION_NO_PERMITIDA'));
  assert.deepEqual(evento.consultarCompra(comprador, 'compra', FIN), cancelada);
  assert.equal(evento.disponibilidad('general'), 3n);
});

test('ARS 125,50 por tres se pagan y reembolsan exactamente con historial atribuido', () => {
  const { evento, comprador } = escenario();
  const creacion = '2026-11-22T23:00:00-03:00';
  const pago = '2026-11-23T09:00:00-03:00';
  const pendiente = reservar(evento, comprador, 'compra', 3, creacion);
  assert.equal(pendiente.precioUnitarioPactado.centavos, 12550n);
  assert.equal(pendiente.totalPactado.centavos, 37650n);
  assert.equal(pendiente.totalPactado.toString(), '376,50');
  evento.pagarCompra(comprador, 'compra', pago);
  assert.equal(evento.cancelarCompra(comprador, 'compra', ANTES).realizada, true);
  const reembolsada = evento.consultarCompra(comprador, 'compra', ANTES);
  assert.equal(reembolsada.estado, 'REEMBOLSADA');
  assert.equal(reembolsada.importePagado.centavos, 37650n);
  assert.equal(reembolsada.importeReembolsado.centavos, 37650n);
  assert.equal(reembolsada.reembolsoRealizado, true);
  const actor = { tipo: 'Usuario', id: comprador.id };
  assert.deepEqual(reembolsada.historial, [
    { compraId: 'compra', secuencia: 1, origen: null, destino: 'PENDIENTE',
      accion: 'CREAR', actor, momento: Date.parse(creacion), causa: null },
    { compraId: 'compra', secuencia: 2, origen: 'PENDIENTE', destino: 'CONFIRMADA',
      accion: 'PAGAR', actor, momento: Date.parse(pago), causa: null },
    { compraId: 'compra', secuencia: 3, origen: 'CONFIRMADA', destino: 'CANCELADA',
      accion: 'CANCELAR', actor, momento: Date.parse(ANTES), causa: null },
    { compraId: 'compra', secuencia: 4, origen: 'CANCELADA', destino: 'REEMBOLSADA',
      accion: 'REEMBOLSAR_AUTOMATICO', actor: { tipo: 'Sistema' }, momento: Date.parse(ANTES), causa: 3 },
  ]);
  assert.equal(evento.disponibilidad('general'), 3n);
  reservar(evento, comprador, 'segunda', 3);
  for (const repetir of ['pagarCompra', 'cancelarCompra']) {
    assert.deepEqual(evento[repetir](comprador, 'compra', FIN),
      { realizada: false, mensaje: 'operación ya realizada' });
  }
  assert.deepEqual(evento.consultarCompra(comprador, 'compra', FIN), reembolsada);
  assert.equal(evento.disponibilidad('general'), 0n);
});

test('la autorización precede a reconocer pago, cancelación y uso repetidos', () => {
  const { evento, comprador, organizador, tercero } = escenario();
  reservar(evento, comprador, 'reembolsada');
  reservar(evento, comprador, 'utilizada');
  evento.pagarCompra(comprador, 'reembolsada', ANTES);
  evento.cancelarCompra(comprador, 'reembolsada', ANTES);
  evento.pagarCompra(comprador, 'utilizada', ANTES);
  evento.utilizarCompra(organizador, 'utilizada', INICIO);
  const antes = evento.comprasDelOrganizador(organizador, FIN);
  for (const actor of [tercero, organizador]) {
    assert.throws(() => evento.pagarCompra(actor, 'reembolsada', FIN), error('NO_AUTORIZADO'));
    assert.throws(() => evento.cancelarCompra(actor, 'reembolsada', FIN), error('NO_AUTORIZADO'));
  }
  for (const actor of [tercero, comprador]) {
    assert.throws(() => evento.utilizarCompra(actor, 'utilizada', FIN), error('NO_AUTORIZADO'));
  }
  assert.throws(() => evento.consultarCompra(tercero, 'utilizada', FIN), error('NO_AUTORIZADO'));
  assert.throws(() => evento.comprasDelOrganizador(tercero, FIN), error('NO_AUTORIZADO'));
  assert.deepEqual(evento.comprasDelComprador(tercero, FIN), []);
  assert.deepEqual(evento.comprasDelOrganizador(organizador, FIN), antes);
});

test('el organizador con rol comprador no puede comprar entradas de su propio evento', () => {
  const { evento, organizador } = escenario();
  assert.throws(() => reservar(evento, organizador), error('NO_AUTORIZADO'));
  assert.deepEqual(evento.comprasDelOrganizador(organizador, ANTES).compras, []);
  assert.equal(evento.disponibilidad('general'), 3n);
});

test('comprar, pagar o cancelar al inicio o después se rechaza sin perder la reserva', () => {
  const { evento, comprador, organizador } = escenario();
  reservar(evento, comprador, 'pendiente');
  reservar(evento, comprador, 'confirmada');
  evento.pagarCompra(comprador, 'confirmada', ANTES);
  for (const momento of [INICIO, FIN]) {
    const antes = evento.comprasDelOrganizador(organizador, momento);
    assert.throws(() => reservar(evento, comprador, 'nueva', 1, momento), error('FUERA_DE_FECHA'));
    assert.throws(() => evento.pagarCompra(comprador, 'pendiente', momento), error('FUERA_DE_FECHA'));
    for (const id of ['pendiente', 'confirmada']) {
      assert.throws(() => evento.cancelarCompra(comprador, id, momento), error('FUERA_DE_FECHA'));
    }
    assert.deepEqual(evento.comprasDelOrganizador(organizador, momento), antes);
    assert.equal(evento.disponibilidad('general'), 1n);
  }
});

test('solo el organizador usa la compra confirmada completa desde el inicio exacto', () => {
  const { evento, comprador, organizador, tercero } = escenario();
  reservar(evento, comprador, 'compra', 3);
  assert.throws(() => evento.utilizarCompra(organizador, 'compra', INICIO),
    error('OPERACION_NO_PERMITIDA'));
  evento.pagarCompra(comprador, 'compra', ANTES);
  const confirmada = evento.consultarCompra(comprador, 'compra', INICIO);
  assert.throws(() => evento.utilizarCompra(organizador, 'compra', ANTES), error('FUERA_DE_FECHA'));
  for (const actor of [comprador, tercero]) {
    assert.throws(() => evento.utilizarCompra(actor, 'compra', INICIO), error('NO_AUTORIZADO'));
  }
  assert.deepEqual(evento.consultarCompra(comprador, 'compra', INICIO), confirmada);
  assert.equal(evento.utilizarCompra(organizador, 'compra', INICIO).realizada, true);
  const utilizada = evento.consultarCompra(comprador, 'compra', FIN);
  assert.equal(utilizada.estado, 'UTILIZADA');
  assert.equal(utilizada.cantidad, 3n);
  assert.deepEqual(utilizada.historial.at(-1), {
    compraId: 'compra', secuencia: 3, origen: 'CONFIRMADA', destino: 'UTILIZADA',
    accion: 'UTILIZAR', actor: { tipo: 'Usuario', id: organizador.id },
    momento: Date.parse(INICIO), causa: null,
  });
  assert.deepEqual(evento.utilizarCompra(organizador, 'compra', FIN),
    { realizada: false, mensaje: 'operación ya realizada' });
  assert.equal(evento.pagarCompra(comprador, 'compra', FIN).realizada, false);
  assert.throws(() => evento.cancelarCompra(comprador, 'compra', FIN),
    error('OPERACION_NO_PERMITIDA'));
  assert.deepEqual(evento.consultarCompra(comprador, 'compra', FIN), utilizada);
  assert.equal(evento.disponibilidad('general'), 0n);
});

test('solo las confirmadas muestran días calendario argentinos, incluso al cruzar la medianoche UTC', () => {
  const { evento, comprador } = escenario();
  const nocheAnterior = '2026-11-23T02:00:00Z';
  reservar(evento, comprador, 'compra', 1, nocheAnterior);
  reservar(evento, comprador, 'pendiente', 1, nocheAnterior);
  evento.pagarCompra(comprador, 'compra', nocheAnterior);
  for (const [momento, diasRestantes, descripcion] of [
    [nocheAnterior, 1, '1 día'],
    ['2026-11-23T03:00:00Z', 0, 'hoy'],
    [FIN, 0, 'hoy'],
    ['2026-11-24T03:00:00Z', 0, 'evento pasado'],
  ]) {
    const compras = evento.comprasDelComprador(comprador, momento);
    assert.deepEqual(compras.map(c => [c.estado, c.informacionTemporal]), [
      ['CONFIRMADA', { diasRestantes, descripcion }], ['PENDIENTE', null],
    ]);
  }
});

test('la vista de compra no permite alterar el historial, su actor ni los importes', () => {
  const { evento, comprador } = escenario();
  const compra = reservar(evento, comprador, 'compra', 2);
  assert.equal(Reflect.set(compra, 'cantidad', 0n), false);
  assert.equal(Reflect.deleteProperty(compra.historial, '0'), false);
  assert.equal(Reflect.set(compra.historial[0], 'destino', 'CANCELADA'), false);
  assert.equal(Reflect.set(compra.historial[0].actor, 'id', 'otro'), false);
  assert.equal(Reflect.set(compra.totalPactado, 'centavos', 0n), false);
  assert.equal(evento.disponibilidad('general'), 1n);
  evento.pagarCompra(comprador, 'compra', ANTES);
  assert.equal(compra.historial.length, 1);
  const pagada = evento.consultarCompra(comprador, 'compra', ANTES);
  assert.equal(pagada.historial.length, 2);
  assert.equal(pagada.historial[0].actor.id, comprador.id);
  assert.equal(pagada.totalPactado.centavos, 25100n);
});
