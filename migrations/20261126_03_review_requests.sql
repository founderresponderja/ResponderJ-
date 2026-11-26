-- RJ-16.3: pedidos de avaliação por QR code e WhatsApp.
-- Página pública /avaliar/<código> com as ligações do negócio para deixar avaliação (todas iguais,
-- sem perguntar antes se o cliente ficou satisfeito: filtrar só os satisfeitos é proibido pelo Google).
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS review_page_token text;
CREATE UNIQUE INDEX IF NOT EXISTS establishments_review_page_token_key ON establishments (review_page_token);
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS review_links jsonb;      -- { google, tripadvisor, facebook, thefork }
ALTER TABLE establishments ADD COLUMN IF NOT EXISTS review_message text;     -- mensagem para WhatsApp
