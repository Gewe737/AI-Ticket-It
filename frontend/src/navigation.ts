import type { Api } from './api';
import type { User } from './contracts';

export type Route =
  | { page: 'catalog' | 'favorites' | 'purchases' | 'organizer' | 'create' }
  | { page: 'event' | 'eventPurchases'; eventId: string }
  | { page: 'purchase' | 'messages'; eventId: string; purchaseId: string };

export type ScreenProps = {
  api: Api;
  user: User;
  users: User[];
  open: (route: Route) => void;
};
