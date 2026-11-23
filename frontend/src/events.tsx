import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { catalogPath, eventPath, type CatalogFilters } from './api';
import { hasRole, nameOf, type CatalogEvent, type Category, type EventDetail, type EventSummary,
  type Operation, type Purchase, type Review, type Ticket, type User } from './contracts';
import { ars, dateLabel, positiveInteger } from './format';
import type { ScreenProps } from './navigation';
import { errorText, useAction, useQuery, useResource } from './state';
import { ActionStatus, Body, Button, Card, Field, Heading, Notice, QueryStatus, Row, Title } from './ui';

export function EventCard({ event, open }: { event: EventSummary | CatalogEvent; open: () => void }) {
  const cheapest = event.tipos.filter(ticket => ticket.precio === event.precioRepresentativo);
  const availability = event.agotado ? 'Agotado'
    : cheapest.every(ticket => ticket.agotado) ? 'Entradas desde ese precio agotadas. Hay otros tipos disponibles.'
    : 'Entradas disponibles';

  return <Card>
    <Body muted>{event.categoria.nombre} · {dateLabel(event.inicio)}</Body>
    <Title>{event.nombre}</Title>
    <Body>Desde {ars(event.precioRepresentativo)} · {availability}</Body>
    {'reputacion' in event && <Body muted>Reputación: {event.reputacion.descripcion}</Body>}
    <Button label={'Ver ' + event.nombre} onPress={open} />
  </Card>;
}

export function Catalog({ api, open, filters, setFilters }: ScreenProps & {
  filters: CatalogFilters; setFilters: (filters: CatalogFilters) => void;
}) {
  const [search, setSearch] = useState(filters.texto);
  const categories = useQuery<Category[]>(api, '/categorias');
  const events = useQuery<CatalogEvent[]>(api, catalogPath(filters));
  const apply = () => setFilters({ ...filters, texto: search.trim() });
  const criteria = [['fecha', 'Fecha'], ['precio', 'Precio'], ['puntaje', 'Reputación']] as const;

  return <>
    <Heading>Próximos eventos</Heading>
    <Field label="Buscar por nombre o descripción" value={search} onChangeText={setSearch}
      returnKeyType="search" onSubmitEditing={apply} />
    <Row>
      <Button label="Buscar" variant="primary" onPress={apply} />
      {(filters.texto || search) ? <Button label="Limpiar búsqueda" onPress={() => {
        setSearch('');
        setFilters({ ...filters, texto: '' });
      }} /> : null}
    </Row>
    <Title>Categoría</Title>
    <QueryStatus query={categories} label="Reintentar categorías" />
    <Row>
      <Button label="Todas" selected={!filters.categoriaId} onPress={() => setFilters({ ...filters, categoriaId: '' })} />
      {categories.data?.map(category => <Button key={category.id} label={category.nombre}
        selected={filters.categoriaId === category.id} onPress={() => setFilters({ ...filters, categoriaId: category.id })} />)}
    </Row>
    <Title>Ordenar por</Title>
    <Row>
      {criteria.map(([value, label]) => <Button key={value} label={label} selected={filters.criterio === value}
        onPress={() => setFilters(filters.criterio === value ? filters
          : { ...filters, criterio: value, sentido: value === 'puntaje' ? 'desc' : 'asc' })} />)}
      <Button label={filters.sentido === 'asc' ? 'Ascendente · Invertir' : 'Descendente · Invertir'}
        onPress={() => setFilters({ ...filters, sentido: filters.sentido === 'asc' ? 'desc' : 'asc' })} />
    </Row>
    <QueryStatus query={events} />
    {events.data?.length === 0 && <Body>No hay eventos que coincidan.</Body>}
    {events.data?.map(event => <EventCard key={event.id} event={event}
      open={() => open({ page: 'event', eventId: event.id })} />)}
  </>;
}

export function Favorites({ api, open }: ScreenProps) {
  const favorites = useResource(useCallback(async (signal: AbortSignal) => {
    const ids = await api.get<string[]>('/favoritos', signal);
    return Promise.all(ids.map(id => api.get<EventDetail>(eventPath(id), signal)));
  }, [api]));
  return <>
    <Heading>Favoritos</Heading>
    <QueryStatus query={favorites} />
    {favorites.data?.length === 0 && <Body>Todavía no guardaste eventos.</Body>}
    {favorites.data?.map(event => <EventCard key={event.id} event={event}
      open={() => open({ page: 'event', eventId: event.id })} />)}
  </>;
}

