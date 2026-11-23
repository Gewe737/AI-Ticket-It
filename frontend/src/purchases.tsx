import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { eventPath, purchasePath } from './api';
import { hasRole, nameOf, type EventDetail, type Message, type Operation, type Purchase, type User } from './contracts';
import { Availability } from './events';
import { ars, dateLabel } from './format';
import { mergeMessages } from './messages';
import type { ScreenProps } from './navigation';
import { useAction, useQuery, useResource } from './state';
import { ActionStatus, Body, Button, Card, Field, Heading, QueryStatus, Row, Title } from './ui';

import { useEventPhase } from './useEventPhase';

export function PurchaseCard({ purchase, label, open }: { purchase: Purchase; label: string; open: () => void }) {
  return <Card>
    <Title>{label}</Title>
    <Body>{purchase.id} · {purchase.estado}</Body>
    <Body>{purchase.cantidad} entrada(s) · {ars(purchase.totalPactado)}</Body>
    {purchase.informacionTemporal && <Body muted>{purchase.informacionTemporal.descripcion}</Body>}
    {purchase.importeReembolsado !== null && <Body>Reembolso simulado · {ars(purchase.importeReembolsado)}</Body>}
    <Button label={'Ver compra ' + purchase.id} onPress={open} />
  </Card>;
}

export function Purchases({ api, open }: ScreenProps) {
  const purchases = useResource(useCallback(async (signal: AbortSignal) => {
    const list = await api.get<Purchase[]>('/mis-compras', signal);
    const ids = [...new Set(list.map(purchase => purchase.eventoId))];
    const events = await Promise.all(ids.map(id => api.get<EventDetail>(eventPath(id), signal)));
    return { list, events: new Map(events.map(event => [event.id, event.nombre])) };
  }, [api]));

  return <>
    <Heading>Mis compras</Heading>
    <Button label="Actualizar compras" disabled={purchases.loading} onPress={() => { void purchases.refresh().catch(() => {}); }} />
    <QueryStatus query={purchases} />
    {purchases.data?.list.length === 0 && <Body>Todavía no tenés compras.</Body>}
    {purchases.data?.list.map(purchase => <PurchaseCard key={purchase.id} purchase={purchase}
      label={purchases.data?.events.get(purchase.eventoId) ?? purchase.eventoId}
      open={() => open({ page: 'purchase', eventId: purchase.eventoId, purchaseId: purchase.id })} />)}
  </>;
}

type PurchaseScreenProps = ScreenProps & { eventId: string; purchaseId: string };

function History({ purchase, users }: { purchase: Purchase; users: User[] }) {
  return <Card>
    <Title>Historial</Title>
    {purchase.historial.map(change => <Body key={change.secuencia}>
      {change.destino} · {dateLabel(change.momento)} · {change.actor.id ? nameOf(users, change.actor.id) : change.actor.tipo}
      {change.causa !== null ? ' · Por cambio ' + change.causa : ''}
    </Body>)}
  </Card>;
}

