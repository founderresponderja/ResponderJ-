-- Backoffice: papéis de operador e super administrador + registo de ações.
--   Operador          = users.is_admin = true, is_super_admin = false
--   Super administrador = is_admin = true e is_super_admin = true (só pode haver 1)

-- O super administrador é sempre também operador.
UPDATE users SET is_admin = true WHERE is_super_admin = true AND is_admin IS DISTINCT FROM true;

-- Só um super administrador. Se houver mais de um, a migração não cria o índice
-- e avisa; nada falha (corrige-se à mão e cria-se numa migração seguinte).
DO $$
BEGIN
  IF (SELECT count(*) FROM users WHERE is_super_admin = true) <= 1 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS users_single_super_admin
      ON users ((is_super_admin)) WHERE is_super_admin = true;
  ELSE
    RAISE NOTICE 'backoffice: mais de um super administrador; índice users_single_super_admin não criado';
  END IF;
END
$$;

-- Registo de tudo o que operadores e super administrador fazem no backoffice.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id serial PRIMARY KEY,
  actor_user_id integer REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id integer REFERENCES users (id) ON DELETE SET NULL,
  details jsonb,
  ip text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);
