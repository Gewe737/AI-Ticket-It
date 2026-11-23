export type User = { id: string; nombre: string; apellido: string; roles: string[] };
export type Category = { id: string; nombre: string; descripcion: string };
export type Ticket = {
  id: string; nombre: string; precio: string; cupoTotal: string; disponibilidad: string; agotado: boolean;
};
export type Review = { eventoId: string; compradorId: string; puntaje: number; comentario: string; publicada: string };
export type EventSummary = {
  id: string; nombre: string; descripcion: string; categoria: Category; organizadorId: string;
  inicio: string; fin: string; multimedia: string[]; tipos: Ticket[]; resenias: Review[];
  precioRepresentativo: string; agotado: boolean;
};
export type CatalogEvent = EventSummary & { reputacion: { descripcion: string; promedio: unknown } };
export type EventDetail = CatalogEvent & {
  reseniasPrevias: { eventoId: string; nombreEvento: string; resenia: Review }[];
};
export type PurchaseStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'REEMBOLSADA' | 'UTILIZADA';
export type Purchase = {
  id: string; eventoId: string; compradorId: string; tipoId: string; cantidad: string;
  precioUnitarioPactado: string; totalPactado: string; estado: PurchaseStatus;
  historial: {
    secuencia: number; destino: PurchaseStatus; momento: string; actor: { tipo: string; id?: string }; causa: number | null;
  }[];
  importePagado: string | null; importeReembolsado: string | null;
  informacionTemporal: { diasRestantes: number; descripcion: string } | null;
};
export type Message = { compraId: string; secuencia: number; autorId: string; texto: string; enviado: string };
export type EventPurchases = { compras: Purchase[]; tipos: Ticket[] };
export type Operation = { realizada: boolean; mensaje: string };

export const hasRole = (user: User, role: 'comprador' | 'organizador') =>
  user.roles.some(value => value.toLowerCase() === role);

export const nameOf = (users: User[], id: string) => {
  const user = users.find(candidate => candidate.id === id);
  return user ? user.nombre + ' ' + user.apellido : id;
};