export function PurchaseScreen({ api, user, users, open, eventId, purchaseId }: PurchaseScreenProps) {
  const path = purchasePath(eventId, purchaseId);
  const purchase = useQuery<Purchase>(api, path);
  const event = useQuery<EventDetail>(api, eventPath(eventId));
  const action = useAction();

  const refresh = () => Promise.all([purchase.refresh(), event.refresh()]);
  const operate = (operation: 'pagar' | 'cancelar' | 'utilizar', label: string) => {
    void action.run(() => api.send<Operation>(path + '/' + operation, 'POST'),
      result => result.realizada ? label : result.mensaje, refresh);
  };

  const data = purchase.data;
  const eventData = event.data;
  const ticket = eventData?.tipos.find(type => type.id === data?.tipoId);
  const buyer = data?.compradorId === user.id;
  const organizer = eventData?.organizadorId === user.id && hasRole(user, 'organizador');
  const phase = useEventPhase(eventData);
  const started = phase === undefined ? undefined : phase !== 'upcoming';
  const disabled = action.disabled || purchase.loading || event.loading;

  return <>
    <Heading>Compra {purchaseId}</Heading>
    <QueryStatus query={purchase} label="Reintentar compra" disabled={action.busy} />
    <QueryStatus query={event} label="Reintentar evento" disabled={action.busy} />
    <Button label="Actualizar compra y disponibilidad" disabled={purchase.loading || event.loading || action.busy}
      onPress={() => { void refresh().catch(() => {}); }} />
    {data && <>
      <Card>
        <Title>{eventData?.nombre ?? eventId}</Title>
        <Body>Estado · {data.estado}</Body>
        <Body>Comprador · {nameOf(users, data.compradorId)}</Body>
        <Body>Tipo · {ticket?.nombre ?? data.tipoId}</Body>
        <Body>Cantidad · {data.cantidad}</Body>
        <Body>Precio unitario pactado · {ars(data.precioUnitarioPactado)}</Body>
        <Body>Total pactado · {ars(data.totalPactado)}</Body>
        {data.importePagado !== null && <Body>Pago simulado · {ars(data.importePagado)}</Body>}
        {data.importeReembolsado !== null && <Body>Reembolso simulado · {ars(data.importeReembolsado)}</Body>}
        {data.informacionTemporal && <Body muted>{data.informacionTemporal.descripcion}</Body>}
        {eventData && <Button label="Ver evento" onPress={() => open({ page: 'event', eventId })} />}
      </Card>
      <Button label="Conversación de la compra" onPress={() => open({ page: 'messages', eventId, purchaseId })} />
      <Row>
        {buyer && started === false && data.estado === 'PENDIENTE' &&
          <Button label="Simular pago" variant="primary" disabled={disabled}
            onPress={() => operate('pagar', 'El backend registró el pago simulado.')} />}
        {buyer && started === false && ['CONFIRMADA', 'PENDIENTE'].includes(data.estado) &&
          <Button label="Cancelar compra" variant="danger" disabled={disabled} onPress={() => Alert.alert(
            'Cancelar compra',
            data.estado === 'CONFIRMADA'
              ? 'La cancelación libera el cupo y genera el reembolso simulado del total.'
              : 'La cancelación libera el cupo reservado.',
            [{ text: 'Volver', style: 'cancel' }, { text: 'Confirmar cancelación', style: 'destructive',
              onPress: () => operate('cancelar', 'El backend registró la cancelación.') }],
          )} />}
        {organizer && started === true && data.estado === 'CONFIRMADA' &&
          <Button label="Marcar compra completa como utilizada" variant="primary" disabled={disabled}
            onPress={() => operate('utilizar', 'La compra se registró como utilizada.')} />}
      </Row>
      {organizer && started === false && data.estado === 'CONFIRMADA' && <Body muted>El uso se habilita al iniciar el evento.</Body>}
      <ActionStatus action={action} />
      <History purchase={data} users={users} />
      {eventData && <Availability tickets={eventData.tipos} />}
    </>}
  </>;
}

export function Messages({ api, user, users, eventId, purchaseId }: PurchaseScreenProps) {
  const path = purchasePath(eventId, purchaseId) + '/mensajes';
  const messages = useQuery<Message[]>(api, path);
  const action = useAction();
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState<Message[]>([]);
  const list = messages.data && mergeMessages(purchaseId, confirmed, messages.data);

  function send() {
    void action.run(() => api.send<Message>(path, 'POST', { texto: text.trim() }),
      () => 'Mensaje enviado.', messages.refresh, message => {
        setText('');
        setConfirmed(previous => mergeMessages(purchaseId, previous, [message]));
      });
  }

  return <>
    <Heading>Conversación de la compra</Heading>
    <Body muted>{purchaseId}</Body>
    <Button label="Actualizar mensajes" disabled={messages.loading || action.busy}
      onPress={() => { void messages.refresh().catch(() => {}); }} />
    <QueryStatus query={messages} disabled={action.busy} />
    {list?.length === 0 && <Body>Todavía no hay mensajes.</Body>}
    {list?.map(message => <Card key={message.secuencia}>
      <Title>{message.autorId === user.id ? nameOf(users, user.id) + ' (vos)' : nameOf(users, message.autorId)}</Title>
      <Body muted>{dateLabel(message.enviado)}</Body>
      <Body>{message.texto}</Body>
    </Card>)}
    {messages.data && <Card>
      <Field label="Mensaje" value={text} onChangeText={setText} multiline editable={!action.disabled} />
      <Button label="Enviar mensaje" variant="primary" disabled={messages.loading || action.disabled || !text.trim()} onPress={send} />
      <ActionStatus action={action} />
    </Card>}
  </>;
}
