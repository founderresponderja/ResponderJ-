-- RJ-3.1: cada evento do Stripe é processado uma só vez.
-- O Stripe pode reenviar o mesmo evento (mesmo id) várias vezes.
CREATE TABLE IF NOT EXISTS stripe_events (
  id text PRIMARY KEY,                 -- evt_...
  type text NOT NULL,
  status text NOT NULL DEFAULT 'processing', -- processing | processed | failed
  attempts integer NOT NULL DEFAULT 1,
  error text,
  received_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);
CREATE INDEX IF NOT EXISTS stripe_events_received_idx ON stripe_events (received_at DESC);
