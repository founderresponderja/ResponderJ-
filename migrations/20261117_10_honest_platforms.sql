-- RJ-4.5: só o Google tem ligação real. As ligações a TripAdvisor e Booking eram marcadas como
-- "connected" sem fazer nada, e as do Facebook nunca importaram reviews. Ficam desligadas para não
-- aparecerem como ativas nem contarem para o limite de plataformas do plano.
-- As reviews já existentes dessas plataformas mantêm-se.
UPDATE social_platform_connections
SET status = 'disconnected', updated_at = NOW()
WHERE platform <> 'google' AND status <> 'disconnected';
