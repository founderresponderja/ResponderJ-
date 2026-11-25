# Apps Responder Já (iPhone e Android)

App feita com Expo (React Native). Decisões e plano: `docs/APPS.md`.

Esta pasta é independente do site: não entra na compilação nem nos tipos do site (`tsconfig.json`) e não vai para a Vercel (`.vercelignore`). Tem o próprio `package.json` e a própria verificação automática (`.github/workflows/mobile.yml`).

## Estrutura
- `src/app/` — ecrãs (Expo Router). `(auth)/sign-in.tsx` para entrar ou criar conta; `(app)/` com os 3 separadores.
- `src/lib/api.ts` — pedidos ao servidor do site com o token do Clerk.
- `src/theme.ts` — cores, tipo de letra e medidas.
- `assets/` — ícones e o tipo de letra Max.

## Correr em desenvolvimento
1. `cp .env.example .env` e preencher `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (chave pública, não é segredo).
2. `npm install`
3. `npx expo start` e abrir no telemóvel com a app Expo Go.

Verificar antes de cada PR: `npx tsc --noEmit`.
