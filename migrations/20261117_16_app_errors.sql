-- RJ-8.2: erros técnicos agrupados (servidor: respostas 500, exceções; navegador: erros JavaScript).
CREATE TABLE IF NOT EXISTS app_errors (
  id serial PRIMARY KEY,
  fingerprint text NOT NULL UNIQUE,
  source text NOT NULL,           -- server | client
  kind text NOT NULL,             -- http_500 | exception | error | unhandledrejection | react
  message text NOT NULL,
  path text,
  sample jsonb,
  count integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  last_user_id integer REFERENCES users (id) ON DELETE SET NULL,
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS app_errors_last_seen_idx ON app_errors (last_seen DESC);
