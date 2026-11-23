import { ErrorDominio } from '../domain/index.mjs';
import { ErrorAplicacion } from '../application/error-aplicacion.mjs';

const estados = new Map([
  ['DATOS_INVALIDOS', 400],
  ['IDENTIDAD_DEMO_INVALIDA', 401],
  ['NO_AUTORIZADO', 403],
  ['EVENTO_INEXISTENTE', 404],
  ['SIN_CUPO', 409],
  ['FUERA_DE_FECHA', 409],
  ['OPERACION_NO_PERMITIDA', 409],
  ['RESENIA_DUPLICADA', 409],
]);

export function rutaDesconocida(req, res) {
  res.status(404).json({ error: { codigo: 'RUTA_INEXISTENTE', mensaje: 'Ruta inexistente.' } });
}

export function responderError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ErrorDominio || error instanceof ErrorAplicacion) {
    const estado = estados.get(error.codigo);
    if (estado) return res.status(estado).json({ error: { codigo: error.codigo, mensaje: error.message } });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: { codigo: 'CUERPO_DEMASIADO_GRANDE', mensaje: 'El cuerpo supera 100 KiB.' } });
  }
  if (error.status === 415) {
    return res.status(415).json({ error: { codigo: 'FORMATO_NO_ADMITIDO', mensaje: 'Formato de cuerpo no admitido.' } });
  }
  if (error.status === 400) {
    return res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje: 'JSON o URL inválidos.' } });
  }
  return res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno.' } });
}
