import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { SubscriptionProvider } from './hooks/useSubscription';
import './index.css';
import { installViewAsFetch } from './utils/viewAs';
import { installClientErrorReporting } from './utils/clientErrors';
import { installStaleVersionReload } from './utils/staleVersion';

// Modo "Ver como cliente": tem de estar ativo antes de qualquer pedido à API.
installViewAsFetch();
// RJ-8.2: erros JavaScript do navegador vão para o backoffice (Saúde técnica).
installClientErrorReporting();
// Depois de uma atualização, quem tinha a app aberta recarrega uma vez para a versão nova.
installStaleVersionReload();

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// RJ-16.3: página pública de avaliações (QR code / WhatsApp): leve, sem login nem o resto do site.
const reviewPageMatch = window.location.pathname.match(/^\/avaliar\/([a-z0-9]{8,40})\/?$/i);

if (reviewPageMatch) {
  const PublicReviewPage = React.lazy(() => import('./components/PublicReviewPage'));
  root.render(
    <React.StrictMode>
      <React.Suspense fallback={null}>
        <PublicReviewPage token={reviewPageMatch[1].toLowerCase()} />
      </React.Suspense>
    </React.StrictMode>
  );
} else if (!clerkPublishableKey) {
  root.render(
    <React.StrictMode>
      <div style={{ padding: '24px' }}>
        <h1>Configuração em falta</h1>
        <p>Define <code>VITE_CLERK_PUBLISHABLE_KEY</code> nas variáveis da Vercel para ativar autenticação.</p>
      </div>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl="/login"
        signUpUrl="/register"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <SubscriptionProvider>
          <App />
        </SubscriptionProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}