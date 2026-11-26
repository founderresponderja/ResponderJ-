import { Redirect } from 'expo-router';

// Regresso do login com Google (responderja://sso-callback). O Clerk conclui a sessão;
// este ecrã só evita a página "não encontrada" e manda para o início.
export default function SsoCallback() {
  return <Redirect href="/" />;
}
