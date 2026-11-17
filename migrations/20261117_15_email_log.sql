-- RJ-3.3: registo dos emails de ciclo de vida já enviados (um por tipo e por período).
CREATE TABLE IF NOT EXISTS email_log (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref text NOT NULL,
  ok boolean NOT NULL,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);
