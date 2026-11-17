-- RJ-1.1: link the Clerk identity to users and give platform connections a numeric owner.
-- Additive and idempotent: safe to run more than once, and safe to run BEFORE the code
-- that uses these columns is deployed (the new columns are all nullable).

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_user_id_unique
  ON users (clerk_user_id);

ALTER TABLE social_platform_connections ADD COLUMN IF NOT EXISTS user_id integer;
CREATE INDEX IF NOT EXISTS social_platform_user_id_idx ON social_platform_connections (user_id);

ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS user_id integer;
