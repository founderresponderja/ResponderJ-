// RJ-8.2: envia os erros JavaScript do navegador para /api/client-errors
// (backoffice → Saúde técnica). No máximo 10 por página e cada mensagem uma só vez.
import { reloadIfStale } from './staleVersion';

const seen = new Set<string>();
let sent = 0;

function report(kind: string, message: string, stack?: string) {
  const key = `${kind}|${message}`;
  if (sent >= 10 || seen.has(key)) return;
  seen.add(key);
  sent++;
  const body = JSON.stringify({
    kind,
    message: String(message).slice(0, 500),
    stack: String(stack || '').slice(0, 4000),
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/client-errors', blob)) {
      fetch('/api/client-errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // nunca partir a página por causa do registo
  }
}

export function installClientErrorReporting() {
  window.addEventListener('error', (e) => {
    // Versão antiga aberta depois de uma atualização: recarrega em vez de registar.
    if (reloadIfStale(e.message)) return;
    report('error', e.message || 'erro', (e.error && e.error.stack) || '');
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r: any = e.reason;
    if (reloadIfStale(r)) return;
    report('unhandledrejection', (r && (r.message || String(r))) || 'promessa rejeitada', r && r.stack);
  });
}

export const reportReactError = (message: string, stack?: string) => report('react', message, stack);
