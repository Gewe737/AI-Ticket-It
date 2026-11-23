import type { Purchase } from './contracts';

type ReservationState =
  | { status: 'idle' | 'sending' | 'checking' | 'checked' }
  | { status: 'uncertain' | 'rejected'; message: string }
  | { status: 'confirmed'; purchase: Purchase; message: string };

class Reservation {
  private state: ReservationState = { status: 'idle' };
  private listeners = new Set<() => void>();

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(state: ReservationState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  async run(send: () => Promise<Purchase>, describe: (purchase: Purchase) => string) {
    if (['sending', 'uncertain', 'checking'].includes(this.state.status)) return;
    this.update({ status: 'sending' });
    try {
      const purchase = await send();
      this.update({ status: 'confirmed', purchase, message: describe(purchase) });
    } catch (error) {
      this.update({
        status: error instanceof Error && 'uncertain' in error && error.uncertain === true ? 'uncertain' : 'rejected',
        message: error instanceof Error ? error.message : 'No se pudo obtener el resultado.',
      });
    }
  }

  async check(refresh: () => Promise<boolean>) {
    if (this.state.status !== 'uncertain') return;
    const previous = this.state;
    this.update({ status: 'checking' });
    try {
      this.update(await refresh() ? { status: 'checked' } : previous);
    } catch (error) {
      this.update({ status: 'uncertain', message: error instanceof Error ? error.message : previous.message });
    }
  }
}

export class ReservationSession {
  private entries = new Map<string, Reservation>();

  forEvent(userId: string, eventId: string) {
    const key = JSON.stringify([userId, eventId]);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = new Reservation();
      this.entries.set(key, entry);
    }
    return entry;
  }
}
