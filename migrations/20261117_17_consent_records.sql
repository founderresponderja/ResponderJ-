-- RJ-7.2: registo de consentimentos (prova do artigo 7.º, n.º 1, do RGPD).
-- Uma linha por decisão: documento, versão em vigor, aceite ou retirado, quando e de onde
-- (o IP fica só como impressão). Os registos de quem apaga a conta apagam-se com ela.
CREATE TABLE IF NOT EXISTS consent_records (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users (id) ON DELETE CASCADE,
  anon_id text,                   -- visitante sem sessão (cookies)
  kind text NOT NULL,             -- terms | privacy | cookies
  version text NOT NULL,
  granted boolean NOT NULL,
  choices jsonb,                  -- escolhas de cookies
  source text NOT NULL,           -- app | cookies_page
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consent_records_user_idx ON consent_records (user_id, kind, created_at DESC);
