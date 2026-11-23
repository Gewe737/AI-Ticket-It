import { useState } from 'react';
import { eventPath } from './api';
import { nameOf, type Category, type EventDetail, type EventPurchases, type EventSummary } from './contracts';
import { Availability, EventCard } from './events';
import { argentinaInput, positiveInteger, priceInput } from './format';
import type { ScreenProps } from './navigation';
import { PurchaseCard } from './purchases';
import { useAction, useQuery } from './state';
import { ActionStatus, Body, Button, Card, Field, Heading, QueryStatus, Row, Title } from './ui';

export function Organizer({ api, open }: ScreenProps) {
  const events = useQuery<EventSummary[]>(api, '/mis-eventos');
  return <>
    <Heading>Mis eventos</Heading>
    <Button label="Crear evento" variant="primary" onPress={() => open({ page: 'create' })} />
    <Button label="Actualizar mis eventos" disabled={events.loading} onPress={() => { void events.refresh().catch(() => {}); }} />
    <QueryStatus query={events} />
    {events.data?.length === 0 && <Body>Todavía no publicaste eventos.</Body>}
    {events.data?.map(event => <EventCard key={event.id} event={event}
      open={() => open({ page: 'event', eventId: event.id })} />)}
  </>;
}

export function EventPurchasesScreen({ api, user, users, open, eventId }: ScreenProps & { eventId: string }) {
  const event = useQuery<EventDetail>(api, eventPath(eventId));
  const own = event.data?.organizadorId === user.id;
  const sales = useQuery<EventPurchases>(api, own ? eventPath(eventId) + '/compras' : null);
  return <>
    <Heading>Compras del evento</Heading>
    <QueryStatus query={event} />
    {event.data && <Title>{event.data.nombre}</Title>}
    {event.data && !own && <Body>Este panel está disponible para el organizador del evento.</Body>}
    {own && <>
      <Button label="Actualizar compras y cupos" disabled={sales.loading} onPress={() => { void sales.refresh().catch(() => {}); }} />
      <QueryStatus query={sales} />
      {sales.data && <Availability tickets={sales.data.tipos} />}
      {sales.data?.compras.length === 0 && <Body>Todavía no hay compras para este evento.</Body>}
      {sales.data?.compras.map(purchase => <PurchaseCard key={purchase.id} purchase={purchase}
        label={nameOf(users, purchase.compradorId) + ' · ' + (sales.data?.tipos.find(type => type.id === purchase.tipoId)?.nombre ?? purchase.tipoId)}
        open={() => open({ page: 'purchase', eventId, purchaseId: purchase.id })} />)}
    </>}
  </>;
}

type DraftTicket = { id: number; nombre: string; precio: string; cupoTotal: string };
const newTicket = (id: number): DraftTicket => ({ id, nombre: '', precio: '', cupoTotal: '' });

export function CreateEvent({ api, open }: ScreenProps) {
  const categories = useQuery<Category[]>(api, '/categorias');
  const events = useQuery<EventSummary[]>(api, '/mis-eventos');
  const action = useAction();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [media, setMedia] = useState('');
  const [tickets, setTickets] = useState([newTicket(1)]);
  const [published, setPublished] = useState<EventSummary>();
  const [showExisting, setShowExisting] = useState(false);
  const editable = !action.disabled && !published;

  function updateTicket(id: number, field: 'nombre' | 'precio' | 'cupoTotal', value: string) {
    setTickets(items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function submit() {
    void action.run(async () => api.send<EventSummary>('/eventos', 'POST', {
      nombre: name.trim(),
      descripcion: description.trim(),
      categoriaId: category,
      inicio: argentinaInput(start),
      fin: argentinaInput(end),
      multimedia: media.split(/\r?\n/).map(url => url.trim()).filter(Boolean),
      tipos: tickets.map(ticket => ({
        nombre: ticket.nombre.trim(),
        precio: priceInput(ticket.precio),
        cupoTotal: positiveInteger(ticket.cupoTotal, 'El cupo'),
      })),
    }), result => 'Evento publicado: ' + result.nombre + '.', async () => {
      await events.refresh();
      setShowExisting(true);
    }, setPublished);
  }

  return <>
    <Heading>Crear evento</Heading>
    <Field label="Nombre del evento" value={name} onChangeText={setName} editable={editable} />
    <Field label="Descripción" value={description} onChangeText={setDescription} multiline editable={editable} />
    <Title>Categoría</Title>
    <QueryStatus query={categories} label="Reintentar categorías" />
    {categories.data?.length === 0 && <Body>No hay categorías disponibles.</Body>}
    <Row>{categories.data?.map(item => <Button key={item.id} label={item.nombre} selected={category === item.id}
      disabled={!editable} onPress={() => setCategory(item.id)} />)}</Row>
    <Body muted>Usá fecha y hora de Argentina en formato DD/MM/AAAA HH:mm.</Body>
    <Field label="Inicio (DD/MM/AAAA HH:mm)" value={start} onChangeText={setStart} placeholder="05/04/2030 19:00" editable={editable} />
    <Field label="Fin (DD/MM/AAAA HH:mm)" value={end} onChangeText={setEnd} placeholder="05/04/2030 21:30" editable={editable} />
    <Field label="Multimedia opcional (una URL por línea)" value={media} onChangeText={setMedia}
      autoCapitalize="none" autoCorrect={false} multiline editable={editable} />
    <Title>Tipos de entrada</Title>
    {tickets.map((ticket, index) => <Card key={ticket.id}>
      <Field label={'Nombre del tipo ' + (index + 1)} value={ticket.nombre} editable={editable}
        onChangeText={value => updateTicket(ticket.id, 'nombre', value)} />
      <Field label={'Precio en ARS del tipo ' + (index + 1)} value={ticket.precio} placeholder="1250,50"
        keyboardType="decimal-pad" editable={editable} onChangeText={value => updateTicket(ticket.id, 'precio', value)} />
      <Field label={'Cupo total del tipo ' + (index + 1)} value={ticket.cupoTotal} keyboardType="number-pad" editable={editable}
        onChangeText={value => updateTicket(ticket.id, 'cupoTotal', value)} />
      {tickets.length > 1 && <Button label={'Quitar tipo ' + (index + 1)} variant="danger" disabled={!editable}
        onPress={() => setTickets(items => items.filter(item => item.id !== ticket.id))} />}
    </Card>)}
    <Button label="Agregar otro tipo" disabled={!editable}
      onPress={() => setTickets(items => [...items, newTicket(items[items.length - 1].id + 1)])} />
    {!published && <Button label="Publicar evento" variant="primary"
      disabled={action.disabled || events.loading || !name.trim() || !description.trim() || !category || !start.trim() || !end.trim()}
      onPress={submit} />}
    <ActionStatus action={action} />
    {published && <Button label="Ver evento publicado" variant="primary"
      onPress={() => open({ page: 'event', eventId: published.id })} />}
    {showExisting && !published && <Card>
      <Title>Mis eventos publicados</Title>
      {events.data?.length === 0 && <Body>No hay eventos publicados.</Body>}
      {events.data?.map(event => <Button key={event.id} label={event.nombre}
        onPress={() => open({ page: 'event', eventId: event.id })} />)}
    </Card>}
  </>;
}

