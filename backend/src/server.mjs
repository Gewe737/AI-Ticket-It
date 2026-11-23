import { crearAplicacion } from './app.mjs';

const puerto = Number(process.env.PORT ?? '3000');
const host = process.env.HOST ?? '127.0.0.1';

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

crearAplicacion().listen(puerto, host, error => {
  if (error) throw error;
  console.log('AI Ticket It en http://' + host + ':' + puerto + '/api');
});
