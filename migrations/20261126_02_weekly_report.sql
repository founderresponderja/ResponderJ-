-- RJ-13.5: relatório semanal por email (ligado por omissão; desliga-se em Privacidade e dados).
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_report boolean NOT NULL DEFAULT true;
