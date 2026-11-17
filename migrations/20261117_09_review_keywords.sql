-- RJ-4.3: o sentimento e os temas das reviews deixam de ser deitados fora.
-- 1) Coluna para os temas que o cliente refere (preenchida quando se gera uma resposta).
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS keywords jsonb;

-- 2) Sentimento de base a partir das estrelas para as reviews que ainda não o têm
--    (4-5 positivo, 3 neutro, 1-2 negativo). Quando se gera uma resposta, a IA lê o texto
--    e substitui este valor pelo sentimento real.
UPDATE reviews
SET sentiment = CASE WHEN rating >= 4 THEN 'positive' WHEN rating = 3 THEN 'neutral' ELSE 'negative' END
WHERE sentiment IS NULL AND rating BETWEEN 1 AND 5;
