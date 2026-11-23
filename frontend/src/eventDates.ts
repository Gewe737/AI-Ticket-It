export function eventPhase(start: number, end: number) {
  const now = Date.now();
  if (now < start) return 'upcoming';
  return now < end ? 'started' : 'ended';
}

export function watchEventDates(start: number, end: number, notify: () => void,
  onResume: (listener: () => void) => () => void) {
  let phase = eventPhase(start, end);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    clearTimeout(timer);
    const current = eventPhase(start, end);
    if (phase !== current) {
      phase = current;
      notify();
    }
    if (current !== 'ended') {
      const boundary = current === 'upcoming' ? start : end;
      // Native timers accept signed 32-bit delays. Re-arm long waits in chunks.
      timer = setTimeout(schedule, Math.max(0, Math.min(boundary - Date.now(), 2 ** 31 - 1)));
    }
  }

  schedule();
  const unsubscribe = onResume(schedule);
  return () => { clearTimeout(timer); unsubscribe(); };
}
