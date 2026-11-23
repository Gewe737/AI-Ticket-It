import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { eventPhase, watchEventDates } from './eventDates';
import type { EventSummary } from './contracts';

function onResume(listener: () => void) {
  const subscription = AppState.addEventListener('change', status => {
    if (status === 'active') listener();
  });
  return () => subscription.remove();
}

export function useEventPhase(event?: Pick<EventSummary, 'inicio' | 'fin'>) {
  const start = event ? Date.parse(event.inicio) : undefined;
  const end = event ? Date.parse(event.fin) : undefined;
  const subscribe = useCallback((notify: () => void) => {
    if (start === undefined || end === undefined) return () => {};
    return watchEventDates(start, end, notify, onResume);
  }, [start, end]);
  return useSyncExternalStore(subscribe, () =>
    start === undefined || end === undefined ? undefined : eventPhase(start, end));
}
