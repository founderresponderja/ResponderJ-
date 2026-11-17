-- RJ-5.1: o módulo de faturação/AT (simulado) saiu do código.
-- As tabelas ficam (sem perder dados; decisão final na RJ-7.3), mas as passwords da AT
-- guardadas em invoice_settings são apagadas: credenciais não devem ficar guardadas sem uso.
DO $$
DECLARE nullable text;
BEGIN
  SELECT is_nullable INTO nullable FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'invoice_settings' AND column_name = 'at_password';
  IF nullable = 'YES' THEN
    UPDATE invoice_settings SET at_password = NULL WHERE at_password IS NOT NULL;
  ELSIF nullable = 'NO' THEN
    UPDATE invoice_settings SET at_password = '' WHERE at_password <> '';
  END IF;
END $$;
