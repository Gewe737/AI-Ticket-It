import { useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createApi, type CatalogFilters } from './src/api';
import { hasRole, nameOf, type User } from './src/contracts';
import { Catalog, EventScreen, Favorites } from './src/events';
import type { Route } from './src/navigation';
import { CreateEvent, EventPurchasesScreen, Organizer } from './src/organizer';
import { Messages, PurchaseScreen, Purchases } from './src/purchases';
import { useQuery } from './src/state';
import { Body, Button, Card, colors, Heading, QueryStatus, Row, Title } from './src/ui';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;
const publicApi = createApi(baseUrl);
const catalog: Route = { page: 'catalog' };

export default function App() {
  const users = useQuery<User[]>(publicApi, '/usuarios-demo');
  const [user, setUser] = useState<User>();
  const [choosing, setChoosing] = useState(true);

  function choose(selected: User) {
    setUser(selected);
    setChoosing(false);
  }

  return <SafeAreaProvider>
    <SafeAreaView style={layout.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={layout.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {choosing || !user ? <ScrollView contentContainerStyle={layout.content} keyboardShouldPersistTaps="handled">
          <View style={layout.brand}><Text style={layout.brandText}>AI Ticket It</Text></View>
          <Heading>Elegí un usuario demo</Heading>
          <Body muted>El selector sirve para probar roles. Cualquier persona con acceso a la demo puede elegir estos usuarios.</Body>
          <QueryStatus query={users} />
          {users.data?.length === 0 && <Body>No hay usuarios disponibles.</Body>}
          {users.data?.map(candidate => <Card key={candidate.id}>
            <Title>{nameOf(users.data ?? [], candidate.id)}</Title>
            <Body muted>{candidate.roles.join(' · ')}</Body>
            <Button label={'Usar perfil de ' + candidate.nombre} variant="primary" onPress={() => choose(candidate)} />
          </Card>)}
        </ScrollView> : <Session key={user.id} user={user} users={users.data ?? []} choose={() => setChoosing(true)} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </SafeAreaProvider>;
}

function Session({ user, users, choose }: { user: User; users: User[]; choose: () => void }) {
  const api = useMemo(() => createApi(baseUrl, user.id), [user.id]);
  const [routes, setRoutes] = useState<Route[]>([catalog]);
  const [filters, setFilters] = useState<CatalogFilters>({ texto: '', categoriaId: '', criterio: 'fecha', sentido: 'asc' });
  const route = routes[routes.length - 1];

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length < 2) return false;
      setRoutes(routes.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, [routes]);

  const props = { api, user, users, open: (next: Route) => setRoutes(stack => [...stack, next]) };

  function screen() {
    switch (route.page) {
      case 'catalog': return <Catalog {...props} filters={filters} setFilters={setFilters} />;
      case 'favorites': return <Favorites {...props} />;
      case 'purchases': return <Purchases {...props} />;
      case 'organizer': return <Organizer {...props} />;
      case 'create': return <CreateEvent {...props} />;
      case 'event': return <EventScreen {...props} eventId={route.eventId} />;
      case 'eventPurchases': return <EventPurchasesScreen {...props} eventId={route.eventId} />;
      case 'purchase': return <PurchaseScreen {...props} eventId={route.eventId} purchaseId={route.purchaseId} />;
      case 'messages': return <Messages {...props} eventId={route.eventId} purchaseId={route.purchaseId} />;
    }
  }

  return <>
    <View style={layout.header}>
      <View style={layout.identity}>
        <View style={layout.brand}><Text style={layout.brandText}>AI Ticket It</Text></View>
        <Body>{nameOf(users, user.id)}</Body>
        <Body muted>{user.roles.join(' · ')}</Body>
      </View>
      <Button label="Cambiar usuario" onPress={choose} />
    </View>
    <ScrollView
      key={routes.length + JSON.stringify(route)} contentContainerStyle={layout.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    >
      {routes.length > 1 ? <Button label="Volver" onPress={() => setRoutes(stack => stack.slice(0, -1))} /> : <Row>
        <Button label="Eventos" selected={route.page === 'catalog'} onPress={() => setRoutes([catalog])} />
        {hasRole(user, 'comprador') && <>
          <Button label="Mis compras" selected={route.page === 'purchases'} onPress={() => setRoutes([{ page: 'purchases' }])} />
          <Button label="Favoritos" selected={route.page === 'favorites'} onPress={() => setRoutes([{ page: 'favorites' }])} />
        </>}
        {hasRole(user, 'organizador') && <Button label="Organizar" selected={route.page === 'organizer'}
          onPress={() => setRoutes([{ page: 'organizer' }])} />}
      </Row>}
      {screen()}
    </ScrollView>
  </>;
}

const layout = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page },
  content: { padding: 16, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { padding: 14, borderBottomWidth: 1, borderColor: colors.border,
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  identity: { flexShrink: 1, gap: 2 },
  brand: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.brand },
  brandText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});
