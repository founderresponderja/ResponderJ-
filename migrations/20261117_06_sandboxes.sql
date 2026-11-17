-- Contas-sandbox para o modo "Ver como cliente" do backoffice.
-- Nunca têm login próprio (sem clerk_user_id) e só são acessíveis por operadores.
-- O domínio sandbox.responderja.invalid não existe (".invalid" é reservado),
-- por isso ninguém consegue verificar um destes emails na Clerk.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;

INSERT INTO users (email, password, first_name, last_name, company_name, role, is_active, is_sandbox, credits, selected_plan, subscription_plan)
VALUES
  ('trial@sandbox.responderja.invalid',         'sandbox_no_login', 'Sandbox', 'Experimental',          'Café Central (sandbox)',        'user', true, true, 10, 'trial',   'trial'),
  ('trial-expirado@sandbox.responderja.invalid','sandbox_no_login', 'Sandbox', 'Experimental expirado', 'Padaria Aurora (sandbox)',      'user', true, true, 0,  'trial',   'trial'),
  ('starter@sandbox.responderja.invalid',       'sandbox_no_login', 'Sandbox', 'Starter',               'Restaurante O Farol (sandbox)', 'user', true, true, 50, 'starter', 'starter'),
  ('pro@sandbox.responderja.invalid',           'sandbox_no_login', 'Sandbox', 'Pro',                   'Hotel Miradouro (sandbox)',     'user', true, true, 150,'pro',     'pro'),
  ('agencia@sandbox.responderja.invalid',       'sandbox_no_login', 'Sandbox', 'Agência',               'Agência Maré Digital (sandbox)','agency_owner', true, true, 500,'agency','agency'),
  ('membro@sandbox.responderja.invalid',        'sandbox_no_login', 'Sandbox', 'Membro de agência',     'Agência Maré Digital (sandbox)','user', true, true, 0,  'agency',  'agency')
ON CONFLICT (email) DO UPDATE SET is_sandbox = true;
