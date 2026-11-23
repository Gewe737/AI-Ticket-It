export class ApiError extends Error {
  readonly code: string;
  readonly uncertain: boolean;

  constructor(code: string, message: string, uncertain = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.uncertain = uncertain;
  }
}

export function createApi(baseUrl = '', userId?: string, transport = fetch) {
  const base = baseUrl.trim().replace(/\/+$/, '');

  async function request<T>(path: string, method: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    if (!/^https?:\/\/[^/]+\/api$/i.test(base)) {
      throw new ApiError('CONFIGURACION', 'Configurá EXPO_PUBLIC_API_URL con la dirección de la API terminada en /api.');
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (userId) headers['X-Usuario-Demo'] = userId;
    const json = body === undefined ? undefined : JSON.stringify(body);
    if (json !== undefined) headers['Content-Type'] = 'application/json';

    const writing = method !== 'GET';
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort);
    const timeout = setTimeout(abort, 15000);
    try {
      let response: Response;
      try {
        response = await transport(base + path, { method, headers, body: json, signal: controller.signal });
      } catch {
        throw new ApiError('RED', 'No se pudo obtener respuesta de la API. Revisá la red y la dirección del servidor.', writing);
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const code = payload?.error?.codigo;
        const message = payload?.error?.mensaje;
        throw new ApiError(
          typeof code === 'string' ? code : 'HTTP_' + response.status,
          typeof message === 'string' ? message : 'La API respondió con un error (' + response.status + ').',
          writing && (response.status >= 500 || typeof code !== 'string'),
        );
      }
      if (payload === null || typeof payload !== 'object') {
        throw new ApiError('RESPUESTA_INVALIDA', 'La API devolvió una respuesta inesperada.', writing);
      }
      return payload as T;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  return {
    get<T>(path: string, signal?: AbortSignal) {
      return request<T>(path, 'GET', undefined, signal);
    },
    send<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
      return request<T>(path, method, body);
    },
  };
}

export type Api = ReturnType<typeof createApi>;
export const eventPath = (id: string) => '/eventos/' + encodeURIComponent(id);
export const purchasePath = (eventId: string, purchaseId: string) =>
  eventPath(eventId) + '/compras/' + encodeURIComponent(purchaseId);

export type CatalogFilters = {
  texto: string;
  categoriaId: string;
  criterio: 'fecha' | 'precio' | 'puntaje';
  sentido: 'asc' | 'desc';
};

export function catalogPath(filters: CatalogFilters) {
  return '/eventos?' + Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => key + '=' + encodeURIComponent(value))
    .join('&');
}
