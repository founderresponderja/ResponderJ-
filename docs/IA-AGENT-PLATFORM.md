# IA: passar do AI Studio (pré-pago) para a Agent Platform (pós-pago)

**Porquê:** a chave do AI Studio está em regime pré-pago. Quando o saldo chega a zero, a Google recusa todos os pedidos e a geração de respostas, a Sofia e a classificação de erros param. A Gemini Enterprise Agent Platform (antiga Vertex AI) é cobrada na conta Google Cloud, em pós-pago: fatura mensal, sem saldo a acabar.

A app aceita os dois modos. Escolhe-se por variáveis na Vercel, sem mexer no código.

> **Atualização de 18/11/2026.** A chave da Agent Platform (Opção 1) fica sempre presa à região us-central1. Os modelos atuais (Gemini 3.x) não existem nessa região, e os Gemini 2.5 foram retirados a 20/10/2026. Por isso, **a forma a usar é a Opção 2 (conta de serviço)**: permite escolher a região, que por omissão é europe-west3 (Frankfurt, na UE). Quando há conta de serviço configurada, a app usa-a mesmo que exista a chave. O modelo por omissão é `gemini-3.5-flash`. Um `GEMINI_MODEL` com um nome Gemini 2.5 é trocado automaticamente pelo modelo atual.

## Opção 1: chave da Agent Platform (mais simples)

1. **Google Cloud console**: escolher (ou criar) o projeto da Amplia. Em **Billing**, confirmar que o projeto está ligado a uma conta de faturação (**Link a billing account**).
2. **APIs & Services → Library**: procurar **Agent Platform API** e carregar em **Enable**.
3. Abrir a página de chaves da Agent Studio: `https://console.cloud.google.com/agent-platform/studio/settings/api-keys` e criar uma chave.
4. Restringir a chave a essa API: em **APIs & Services → Credentials**, abrir a chave e, em **API restrictions**, escolher **Restrict key** e marcar a **Agent Platform API**.
5. **Vercel → Settings → Environment Variables** (ambiente **Production**):
   - `GEMINI_PROVIDER` = `agent-platform`
   - `AGENT_PLATFORM_API_KEY` = a chave (és tu que a colas; não a envies por chat)
6. Fazer **Redeploy** do último deployment de produção.
7. Abrir `/api/health`: o campo `"ai"` deve dizer **"Agent Platform (chave)"**.

## Opção 2: conta de serviço (recomendada pela Google para produção)

Usar se a Opção 1 der problemas.

1. **IAM & Admin → Service Accounts → Create service account** (ex.: `responder-ja-ia`).
2. Dar-lhe o papel **Agent Platform User** (antigo "Vertex AI User").
3. Na conta de serviço, abrir **Keys → Add key → Create new key → JSON**. O ficheiro é descarregado.
4. **Vercel** (Production):
   - `GEMINI_PROVIDER` = `agent-platform`
   - `GOOGLE_CLOUD_PROJECT` = o ID do projeto
   - `GOOGLE_CLOUD_LOCATION` = `europe-west3` (Frankfurt, dados processados na UE; é o valor por omissão)
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = o conteúdo do ficheiro JSON (texto ou base64)
5. **Redeploy**. Em `/api/health`, `"ai"` deve dizer **"Agent Platform (conta de serviço, …)"**.

Se a consola disser que a criação de chaves está bloqueada (política `iam.disableServiceAccountKeyCreation`), isso é uma regra da organização Google Cloud. Ou se usa a Opção 1, ou se cria uma exceção para este projeto.

## Controlo de custos (sem nunca parar a app)

Em **Billing → Budgets & alerts**, criar um orçamento mensal com alertas por email a 50 %, 90 % e 100 %. **O orçamento só avisa, não corta o serviço.** É isso que queremos: a app nunca fica em baixo por falta de saldo.

## Notas

- Se `GEMINI_PROVIDER=agent-platform` estiver definido mas faltarem credenciais, a app **não** volta à chave pré-paga: indica "IA não configurada". Assim não se fica sem perceber qual serviço está a ser usado.
- O modelo vem de `GEMINI_MODEL` (por omissão `gemini-3.5-flash`), com `GEMINI_FALLBACK_MODEL` como reserva. Nos modelos Gemini 3, a app pede o nível de pensamento baixo, para respostas rápidas.
- O código está em `server/services/genai-config.ts` (escolha do modo) e `server/services/genai-client.ts` (cliente único).
