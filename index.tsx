import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

if (!clerkPublishableKey) {
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
        afterSignInUrl="/"
        afterSignUpUrl="/"
      >
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}