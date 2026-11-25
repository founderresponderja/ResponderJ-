# Limpeza das contas antes do lançamento

Antes de abrir o Responder Já a clientes reais, apagam-se todas as contas de teste.

**Ficam sempre:**
- o super administrador (`is_super_admin = true`);
- os operadores (`is_admin = true`);
- as 6 contas-sandbox (`is_sandbox = true`), usadas no "Ver como cliente".

**Saem:** todas as outras contas, com os respetivos dados. As ligações entre tabelas (RJ-1.4) apagam em cascata os estabelecimentos, reviews, respostas, ligações a plataformas, movimentos de créditos e agências. No registo de ações do backoffice, o autor ou o cliente passa a vazio, mas a linha fica.

## 1. Ramo de segurança no Neon

No Neon: **Branches → Create branch** a partir de `main`, com o nome `antes-da-limpeza-AAAA-MM-DD`. Se algo correr mal, é por aqui que se recupera.

## 2. Ver o que vai ser apagado (só leitura)

No **SQL Editor** do Neon, com o ramo `main` selecionado:

```sql
SELECT id, email, clerk_user_id IS NOT NULL AS tem_login, subscription_plan,
       stripe_subscription_id IS NOT NULL AS paga_stripe, created_at
FROM users
WHERE coalesce(is_admin, false) = false
  AND coalesce(is_super_admin, false) = false
  AND is_sandbox = false
ORDER BY created_at;
```

Confirma a lista com cuidado. **Se aparecer alguém com `paga_stripe = true`, para:** essa subscrição tem de ser cancelada primeiro no Stripe.

## 3. Apagar

```sql
BEGIN;

DELETE FROM users
WHERE coalesce(is_admin, false) = false
  AND coalesce(is_super_admin, false) = false
  AND is_sandbox = false
RETURNING id, email;

-- Verificar: só devem restar o super administrador, os operadores e as 6 sandboxes.
SELECT email, is_super_admin, is_admin, is_sandbox FROM users ORDER BY is_super_admin DESC, is_admin DESC, email;

COMMIT;   -- ou ROLLBACK; se algo não estiver certo
```

## 4. Apagar as mesmas contas na Clerk

As contas de login vivem na Clerk e não são apagadas pelo SQL. No painel da Clerk, em **Users**, apaga cada email que apareceu no passo 3. Mantém os operadores e o super administrador. As sandboxes não existem na Clerk.

## 5. Confirmar

- Entrar no backoffice com o super administrador: em **Visão geral**, "Clientes" deve mostrar 0.
- Abrir uma sandbox em **Ver como cliente** e confirmar que continua a funcionar.

## Avaliações de teste no código da página inicial

O `index.html` declara ao Google uma nota de 4,9 com 128 avaliações e dois testemunhos de teste ("Carlos M.", "Ana R."), dentro do bloco `application/ld+json` (`aggregateRating` e `review`). Os visitantes não veem estes dados, mas o Google lê-os. Retirar os dois campos neste passo final, antes do lançamento. Avaliações inventadas violam as regras do Google e a lei de defesa do consumidor.
