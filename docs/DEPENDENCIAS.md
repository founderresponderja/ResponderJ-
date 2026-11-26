# Dependências (RJ-6.4)

## Regras
- Antes de acrescentar uma biblioteca: confirmar que é mantida, que é muito usada e, de preferência, que não traz outras dependências (ex.: `qrcode-generator` em vez de `qrcode`, que trazia 30 pacotes).
- A verificação automática (`.github/workflows/ci.yml`) corre `npm audit --omit=dev --audit-level=high`: uma vulnerabilidade alta ou crítica nas dependências de produção bloqueia o merge.
- Não carregar código de CDNs externos no site. O `index.html` tinha um `importmap` com 43 pacotes servidos por esm.sh (restos do modelo inicial, incluindo pacotes de servidor como `express` e `stripe`); foi removido, porque o Vite já junta tudo no próprio site.

## Limpeza de 26/11/2026
- `npm audit fix`: 26 vulnerabilidades em produção (3 críticas, 12 altas, 11 moderadas) → 0.
- Removidas por não serem usadas: `@sendgrid/mail` (o email é pelo Resend), `archiver`, `connect-pg-simple`, `express-session`, `passport`, `passport-local` (o login é só Clerk desde a RJ-1.2) e `google-auth-library` (o `@google/genai` traz a sua). Menos 107 pacotes instalados.

## O que fica
- `drizzle-kit` (só desenvolvimento, para gerar migrações) tem 4 avisos moderados no servidor de desenvolvimento do `esbuild` antigo que usa. Não vai para produção. A correção exige mudar de versão principal; rever quando o `drizzle-kit` atualizar.
