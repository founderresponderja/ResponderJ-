# Limites da Vercel e arranque a frio (RJ-8.3)

A versão web corre na Vercel em plano **Hobby** (decisão: ficar no Hobby). Este documento junta os limites que afetam o Responder Já e o que o código faz para os respeitar.

## Arranque a frio ("cold start")

Quando uma função não recebe pedidos durante algum tempo, a Vercel desliga-a. O pedido seguinte tem de a arrancar de novo: carregar o código, ligar à base de dados e montar as rotas. Esse pedido demora mais (tipicamente 1 a 3 s).

O que o código faz:

- **Tempo de arranque registado.** Cada arranque escreve `[cold-start] app pronta em N ms` nos registos da Vercel (Logs → procurar `cold-start`).
- **Base de dados a acordar.** O Neon também adormece quando não há uso. A ligação inicial tenta duas vezes, com 0,8 s de intervalo.
- **Arranque falhado já não bloqueia a instância.** Antes, se o arranque falhasse uma vez, todos os pedidos seguintes dessa instância falhavam até a Vercel a reciclar. Agora o pedido falhado recebe `503` ("Serviço a arrancar…") e o seguinte tenta de novo.
- **Verificação de saúde.** `GET /api/health` responde sem montar a app. Devolve:
  - o estado da base de dados e o tempo que demorou;
  - se a app já arrancou e quanto tempo demorou;
  - a idade da instância.

  Serve para um monitor externo gratuito (ex.: UptimeRobot) avisar se a base de dados falhar.

## Tempo máximo por pedido

| Função | Limite (vercel.json) | Notas |
|---|---|---|
| `api/index.ts` (toda a API) | 60 s (era 30 s até 19/11/2026; subiu por causa da Sofia, que faz várias voltas ao modelo) | Se passar, a Vercel corta e devolve `504` sem mensagem |
| `api/cron/sync-reviews.ts` | 60 s | Sincroniza, cria respostas automáticas e envia emails, com prazo interno de 55 s |

Para nunca chegar ao corte, cada chamada externa tem um limite próprio:

| Chamada | Limite |
|---|---|
| Gemini, modelo principal | 17 s (`GEMINI_TIMEOUT_MS`) |
| Gemini, modelo de reserva | 9 s (`GEMINI_FALLBACK_TIMEOUT_MS`) |
| Sofia (assistente) | 20 s |
| Classificação de erros reportados | 10 s (se passar, fica com gravidade média) |
| Google Business Profile | 15 s por chamada |
| Facebook Graph | 15 s por chamada |
| Resend (email) | 10 s |
| Stripe | já tinha limite próprio em `billing.ts` |

Quando um limite é atingido, a pessoa recebe uma mensagem de erro clara e o caso fica no backoffice → Saúde técnica (RJ-8.2).

## Outros limites a ter presentes

- **Tamanho do pedido: 4,5 MB.** O reporte de erros aceita no máximo 2 imagens de 1 MB (cerca de 2,7 MB em base64). Não aumentar sem rever isto.
- **Cron no Hobby: 1 vez por dia.** Por isso a sincronização corre às 03:00 UTC. Uma frequência maior obriga ao plano Pro.
- **Memória entre pedidos não é fiável.** Cada instância tem a sua memória e pode desaparecer a qualquer momento. Os limites de pedidos por IP (ex.: `/api/client-errors`) são por instância: servem para travar abusos, não são exatos. Tudo o que tem de durar vai para a base de dados.
- **Ligações à base de dados.** Cada instância abre no máximo 10 ligações (`DB_POOL_MAX`). Convém que o `DATABASE_URL` na Vercel seja o endereço **pooled** do Neon (tem `-pooler` no nome do servidor), para aguentar muitas instâncias ao mesmo tempo.
- **Tempo de computação no Hobby.** Há uma quota mensal de execução das funções. Ver em Vercel → Usage. Com o volume atual está muito longe do limite.

## Como verificar

1. Abrir `https://<domínio>/api/health` → deve mostrar `"status":"ok"`.
2. Em Vercel → Logs, procurar `cold-start`. Os valores devem ficar abaixo de 3000 ms.
3. Em Vercel → Settings → Environment Variables, confirmar que `DATABASE_URL` usa o endereço com `-pooler`.
