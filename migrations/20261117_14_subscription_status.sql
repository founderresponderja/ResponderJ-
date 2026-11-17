-- RJ-3.2: guardar o estado da subscrição do Stripe e se o cancelamento está agendado para o fim
-- do período (antes perdia-se: a app não sabia que um cliente tinha cancelado ou falhado o pagamento).
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
