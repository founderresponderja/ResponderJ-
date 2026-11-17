-- RJ-1.4 passo 2: validar as foreign keys criadas NOT VALID em 20261117_01.
-- Contagem de órfãos em produção (17/11/2026): 0 nas 29 ligações.
-- VALIDATE CONSTRAINT verifica as linhas antigas sem bloquear escritas.
-- Idempotente: só valida as que ainda não estão validadas e ignora as que não existem.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT k.conrelid::regclass AS tbl, k.conname
    FROM pg_constraint k
    WHERE k.contype = 'f'
      AND NOT k.convalidated
      AND k.conname IN (
    'users_agency_id_fk',
    'agencies_owner_id_fk',
    'agency_members_agency_id_fk',
    'agency_members_user_id_fk',
    'agency_invitations_agency_id_fk',
    'agency_admin_delegations_agency_id_fk',
    'agency_admin_delegations_delegated_by_fk',
    'agency_admin_delegations_delegated_to_fk',
    'establishments_user_id_fk',
    'reviews_establishment_id_fk',
    'responses_review_id_fk',
    'responses_user_id_fk',
    'quality_feedback_response_id_fk',
    'quality_feedback_user_id_fk',
    'response_learning_patterns_user_id_fk',
    'response_templates_user_id_fk',
    'automation_rules_user_id_fk',
    'credit_transactions_user_id_fk',
    'credit_transactions_related_response_id_fk',
    'subscriptions_user_id_fk',
    'email_sequences_user_id_fk',
    'referrals_referrer_id_fk',
    'referrals_referred_user_id_fk',
    'referral_rewards_user_id_fk',
    'referral_rewards_referral_id_fk',
    'social_platform_connections_user_id_fk',
    'social_platform_connections_establishment_id_fk',
    'oauth_states_user_id_fk',
    'oauth_states_establishment_id_fk'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.tbl, r.conname);
    RAISE NOTICE 'rj14: validated %', r.conname;
  END LOOP;
END
$$;
