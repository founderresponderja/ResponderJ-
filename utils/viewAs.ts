/**
 * Modo "Ver como cliente" do backoffice.
 * Guarda a sandbox escolhida no sessionStorage (só neste separador do browser)
 * e acrescenta o cabeçalho X-View-As a todos os pedidos /api/ da aplicação de cliente.
 * O servidor só aceita o cabeçalho de operadores e só para contas-sandbox.
 */
const KEY = 'rj_view_as';

export interface ViewAs {
  userId: number;
  label: string;
  key: string;
}

export function getViewAs(): ViewAs | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ViewAs) : null;
  } catch {
    return null;
  }
}

export function startViewAs(v: ViewAs) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // sem sessionStorage não há modo de teste
  }
  window.location.href = '/app';
}

export function stopViewAs() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignorar
  }
  window.location.href = '/admin';
}

export function installViewAsFetch() {
  const v = getViewAs();
  if (!v || typeof window.fetch !== 'function') return;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let url: URL;
    try {
      url = new URL(rawUrl, window.location.origin);
    } catch {
      return original(input, init);
    }
    const isApi = url.origin === window.location.origin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/backoffice');
    if (!isApi) return original(input, init);
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('X-View-As', String(v.userId));
    return original(input instanceof Request ? new Request(input, { headers }) : input, { ...init, headers });
  };
}
