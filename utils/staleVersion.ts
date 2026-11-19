// Depois de cada atualização na Vercel, os ficheiros dos ecrãs mudam de nome e os antigos deixam de
// existir. Quem tinha a app aberta desde antes fica com a versão antiga e, ao abrir um ecrã ainda não
// carregado, o pedido do ficheiro antigo falha ("Failed to fetch dynamically imported module").
// Solução: recarregar a página UMA vez para apanhar a versão nova (sem ciclos de recarregamento).
const KEY = 'rj-stale-reload-at';
const PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /Unable to preload CSS/i,
];

/** É o erro de "versão antiga" (pura; testada em tests/stale-version.test.ts). */
export function isStaleVersionError(message: unknown): boolean {
  const text = String((message as any)?.message ?? message ?? '');
  return PATTERNS.some((p) => p.test(text));
}

/** Só recarrega se não o tiver feito no último minuto (evita ciclos se o problema for outro). */
export function shouldReloadNow(lastReloadAt: number | null, now = Date.now()): boolean {
  return !lastReloadAt || now - lastReloadAt > 60_000;
}

/** Recarrega se for o caso. Devolve true se recarregou (o erro não deve ser registado). */
export function reloadIfStale(error: unknown): boolean {
  if (!isStaleVersionError(error)) return false;
  let last: number | null = null;
  try { last = Number(sessionStorage.getItem(KEY)) || null; } catch { /* sem armazenamento */ }
  if (!shouldReloadNow(last)) return false;
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* sem armazenamento */ }
  window.location.reload();
  return true;
}

export function installStaleVersionReload() {
  // O Vite avisa por este evento quando um ficheiro de um ecrã não carrega.
  window.addEventListener('vite:preloadError', (event: any) => {
    if (reloadIfStale(event?.payload || 'Failed to fetch dynamically imported module')) event.preventDefault?.();
  });
}
