-- AI Engine: approval workflow + learning patterns
-- Safe to run multiple times (uses IF NOT EXISTS guards).

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS original_response_text text;

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS learning_meta jsonb;

CREATE TABLE IF NOT EXISTS response_learning_patterns (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  language text NOT NULL,
  tone text NOT NULL,
  sentiment text NOT NULL,
  opening_style text,
  closing_style text,
  preferred_phrases jsonb,
  avoided_phrases jsonb,
  edit_count integer DEFAULT 1,
  last_edited_at timestamp DEFAULT now() NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS learning_lookup_idx
  ON response_learning_patterns (user_id, language, tone, sentiment);
