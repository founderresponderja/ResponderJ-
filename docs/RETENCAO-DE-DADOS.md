# Política de retenção e minimização de dados (RJ-7.3)

Proposta de 24/11/2026, aceite por Luís Pereira para implementar. **Rever com o advogado no GATE-3** e refletir na Política de Privacidade.

## Base legal
- RGPD, art. 5.º, n.º 1, al. e) (limitação da conservação): os dados pessoais só ficam guardados enquanto forem precisos para a finalidade. Não há um prazo único na lei para registos técnicos; cada prazo abaixo tem de ser justificado pela finalidade.
- RGPD, art. 5.º, n.º 1, al. c) (minimização) e art. 32.º (segurança): os registos técnicos e de segurança são necessários, mas com prazos curtos.
- Código do IRC, art. 123.º, n.º 4: livros, registos contabilísticos e documentos de suporte (faturas) guardados 10 anos. No Responder Já as faturas e os pagamentos ficam no Stripe; a app só guarda referências (IDs do Stripe).

## Prazos

| Dados | Prazo | Como | Porquê |
|---|---|---|---|
| Conta, negócios, avaliações, respostas, créditos, ligações às plataformas | Enquanto a conta existir | Apagados de imediato quando a pessoa apaga a conta (RJ-7.1) | Execução do contrato |
| Registos de consentimento | Enquanto a conta existir | Apagados com a conta | Prova do consentimento enquanto há tratamento |
| Faturas e pagamentos | 10 anos | No Stripe (não na app) | CIRC, art. 123.º |
| Erros técnicos (Saúde técnica) | 90 dias depois de resolvidos ou da última repetição | Limpeza diária automática | Diagnóstico de falhas |
| Avisos do Stripe (idempotência) | 90 dias | Limpeza diária automática | Evitar processar um pagamento duas vezes |
| Convites da equipa usados ou expirados | 90 dias | Limpeza diária automática | Histórico curto da equipa |
| Estados temporários do login (Google/Facebook) | 1 dia depois de expirarem | Limpeza diária automática | Só servem durante o login |
| Reportes de erros resolvidos (com anexos) | 12 meses depois de resolvidos | Limpeza diária automática | Suporte e repetição do mesmo problema |
| Registo de emails enviados | 12 meses | Limpeza diária automática | Prova de envio e suporte |
| Registo de ações de administração e do agendamento | 24 meses | Limpeza diária automática | Auditoria e segurança |
| Contas gratuitas sem acesso há 12 meses | 12 meses sem acesso | Aviso por email 30 dias antes; se a pessoa não voltar a entrar, a conta e os dados são apagados como no botão "Apagar a minha conta". Nunca se apaga sem aviso enviado há pelo menos 30 dias | Minimização: contas abandonadas não ficam guardadas para sempre (decidido por Luís a 24/11/2026) |
| Registos da Vercel | 1 hora | Plano Hobby | Fornecedor |
| Cópias de recuperação da base de dados (Neon) | 6 horas | Configuração do projeto | Fornecedor |

## Implementação
- `server/services/retention-logic.ts`: prazos (um só sítio para os mudar).
- `server/services/retention.ts`: limpeza; corre no agendamento diário (`api/cron/sync-reviews.ts`, 03:00 UTC) antes da sincronização. O resultado fica no registo do agendamento (backoffice → Sincronizações).
- `server/services/inactive-accounts.ts`: contas gratuitas inativas (aviso e apagamento), logo a seguir à limpeza. Ficam de fora: contas com subscrição, da equipa (operadores e super administrador), de teste (sandbox), donas de uma agência e membros ativos de uma agência. Máximo de 100 avisos e 10 apagamentos por dia; o resultado fica no registo do agendamento (`inactiveAccounts`).
- `server/services/account-deletion.ts`: o apagamento de uma conta (Stripe, base de dados e Clerk), partilhado pelo botão "Apagar a minha conta" e pelas contas inativas.

## Pendente
- Confirmar prazos com o advogado (GATE-3) e publicar na Política de Privacidade.
- Prazos dos fornecedores (Clerk, Resend, Stripe, Google) a listar na Política de Privacidade.
