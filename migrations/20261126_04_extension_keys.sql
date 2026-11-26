-- RJ-13.3: chaves pessoais da extensão de Chrome (só se guarda a impressão SHA-256, nunca a chave).
CREATE TABLE IF NOT EXISTS extension_keys (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  label text,
  last_four text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS extension_keys_user_idx ON extension_keys (user_id);
