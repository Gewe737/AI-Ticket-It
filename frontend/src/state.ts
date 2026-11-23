import { useCallback, useEffect, useRef, useState } from 'react';
import { Api, ApiError } from './api';

export const errorText = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [state, setState] = useState<{
    load: typeof load; data?: T; error?: string; loading: boolean;
  }>();
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return undefined;
    active.current?.abort();
    const current = new AbortController();
    active.current = current;
    setState(previous => ({ load, data: previous?.load === load ? previous.data : undefined, loading: true }));
    try {
      const data = await load(current.signal);
      if (!current.signal.aborted) {
        setState({ load, data, loading: false });
        return data;
      }
    } catch (error) {
      if (!current.signal.aborted) {
        setState(previous => ({ ...previous, load, error: errorText(error), loading: false }));
        throw error;
      }
    }
    return undefined;
  }, [enabled, load]);

  useEffect(() => {
    void refresh().catch(() => {});
    return () => active.current?.abort();
  }, [refresh]);

  const current = enabled && state?.load === load ? state : undefined;
  return {
    data: current?.data, error: current?.error, loading: enabled && (current?.loading ?? true), refresh,
  };
}

export function useQuery<T>(api: Api, path: string | null) {
  return useResource(useCallback((signal: AbortSignal) => api.get<T>(path ?? '', signal), [api, path]), path !== null);
}

type Feedback = { tone: 'success' | 'error'; text: string };
type Reconcile = () => Promise<unknown>;

export function useAction() {
  const alive = useRef(false);
  const lock = useRef(false);
  const pendingCheck = useRef<Reconcile | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  async function run<T>(
    send: () => Promise<T>, success: (result: T) => string, reconcile?: Reconcile, after?: (result: T) => void,
  ) {
    if (lock.current || pendingCheck.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback(undefined);
    try {
      const result = await send();
      if (!alive.current) return;
      setFeedback({ tone: 'success', text: success(result) });
      after?.(result);
      await reconcile?.().catch(() => {});
    } catch (error) {
      if (!alive.current) return;
      const uncertain = error instanceof ApiError && error.uncertain;
      if (uncertain && reconcile) {
        pendingCheck.current = reconcile;
        setNeedsCheck(true);
      }
      const detail = error instanceof ApiError && error.code === 'RESENIA_DUPLICADA'
        ? 'Ya publicaste una reseña para este evento.' : errorText(error);
      setFeedback({ tone: 'error', text: uncertain
        ? detail + ' La operación pudo haberse registrado. Consultá el estado y revisá el resultado antes de volver a enviarla.'
        : detail });
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function check() {
    if (lock.current || !pendingCheck.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await pendingCheck.current();
      if (!alive.current) return;
      pendingCheck.current = null;
      setNeedsCheck(false);
      setFeedback({ tone: 'error', text: 'Consulta actualizada. Revisá si la operación quedó registrada antes de repetirla.' });
    } catch (error) {
      if (alive.current) setFeedback({ tone: 'error', text: errorText(error) + ' Volvé a consultar antes de enviar.' });
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return { busy, needsCheck, disabled: busy || needsCheck, feedback, run, check };
}

export type QueryState = Pick<ReturnType<typeof useResource>, 'loading' | 'error' | 'refresh'>;
export type ActionState = ReturnType<typeof useAction>;
