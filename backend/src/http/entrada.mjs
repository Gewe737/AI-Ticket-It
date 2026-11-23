import { ErrorAplicacion } from '../application/error-aplicacion.mjs';

function validar(condicion, mensaje) {
  if (!condicion) throw new ErrorAplicacion('DATOS_INVALIDOS', mensaje);
}

function objeto(valor, campo) {
  validar(valor !== null && typeof valor === 'object' && !Array.isArray(valor),
    campo + ' debe ser un objeto JSON.');
  return valor;
}

function cadena(valor, campo) {
  validar(typeof valor === 'string', campo + ' debe ser texto.');
  return valor;
}

function tipoEntrada(valor) {
  const { nombre, precio, cupoTotal } = objeto(valor, 'Tipo de entrada');
  return {
    nombre: cadena(nombre, 'nombre del tipo'),
    precio: cadena(precio, 'precio'),
    cupoTotal: cadena(cupoTotal, 'cupoTotal'),
  };
}

export function datosEvento(cuerpo) {
  const { nombre, descripcion, categoriaId, inicio, fin, tipos, multimedia = [] } =
    objeto(cuerpo, 'El cuerpo');
  validar(Array.isArray(tipos), 'tipos debe ser una lista.');
  validar(Array.isArray(multimedia), 'multimedia debe ser una lista.');
  return {
    nombre: cadena(nombre, 'nombre'),
    descripcion: cadena(descripcion, 'descripcion'),
    categoriaId: cadena(categoriaId, 'categoriaId'),
    inicio: cadena(inicio, 'inicio'),
    fin: cadena(fin, 'fin'),
    tipos: tipos.map(tipoEntrada),
    multimedia: multimedia.map(url => cadena(url, 'URL multimedia')),
  };
}

export function datosCompra(cuerpo) {
  const { tipoId, cantidad } = objeto(cuerpo, 'El cuerpo');
  return { tipoId: cadena(tipoId, 'tipoId'), cantidad: cadena(cantidad, 'cantidad') };
}

export function textoMensaje(cuerpo) {
  return cadena(objeto(cuerpo, 'El cuerpo').texto, 'texto');
}

export function datosResenia(cuerpo) {
  const { puntaje, comentario } = objeto(cuerpo, 'El cuerpo');
  validar(typeof puntaje === 'number', 'puntaje debe ser un número.');
  return { puntaje, comentario: cadena(comentario, 'comentario') };
}

export function filtrosCatalogo({ texto, categoriaId, criterio, sentido }) {
  const filtros = { texto, categoriaId, criterio, sentido };
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined) cadena(valor, clave);
  }
  return filtros;
}
