-- RJ-13.1 / RJ-13.2: caixa de reclamações.
-- Cada negócio tem um endereço único (reclamacoes-<código>@suporte.responderja.pt) para onde
-- reencaminha os emails do Livro de Reclamações Eletrónico e do Portal da Queixa.
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS complaints_token text;
CREATE UNIQUE INDEX IF NOT EXISTS establishments_complaints_token_key ON establishments (complaints_token);

CREATE TABLE IF NOT EXISTS complaints (
  id serial PRIMARY KEY,
  establishment_id integer NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,  -- dono do negócio
  source text NOT NULL,              -- livro_reclamacoes | portal_queixa | outro | confirmacao_reencaminhamento
  inbound_email_id text UNIQUE,      -- id do Resend (idempotência: o aviso pode repetir-se)
  from_email text,
  subject text,
  body text,
  reference text,                    -- n.º da reclamação, quando o texto o tem
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at date,                       -- último dia: 15 dias úteis (nulo nas confirmações do Gmail)
  status text NOT NULL DEFAULT 'nova', -- nova | em_resposta | respondida | arquivada
  response_text text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS complaints_establishment_idx ON complaints (establishment_id, received_at DESC);
CREATE INDEX IF NOT EXISTS complaints_open_due_idx ON complaints (due_at) WHERE status IN ('nova', 'em_resposta');
