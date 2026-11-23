const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function ars(value: string) {
  const [whole, cents] = value.split('.');
  return 'ARS ' + groupDigits(whole) + ',' + cents;
}

export function priceInput(value: string) {
  const input = value.trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(input)) return input.replace(',', '.');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(input)) {
    return input.replace(/\./g, '').replace(',', '.');
  }
  throw new Error('Ingresá un precio en pesos con hasta dos decimales, por ejemplo 1250,50.');
}

export function positiveInteger(value: string, label = 'La cantidad') {
  const digits = value.trim().replace(/^0+/, '');
  if (!/^\d+$/.test(digits)) throw new Error(label + ' debe ser un número entero mayor que cero.');
  return digits;
}

const argentina = 'America/Argentina/Buenos_Aires';
const display = new Intl.DateTimeFormat('es-AR', {
  timeZone: argentina, day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function dateLabel(iso: string) {
  return display.format(new Date(iso));
}

export function argentinaInput(value: string) {
  const error = new Error('Ingresá una fecha argentina válida en formato DD/MM/AAAA HH:mm.');
  const parts = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!parts) throw error;
  const [, day, month, year, hour, minute] = parts;
  const calendarDate = year + '-' + month + '-' + day;
  const date = new Date(calendarDate + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== calendarDate ||
      Number(hour) > 23 || Number(minute) > 59) throw error;
  return calendarDate + 'T' + hour + ':' + minute + ':00-03:00';
}
