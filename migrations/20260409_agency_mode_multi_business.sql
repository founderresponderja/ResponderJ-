-- Agency mode: multi-business support and per-business platform connections

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE social_platform_connections
  ADD COLUMN IF NOT EXISTS establishment_id integer;

DROP INDEX IF EXISTS social_platform_user_unique;

CREATE UNIQUE INDEX IF NOT EXISTS social_platform_user_unique
  ON social_platform_connections (user_external_id, platform, establishment_id);
