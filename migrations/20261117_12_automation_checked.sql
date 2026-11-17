-- RJ-3.4: respostas automáticas passam a correr no agendamento diário.
-- Marca quais reviews já foram vistas pelas regras. As que já existem ficam marcadas,
-- para a primeira execução não gerar respostas para reviews antigas de uma só vez.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS automation_checked_at timestamptz;
UPDATE reviews SET automation_checked_at = now() WHERE automation_checked_at IS NULL;
CREATE INDEX IF NOT EXISTS reviews_automation_pending_idx ON reviews (created_at) WHERE automation_checked_at IS NULL;
