// Entidad interna: Evento nunca entrega esta instancia a sus consumidores.
import { exigir, texto, instante, resultado } from './validaciones.mjs';
import { exigirActor } from './usuario.mjs';
import { informacionTemporal } from './tiempo.mjs';

export const EstadoCompra = Object.freeze({ PENDIENTE: 'PENDIENTE', CONFIRMADA: 'CONFIRMADA',
  CANCELADA: 'CANCELADA', REEMBOLSADA: 'REEMBOLSADA', UTILIZADA: 'UTILIZADA' });

export class Compra {
  #historial;
  #mensajes = [];
  #contexto;

  constructor({ id, compradorId, tipo, cantidad, ahora, contexto }) {
    this.id = texto(id, 'ID de compra');
    this.compradorId = compradorId;
    this.tipoId = tipo.id;
    this.cantidad = cantidad;
    this.precioUnitarioPactado = tipo.precio;
    this.totalPactado = tipo.precio.multiplicar(cantidad);
    this.#contexto = contexto;
    this.#historial = [this.#cambio(null, 'PENDIENTE', 'CREAR', compradorId, ahora, 1)];
    Object.freeze(this);
  }

  get estado() { return this.#historial.at(-1).destino; }
  get ocupaCupo() { return ['PENDIENTE', 'CONFIRMADA', 'UTILIZADA'].includes(this.estado); }

  #cambio(origen, destino, accion, actorId, momento, secuencia, causa = null) {
    return Object.freeze({ compraId: this.id, secuencia, origen, destino, accion, momento, causa,
      actor: Object.freeze(actorId === null ? { tipo: 'Sistema' } : { tipo: 'Usuario', id: actorId }) });
  }

  #ocurrio(accion) { return this.#historial.some(c => c.accion === accion); }

  autorizarParticipante(actor) {
    exigirActor(actor);
    exigir([this.compradorId, this.#contexto.organizadorId].includes(actor.id),
      'NO_AUTORIZADO', 'La compra y su conversación son privadas.');
  }

  #autorizarOperacion(actor, accion) {
    exigirActor(actor);
    const esperado = accion === 'UTILIZAR' ? this.#contexto.organizadorId : this.compradorId;
    exigir(actor.id === esperado, 'NO_AUTORIZADO', 'El actor no puede realizar esta operación.');
  }

  #momento(valor) {
    const ahora = instante(valor);
    exigir(ahora >= this.#historial.at(-1).momento
      && (!this.#mensajes.length || ahora >= this.#mensajes.at(-1).enviado),
    'DATOS_INVALIDOS', 'El momento no puede retroceder.');
    return ahora;
  }

  operar(accion, actor, momento) {
    exigir(['PAGAR', 'CANCELAR', 'UTILIZAR'].includes(accion), 'OPERACION_NO_PERMITIDA', 'Acción desconocida.');
    this.#autorizarOperacion(actor, accion);
    if (this.#ocurrio(accion)) return resultado(false);
    const ahora = this.#momento(momento);
    const origen = this.estado;
    const permitidos = accion === 'CANCELAR' ? ['PENDIENTE', 'CONFIRMADA']
      : accion === 'PAGAR' ? ['PENDIENTE'] : ['CONFIRMADA'];
    exigir(permitidos.includes(origen), 'OPERACION_NO_PERMITIDA', 'La compra no admite esta transición.');
    exigir(accion === 'UTILIZAR' ? ahora >= this.#contexto.inicio : ahora < this.#contexto.inicio,
      'FUERA_DE_FECHA', 'La operación no está habilitada en este momento.');
    const destino = { PAGAR: 'CONFIRMADA', CANCELAR: 'CANCELADA', UTILIZAR: 'UTILIZADA' }[accion];
    const secuencia = this.#historial.length + 1;
    const cambios = [this.#cambio(origen, destino, accion, actor.id, ahora, secuencia)];
    if (accion === 'CANCELAR' && origen === 'CONFIRMADA') {
      cambios.push(this.#cambio('CANCELADA', 'REEMBOLSADA', 'REEMBOLSAR_AUTOMATICO',
        null, ahora, secuencia + 1, secuencia));
    }
    // Construir todo antes de reemplazar: no queda una cancelación pagada a medias.
    this.#historial = [...this.#historial, ...cambios];
    return resultado(true);
  }

  enviarMensaje(actor, contenido, momento) {
    this.autorizarParticipante(actor);
    const mensaje = Object.freeze({ compraId: this.id, secuencia: this.#mensajes.length + 1,
      autorId: actor.id, texto: texto(contenido, 'Mensaje'), enviado: this.#momento(momento) });
    this.#mensajes = [...this.#mensajes, mensaje];
    return mensaje;
  }

  conversacion(actor) {
    this.autorizarParticipante(actor);
    return Object.freeze([...this.#mensajes]);
  }

  consultar(actor, ahora) {
    this.autorizarParticipante(actor);
    return Object.freeze({ id: this.id, eventoId: this.#contexto.eventoId,
      compradorId: this.compradorId, tipoId: this.tipoId, cantidad: this.cantidad,
      precioUnitarioPactado: this.precioUnitarioPactado, totalPactado: this.totalPactado,
      estado: this.estado, historial: Object.freeze([...this.#historial]),
      pagoRealizado: this.#ocurrio('PAGAR'), reembolsoRealizado: this.#ocurrio('REEMBOLSAR_AUTOMATICO'),
      importePagado: this.#ocurrio('PAGAR') ? this.totalPactado : null,
      importeReembolsado: this.#ocurrio('REEMBOLSAR_AUTOMATICO') ? this.totalPactado : null,
      informacionTemporal: this.estado === 'CONFIRMADA' ? informacionTemporal(this.#contexto.inicio, ahora) : null });
  }
}
