-- RJ-5.6: reporte de erros (incidentes), anexos (até 2 imagens) e histórico.
CREATE TABLE IF NOT EXISTS incidents (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users (id) ON DELETE CASCADE,
  reporter_email text NOT NULL,
  source text NOT NULL DEFAULT 'app',             -- app | email
  subject text,
  description text NOT NULL,
  page_url text,
  category text NOT NULL DEFAULT 'other',
  severity text NOT NULL DEFAULT 'medium',
  ai_summary text,
  ai_reason text,
  ai_classified boolean NOT NULL DEFAULT false,
  sla_business_days integer NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',            -- open | in_progress | resolved
  assigned_to integer REFERENCES users (id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,
  resolved_by integer REFERENCES users (id) ON DELETE SET NULL,
  inbound_email_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status, due_at);
CREATE INDEX IF NOT EXISTS incidents_user_idx ON incidents (user_id);
CREATE INDEX IF NOT EXISTS incidents_reporter_email_idx ON incidents (lower(reporter_email));

-- Imagens guardadas na base de dados (base64), no máximo 2 por incidente e 1 MB cada.
-- Assim apagam-se com o incidente (e com a conta, RJ-7.1) sem serviço de ficheiros à parte.
CREATE TABLE IF NOT EXISTS incident_attachments (
  id serial PRIMARY KEY,
  incident_id integer NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  filename text,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_attachments_incident_idx ON incident_attachments (incident_id);

CREATE TABLE IF NOT EXISTS incident_events (
  id serial PRIMARY KEY,
  incident_id integer NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  actor_user_id integer REFERENCES users (id) ON DELETE SET NULL,
  type text NOT NULL,   -- created | classified | reclassified | assigned | status | note | resolved | email
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS incident_events_incident_idx ON incident_events (incident_id, created_at);
