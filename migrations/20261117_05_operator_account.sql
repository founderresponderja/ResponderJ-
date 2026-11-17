-- Conta de operador permanente: founder.responderja@gmail.com.
-- A linha é criada já como operador; no primeiro login com a Clerk (email verificado),
-- requireAuth liga-a ao clerk_user_id (RJ-1.1). Se a conta já existir, só ganha o papel.
INSERT INTO users (email, password, first_name, last_name, role, is_active, is_admin, is_super_admin, credits, selected_plan, subscription_plan)
VALUES ('founder.responderja@gmail.com', 'clerk_oauth_user', 'Operador', 'Responder Já', 'operator', true, true, false, 0, 'trial', 'trial')
ON CONFLICT (email) DO UPDATE SET is_admin = true, role = 'operator', is_active = true, updated_at = now();

-- O super administrador deixa de ter papel de cliente (agency + 100 000 créditos eram um remendo).
UPDATE users SET role = 'super_admin', subscription_plan = 'trial', selected_plan = 'trial', credits = 0, updated_at = now()
WHERE is_super_admin = true;
