import type { Message } from './contracts';

export function mergeMessages(purchaseId: string, previous: Message[], incoming: Message[]) {
  const bySequence = new Map<number, Message>();
  for (const message of [...previous, ...incoming]) {
    if (message.compraId === purchaseId) bySequence.set(message.secuencia, message);
  }
  return [...bySequence.values()].sort((a, b) => a.secuencia - b.secuencia);
}