export function Availability({ tickets }: { tickets: Ticket[] }) {
  return <Card>
    <Title>Entradas y disponibilidad</Title>
    {tickets.map(ticket => <Body key={ticket.id}>
      {ticket.nombre} · {ars(ticket.precio)} · {ticket.agotado ? 'Agotada' : ticket.disponibilidad + ' disponibles'} / {ticket.cupoTotal}
    </Body>)}
  </Card>;
}

function ReviewCard({ review, users, prior }: {
  review: Review; users: User[]; prior?: { name: string; open: () => void };
}) {
  return <Card>
    {prior && <Button label={'Ver evento: ' + prior.name} onPress={prior.open} />}
    <Title>{review.puntaje}/5 · {nameOf(users, review.compradorId)}</Title>
    <Body muted>{dateLabel(review.publicada)}</Body>
    <Body>{review.comentario}</Body>
  </Card>;
}

export function EventScreen({ api, user, users, open, eventId }: ScreenProps & { eventId: string }) {
  const path = eventPath(eventId);
  const event = useQuery<EventDetail>(api, path);
  const buyer = hasRole(user, 'comprador');
  const favorites = useQuery<string[]>(api, buyer ? '/favoritos' : null);
  const purchases = useQuery<Purchase[]>(api, buyer ? '/mis-compras' : null);
  const favoriteAction = useAction();
  const purchaseAction = useAction();
  const reviewAction = useAction();
  const [ticket, setTicket] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [created, setCreated] = useState<Purchase>();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [linkError, setLinkError] = useState('');

  async function refreshPurchases() {
    const [latest] = await Promise.all([purchases.refresh(), event.refresh()]);
    return latest;
  }

  async function openMedia(url: string) {
    setLinkError('');
    try {
      await Linking.openURL(url);
    } catch (error) {
      setLinkError('No se pudo abrir el enlace. ' + errorText(error));
    }
  }

  const data = event.data;
  if (!data) return <><Heading>Evento</Heading><QueryStatus query={event} /></>;
  const saved = favorites.data?.includes(eventId);
  const own = data.organizadorId === user.id;
  const related = purchases.data?.filter(purchase => purchase.eventoId === eventId);
  const myReview = data.resenias.some(review => review.compradorId === user.id);
  const reviewEligible = related?.some(purchase => purchase.estado === 'UTILIZADA') && Date.now() >= Date.parse(data.fin);
  const beforeStart = Date.now() < Date.parse(data.inicio);
  const ticketAvailable = data.tipos.some(type => type.id === ticket && !type.agotado);
  const canShowPurchase = buyer && !own && (beforeStart || purchaseAction.needsCheck || purchaseAction.feedback);

  return <>
    <Heading>{data.nombre}</Heading>
    <QueryStatus query={event} disabled={purchaseAction.busy || reviewAction.busy} />
    <Body muted>{data.categoria.nombre} · {nameOf(users, data.organizadorId)}</Body>
    <Body>{data.descripcion}</Body>
    <Body>Inicio · {dateLabel(data.inicio)} (Argentina)</Body>
    <Body>Fin · {dateLabel(data.fin)} (Argentina)</Body>
    <Body>Reputación del organizador · {data.reputacion.descripcion}</Body>
    <Button label="Actualizar evento" disabled={event.loading || purchaseAction.busy || reviewAction.busy}
      onPress={() => { (buyer ? refreshPurchases() : event.refresh()).catch(() => {}); }} />
    {buyer && <>
      <QueryStatus query={favorites} label="Reintentar favoritos" />
      {favorites.data && <Button label={saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        disabled={favoriteAction.disabled || favorites.loading} onPress={() => {
          void favoriteAction.run(
            () => api.send<Operation>('/favoritos/' + encodeURIComponent(eventId), saved ? 'DELETE' : 'PUT'),
            result => result.realizada ? (saved ? 'Evento quitado de favoritos.' : 'Evento guardado en favoritos.') : result.mensaje,
            favorites.refresh,
          );
        }} />}
      <ActionStatus action={favoriteAction} />
    </>}
    <Availability tickets={data.tipos} />
    {own && hasRole(user, 'organizador') && <Button label="Compras de este evento" variant="primary"
      onPress={() => open({ page: 'eventPurchases', eventId })} />}
    {data.multimedia.length > 0 && <>
      <Title>Multimedia</Title>
      {data.multimedia.map((url, index) => <Button key={url + index} label={'Abrir material ' + (index + 1) + ' · ' + url}
        onPress={() => { void openMedia(url); }} />)}
      {linkError && <Notice error>{linkError}</Notice>}
    </>}
    {canShowPurchase && <Card>
      <Title>Comprar entradas</Title>
      {beforeStart && !data.agotado && <>
        <Body>Elegí un tipo</Body>
        <Row>{data.tipos.map(type => <Button key={type.id} selected={ticket === type.id}
          label={type.nombre + (type.agotado ? ' · Agotada' : '')} disabled={type.agotado || purchaseAction.disabled}
          onPress={() => setTicket(type.id)} />)}</Row>
        <Field label="Cantidad de entradas" value={quantity} onChangeText={setQuantity}
          keyboardType="number-pad" editable={!purchaseAction.disabled} />
        <Button label="Crear compra" variant="primary"
          disabled={!ticketAvailable || purchaseAction.disabled || event.loading || purchases.loading}
          onPress={() => { void purchaseAction.run(
            async () => api.send<Purchase>(path + '/compras', 'POST', { tipoId: ticket, cantidad: positiveInteger(quantity) }),
            purchase => 'Compra ' + purchase.id + ' registrada. Total pactado: ' + ars(purchase.totalPactado) + '.',
            refreshPurchases,
            setCreated,
          ); }} />
      </>}
      {data.agotado && <Body>El evento está agotado.</Body>}
      <ActionStatus action={purchaseAction} />
      {created && <Button label="Ver compra registrada" onPress={() =>
        open({ page: 'purchase', eventId, purchaseId: created.id })} />}
    </Card>}
    {buyer && <>
      <QueryStatus query={purchases} label="Reintentar mis compras para este evento" />
      {Boolean(related?.length) && <Card>
        <Title>Mis compras para este evento</Title>
        {related?.map(purchase => <Button key={purchase.id} label={purchase.id + ' · ' + purchase.estado + ' · ' + purchase.cantidad}
          onPress={() => open({ page: 'purchase', eventId, purchaseId: purchase.id })} />)}
      </Card>}
    </>}
    <Title>Opiniones de este evento</Title>
    {data.resenias.length === 0 && <Body muted>Todavía no hay reseñas de este evento.</Body>}
    {data.resenias.map(review => <ReviewCard key={review.compradorId} review={review} users={users} />)}
    {buyer && <Card>
      <Title>Mi reseña</Title>
      {myReview && <Body>Ya publicaste una reseña para este evento.</Body>}
      {!myReview && !reviewEligible && <Body muted>Podés reseñar cuando termine el evento y tengas una compra utilizada.</Body>}
      {!myReview && reviewEligible && <>
        <Body>Puntaje del 1 al 5</Body>
        <Row>{[1, 2, 3, 4, 5].map(value => <Button key={value} label={value + ' / 5'} selected={score === value}
          disabled={reviewAction.disabled} onPress={() => setScore(value)} />)}</Row>
        <Field label="Comentario" value={comment} onChangeText={setComment} multiline editable={!reviewAction.disabled} />
        <Button label="Publicar reseña" variant="primary" disabled={reviewAction.disabled || event.loading || !comment.trim()}
          onPress={() => { void reviewAction.run(
            () => api.send<Review>(path + '/resenas', 'POST', { puntaje: score, comentario: comment.trim() }),
            () => 'Reseña publicada.', event.refresh, () => setComment(''),
          ); }} />
      </>}
      <ActionStatus action={reviewAction} />
    </Card>}
    <Title>Opiniones de otros eventos del organizador</Title>
    {data.reseniasPrevias.length === 0 && <Body muted>No hay opiniones de otros eventos.</Body>}
    {data.reseniasPrevias.map(({ eventoId, nombreEvento, resenia }) => <ReviewCard
      key={eventoId + ':' + resenia.compradorId} review={resenia} users={users}
      prior={{ name: nombreEvento, open: () => open({ page: 'event', eventId: eventoId }) }} />)}
  </>;
}
