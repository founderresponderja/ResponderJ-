-- RJ-1.4 (step 1 of 2): foreign keys, created NOT VALID.
--
-- NOT VALID means: Postgres enforces the constraint for every row inserted or updated
-- from now on, but does not check existing rows yet. So this migration cannot fail
-- because of old orphan rows. Step 2 cleans up the orphans and runs VALIDATE CONSTRAINT.
--
-- ON DELETE policy:
--   CASCADE  - data that belongs to its parent (a user's establishments, an
--              establishment's reviews, ...). Needed for GDPR erasure (RJ-7.1).
--   SET NULL - optional links (who referred a user, which response a credit
--              transaction relates to, a user's agency).
--
-- Not covered here: invoices / invoice_items / invoice_settings (the simulated AT
-- module, removed in RJ-5.1) and the text Clerk/Stripe ids (not database references).
--
-- Each FK is added only if both tables and the column exist and the constraint is not
-- there yet, so the file is safe on any database state and safe to re-run.

CREATE OR REPLACE FUNCTION pg_temp.rj14_add_fk(
  child text, col text, parent text, on_delete text, fk_name text
) RETURNS void AS $$
BEGIN
  IF to_regclass('public.' || child) IS NULL OR to_regclass('public.' || parent) IS NULL THEN
    RAISE NOTICE 'rj14: skip % (table % or % missing)', fk_name, child, parent;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = child AND column_name = col
  ) THEN
    RAISE NOTICE 'rj14: skip % (column %.% missing)', fk_name, child, col;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk_name) THEN
    RETURN;
  END IF;
  EXECUTE format(
    'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (id) ON DELETE %s NOT VALID',
    child, fk_name, col, parent, on_delete
  );
END;
$$ LANGUAGE plpgsql;

-- Users and agencies
SELECT pg_temp.rj14_add_fk('users',                     'agency_id',    'agencies',     'SET NULL', 'users_agency_id_fk');
SELECT pg_temp.rj14_add_fk('agencies',                  'owner_id',     'users',        'CASCADE',  'agencies_owner_id_fk');
SELECT pg_temp.rj14_add_fk('agency_members',            'agency_id',    'agencies',     'CASCADE',  'agency_members_agency_id_fk');
SELECT pg_temp.rj14_add_fk('agency_members',            'user_id',      'users',        'CASCADE',  'agency_members_user_id_fk');
SELECT pg_temp.rj14_add_fk('agency_invitations',        'agency_id',    'agencies',     'CASCADE',  'agency_invitations_agency_id_fk');
SELECT pg_temp.rj14_add_fk('agency_admin_delegations',  'agency_id',    'agencies',     'CASCADE',  'agency_admin_delegations_agency_id_fk');
SELECT pg_temp.rj14_add_fk('agency_admin_delegations',  'delegated_by', 'users',        'CASCADE',  'agency_admin_delegations_delegated_by_fk');
SELECT pg_temp.rj14_add_fk('agency_admin_delegations',  'delegated_to', 'users',        'CASCADE',  'agency_admin_delegations_delegated_to_fk');

-- Establishments, reviews, responses
SELECT pg_temp.rj14_add_fk('establishments',            'user_id',      'users',        'CASCADE',  'establishments_user_id_fk');
SELECT pg_temp.rj14_add_fk('reviews',                   'establishment_id', 'establishments', 'CASCADE', 'reviews_establishment_id_fk');
SELECT pg_temp.rj14_add_fk('responses',                 'review_id',    'reviews',      'CASCADE',  'responses_review_id_fk');
SELECT pg_temp.rj14_add_fk('responses',                 'user_id',      'users',        'CASCADE',  'responses_user_id_fk');
SELECT pg_temp.rj14_add_fk('quality_feedback',          'response_id',  'responses',    'CASCADE',  'quality_feedback_response_id_fk');
SELECT pg_temp.rj14_add_fk('quality_feedback',          'user_id',      'users',        'CASCADE',  'quality_feedback_user_id_fk');

-- Per-user data
SELECT pg_temp.rj14_add_fk('response_learning_patterns', 'user_id',     'users',        'CASCADE',  'response_learning_patterns_user_id_fk');
SELECT pg_temp.rj14_add_fk('response_templates',        'user_id',      'users',        'CASCADE',  'response_templates_user_id_fk');
SELECT pg_temp.rj14_add_fk('automation_rules',          'user_id',      'users',        'CASCADE',  'automation_rules_user_id_fk');
SELECT pg_temp.rj14_add_fk('credit_transactions',       'user_id',      'users',        'CASCADE',  'credit_transactions_user_id_fk');
SELECT pg_temp.rj14_add_fk('credit_transactions',       'related_response_id', 'responses', 'SET NULL', 'credit_transactions_related_response_id_fk');
SELECT pg_temp.rj14_add_fk('subscriptions',             'user_id',      'users',        'CASCADE',  'subscriptions_user_id_fk');
SELECT pg_temp.rj14_add_fk('email_sequences',           'user_id',      'users',        'CASCADE',  'email_sequences_user_id_fk');
SELECT pg_temp.rj14_add_fk('referrals',                 'referrer_id',  'users',        'CASCADE',  'referrals_referrer_id_fk');
SELECT pg_temp.rj14_add_fk('referrals',                 'referred_user_id', 'users',    'SET NULL', 'referrals_referred_user_id_fk');
SELECT pg_temp.rj14_add_fk('referral_rewards',          'user_id',      'users',        'CASCADE',  'referral_rewards_user_id_fk');
SELECT pg_temp.rj14_add_fk('referral_rewards',          'referral_id',  'referrals',    'CASCADE',  'referral_rewards_referral_id_fk');

-- Platform connections (RJ-1.1)
SELECT pg_temp.rj14_add_fk('social_platform_connections', 'user_id',          'users',          'CASCADE', 'social_platform_connections_user_id_fk');
SELECT pg_temp.rj14_add_fk('social_platform_connections', 'establishment_id', 'establishments', 'CASCADE', 'social_platform_connections_establishment_id_fk');
SELECT pg_temp.rj14_add_fk('oauth_states',                'user_id',          'users',          'CASCADE', 'oauth_states_user_id_fk');
SELECT pg_temp.rj14_add_fk('oauth_states',                'establishment_id', 'establishments', 'CASCADE', 'oauth_states_establishment_id_fk');

-- Indexes on FK columns that are filtered or joined on and had none.
-- (Postgres does not create them automatically; without them a CASCADE delete scans the table.)
CREATE OR REPLACE FUNCTION pg_temp.rj14_add_index(tbl text, col text, idx_name text) RETURNS void AS $$
BEGIN
  IF to_regclass('public.' || tbl) IS NULL OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
  ) THEN
    RAISE NOTICE 'rj14: skip index % (%.% missing)', idx_name, tbl, col;
    RETURN;
  END IF;
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (%I)', idx_name, tbl, col);
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.rj14_add_index('agency_members',              'agency_id',           'agency_members_agency_id_idx');
SELECT pg_temp.rj14_add_index('agency_members',              'user_id',             'agency_members_user_id_idx');
SELECT pg_temp.rj14_add_index('quality_feedback',            'response_id',         'quality_feedback_response_id_idx');
SELECT pg_temp.rj14_add_index('credit_transactions',         'related_response_id', 'credit_tx_related_response_id_idx');
SELECT pg_temp.rj14_add_index('social_platform_connections', 'establishment_id',    'social_platform_establishment_id_idx');
