-- RJ-1.4 passo 3: impedir reviews repetidas da mesma plataforma no mesmo estabelecimento.
-- Contagem de duplicados em produção (17/11/2026): 0.
-- As linhas com external_id NULL (reviews geradas no ecrã de respostas) não entram em conflito:
-- num índice único, NULL nunca é igual a NULL.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_establishment_platform_external_unique
  ON reviews (establishment_id, platform, external_id);
