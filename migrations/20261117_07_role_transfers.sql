-- Transferência da função de super administrador com confirmação dupla por email.
--   awaiting_from: código enviado ao super administrador atual
--   awaiting_to:   código enviado ao operador que vai receber a função
--   done / cancelled / expired
CREATE TABLE IF NOT EXISTS admin_role_transfers (
  id serial PRIMARY KEY,
  from_user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'awaiting_from',
  code_hash text,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp
);
-- Só uma transferência em curso de cada vez.
CREATE UNIQUE INDEX IF NOT EXISTS admin_role_transfers_one_open
  ON admin_role_transfers ((true)) WHERE status IN ('awaiting_from', 'awaiting_to');
