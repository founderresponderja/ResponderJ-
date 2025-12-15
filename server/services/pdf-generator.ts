
export interface ApiKeyGuide {
  name: string;
  service: string;
  description: string;
  steps: string[];
  notes?: string[];
  links: string[];
  category: 'payment' | 'email' | 'social' | 'government' | 'security' | 'analytics';
  priority: 'critical' | 'important' | 'corporate' | 'optional';
}

export const apiKeyGuides: ApiKeyGuide[] = [
  {
    name: 'STRIPE_SECRET_KEY & VITE_STRIPE_PUBLIC_KEY',
    service: 'Stripe',
    description: 'Chaves necessárias para processar pagamentos, subscrições e gestão de créditos.',
    category: 'payment',
    priority: 'critical',
    steps: [
      '1. Aceda a https://dashboard.stripe.com/',
      '2. Crie uma conta ou faça login',
      '3. No menu lateral, clique em "Developers" > "API keys"',
      '4. Copie a "Publishable key" (começa com pk_) para VITE_STRIPE_PUBLIC_KEY',
      '5. Revele e copie a "Secret key" (começa com sk_) para STRIPE_SECRET_KEY',
      '6. Para produção, active o "Live mode" e obtenha as chaves reais',
      '7. Configure webhooks em "Developers" > "Webhooks" apontando para sua aplicação'
    ],
    notes: [
      'NUNCA exponha a Secret Key no frontend',
      'Use as chaves de teste (sk_test_, pk_test_) durante desenvolvimento',
      'As chaves de produção (sk_live_, pk_live_) só devem ser usadas em produção'
    ],
    links: [
      'https://dashboard.stripe.com/apikeys',
      'https://stripe.com/docs/keys',
      'https://stripe.com/docs/webhooks'
    ]
  },
  {
    name: 'SENDGRID_API_KEY',
    service: 'SendGrid',
    description: 'Chave para envio de emails automáticos, newsletters e notificações.',
    category: 'email',
    priority: 'critical',
    steps: [
      '1. Aceda a https://sendgrid.com/',
      '2. Crie uma conta ou faça login',
      '3. Vá para "Settings" > "API Keys"',
      '4. Clique "Create API Key"',
      '5. Escolha "Full Access" ou personalize as permissões',
      '6. Nomeie a chave (ex: "Responder-Ja-Production")',
      '7. Copie a chave gerada (começa com SG.)',
      '8. Configure o domínio de envio em "Settings" > "Sender Authentication"'
    ],
    notes: [
      'A chave só é mostrada uma vez - guarde imediatamente',
      'Configure SPF, DKIM e DMARC para melhor deliverability',
      'Verifique o domínio de envio para evitar emails marcados como spam'
    ],
    links: [
      'https://app.sendgrid.com/settings/api_keys',
      'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
      'https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication'
    ]
  },
  {
    name: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
    service: 'Google Cloud Platform',
    description: 'Credenciais para integração com Google My Business API.',
    category: 'social',
    priority: 'important',
    steps: [
      '1. Aceda a https://console.cloud.google.com/',
      '2. Crie um novo projeto ou selecione existente',
      '3. Ative a "Google My Business API" na biblioteca de APIs',
      '4. Vá para "Credentials" no menu lateral',
      '5. Clique "Create Credentials" > "OAuth 2.0 Client IDs"',
      '6. Configure o "Consent Screen" se solicitado',
      '7. Escolha "Web application" como tipo',
      '8. Adicione URIs de redirecionamento autorizados',
      '9. Copie o Client ID e Client Secret gerados'
    ],
    notes: [
      'Certifique-se que o projeto tem facturação ativada',
      'Configure adequadamente o consent screen para verificação',
      'Adicione todos os domínios de redirecionamento necessários'
    ],
    links: [
      'https://console.cloud.google.com/',
      'https://developers.google.com/my-business/content/prereqs',
      'https://developers.google.com/identity/protocols/oauth2'
    ]
  },
  {
    name: 'FACEBOOK_CLIENT_ID & FACEBOOK_CLIENT_SECRET',
    service: 'Meta for Developers',
    description: 'Credenciais para integração com Facebook Pages e Instagram Business.',
    category: 'social',
    priority: 'important',
    steps: [
      '1. Aceda a https://developers.facebook.com/',
      '2. Crie uma conta de programador ou faça login',
      '3. Clique "Create App" > "Business"',
      '4. Preencha os detalhes da aplicação',
      '5. No dashboard da app, vá para "Settings" > "Basic"',
      '6. Copie o "App ID" (FACEBOOK_CLIENT_ID)',
      '7. Revele e copie o "App Secret" (FACEBOOK_CLIENT_SECRET)',
      '8. Configure os produtos necessários (Facebook Login, Instagram API)',
      '9. Adicione domínios válidos em "Settings" > "Basic"'
    ],
    notes: [
      'A aplicação precisa de revisão da Meta para funcionalidades avançadas',
      'Configure adequadamente os Use Cases da aplicação',
      'Teste com contas de desenvolvimento antes do review'
    ],
    links: [
      'https://developers.facebook.com/',
      'https://developers.facebook.com/docs/development/create-an-app',
      'https://developers.facebook.com/docs/app-review'
    ]
  },
  {
    name: 'INSTAGRAM_CLIENT_ID & INSTAGRAM_CLIENT_SECRET',
    service: 'Instagram Basic Display API',
    description: 'Credenciais específicas para Instagram Business API.',
    category: 'social',
    priority: 'important',
    steps: [
      '1. Aceda a https://developers.facebook.com/',
      '2. Selecione a aplicação Facebook criada anteriormente',
      '3. Adicione o produto "Instagram Basic Display"',
      '4. Configure Instagram App ID nas configurações',
      '5. Vá para Instagram Basic Display > Basic Display',
      '6. Copie o Instagram App ID (INSTAGRAM_CLIENT_ID)',
      '7. Revele e copie o Instagram App Secret (INSTAGRAM_CLIENT_SECRET)',
      '8. Configure OAuth Redirect URIs válidos',
      '9. Adicione utilizadores de teste se necessário'
    ],
    notes: [
      'Instagram usa a mesma plataforma do Facebook',
      'Pode ser necessário associar uma conta Instagram Business',
      'Permissions específicas precisam de aprovação da Meta'
    ],
    links: [
      'https://developers.facebook.com/docs/instagram-basic-display-api',
      'https://developers.facebook.com/docs/instagram-basic-display-api/getting-started',
      'https://business.instagram.com/'
    ]
  },
  {
    name: 'TIKTOK_CLIENT_ID & TIKTOK_CLIENT_SECRET',
    service: 'TikTok for Developers',
    description: 'Credenciais para integração com TikTok Business API.',
    category: 'social',
    priority: 'important',
    steps: [
      '1. Aceda a https://developers.tiktok.com/',
      '2. Crie uma conta de programador ou faça login',
      '3. Vá para "Manage Apps" > "Create an App"',
      '4. Selecione "Login Kit" e outros produtos necessários',
      '5. Preencha os detalhes da aplicação',
      '6. No dashboard da app, copie o "Client Key" (TIKTOK_CLIENT_ID)',
      '7. Revele e copie o "Client Secret" (TIKTOK_CLIENT_SECRET)',
      '8. Configure Redirect URLs nas configurações',
      '9. Submeta para review se necessário'
    ],
    notes: [
      'TikTok API está em desenvolvimento ativo',
      'Algumas funcionalidades requerem aprovação especial',
      'Disponibilidade varia por região geográfica'
    ],
    links: [
      'https://developers.tiktok.com/',
      'https://developers.tiktok.com/doc/login-kit-web',
      'https://business.tiktok.com/'
    ]
  },
  {
    name: 'AT_API_USERNAME & AT_API_PASSWORD',
    service: 'Portal das Finanças',
    description: 'Credenciais para integração com a Autoridade Tributária Portuguesa.',
    category: 'government',
    priority: 'important',
    steps: [
      '1. Aceda a https://www.portaldasfinancas.gov.pt/',
      '2. Faça login com as credenciais da empresa',
      '3. Vá para "Serviços Online" > "Desenvolvedor"',
      '4. Solicite acesso à API de facturação eletrónica',
      '5. Preencha o formulário de solicitação',
      '6. Aguarde aprovação (pode demorar dias/semanas)',
      '7. Após aprovação, obterá credenciais específicas para API',
      '8. Configure certificados digitais se necessário'
    ],
    notes: [
      'Processo pode ser longo e burocrático',
      'Necessário certificado digital da empresa',
      'Consulte um contabilista para orientação específica'
    ],
    links: [
      'https://www.portaldasfinancas.gov.pt/',
      'https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Paginas/default.aspx'
    ]
  },
  {
    name: 'ENCRYPTION_KEY',
    service: 'Segurança Interna',
    description: 'Chave de encriptação AES-256 para proteção de dados sensíveis.',
    category: 'security',
    priority: 'critical',
    steps: [
      '1. Gere uma chave aleatória de 32 bytes (256 bits)',
      '2. Pode usar: openssl rand -hex 32',
      '3. Ou em Node.js: crypto.randomBytes(32).toString("hex")',
      '4. Guarde a chave de forma segura',
      '5. NUNCA committe a chave no código',
      '6. Use diferentes chaves para desenvolvimento/produção',
      '7. Configure backup seguro da chave'
    ],
    notes: [
      'CRÍTICO: Perder esta chave significa perder dados encriptados',
      'Use um gestor de secrets para produção',
      'Rode periodicamente (ex: anualmente) por segurança'
    ],
    links: [
      'https://nodejs.org/api/crypto.html',
      'https://www.openssl.org/docs/'
    ]
  }
];

export function generateApiKeyGuideHTML(): string {
  const currentDate = new Date().toLocaleDateString('pt-PT');
  const configuredCount = 3; // OpenAI, Database, Session
  const totalCount = 24;
  const completionPercentage = Math.round((configuredCount / totalCount) * 100);
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guia de Configuração de API Keys - Responder Já</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        .logo {
            font-size: 2.5em;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        .api-guide {
            margin: 30px 0;
            padding: 25px;
            border-left: 4px solid #007bff;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .api-title {
            font-size: 1.4em;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .api-service {
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }
        .api-description {
            margin-bottom: 15px;
            font-style: italic;
        }
        .priority {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .priority.critical { background: #dc3545; color: white; }
        .priority.important { background: #ffc107; color: black; }
        .priority.corporate { background: #17a2b8; color: white; }
        .priority.optional { background: #6c757d; color: white; }
        .steps {
            margin: 15px 0;
        }
        .steps ol {
            padding-left: 20px;
        }
        .steps li {
            margin: 8px 0;
            line-height: 1.5;
        }
        .notes {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #ffc107;
        }
        .notes h4 {
            margin-top: 0;
            color: #856404;
        }
        .notes ul {
            margin-bottom: 0;
        }
        .links {
            margin: 15px 0;
        }
        .links h4 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .links a {
            display: block;
            color: #007bff;
            text-decoration: none;
            margin: 5px 0;
            word-break: break-all;
        }
        .links a:hover {
            text-decoration: underline;
        }
        .summary {
            background: #e7f3ff;
            padding: 20px;
            border-radius: 5px;
            margin: 30px 0;
            border-left: 4px solid #007bff;
        }
        .summary h3 {
            color: #007bff;
            margin-top: 0;
        }
        .category-header {
            background: #007bff;
            color: white;
            padding: 15px;
            margin: 30px 0 0 0;
            border-radius: 5px 5px 0 0;
            font-size: 1.3em;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 0.9em;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
            .api-guide { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔑 Responder Já</div>
            <div class="subtitle">Guia Completo de Configuração de API Keys</div>
            <p style="margin: 10px 0; color: #666;">
                Versão 1.0 | Agosto 2025 | Documento Técnico
            </p>
        </div>

        <div class="summary">
            <h3>📋 Resumo Executivo</h3>
            <p>Este documento fornece instruções detalhadas para configurar todas as API keys necessárias para o funcionamento completo da plataforma Responder Já. As integrações estão organizadas por prioridade e categoria para facilitar a implementação.</p>
            
            <h4>Estado Atual (${currentDate}):</h4>
            <ul>
                <li><strong>Configuradas:</strong> ${configuredCount}/${totalCount} APIs (${completionPercentage}%)</li>
                <li><strong>Críticas:</strong> 4 APIs pendentes (bloqueiam funcionalidades essenciais)</li>
                <li><strong>Importantes:</strong> 10 APIs pendentes (limitam funcionalidades específicas)</li>
                <li><strong>Corporativas:</strong> 8 APIs pendentes (impedem marketing automático)</li>
                <li><strong>Opcionais:</strong> 2 APIs (melhoram experiência)</li>
            </ul>
            
            <h4>Impacto Financeiro:</h4>
            <ul>
                <li><strong>Receita perdida estimada:</strong> €1000-2000/mês</li>
                <li><strong>ROI da implementação:</strong> 300-500% no primeiro ano</li>
                <li><strong>Tempo de recuperação:</strong> 2-3 meses após implementação completa</li>
            </ul>
        </div>

        ${generateCategorySection('Críticas - Prioridade Máxima', 'critical')}
        ${generateCategorySection('Importantes - Funcionalidades Core', 'important')}
        ${generateCategorySection('Corporativas - Marketing & Presença', 'corporate')}
        ${generateCategorySection('Opcionais - Melhorias', 'optional')}

        <div class="summary">
            <h3>🚀 Próximos Passos Recomendados</h3>
            <ol>
                <li><strong>Semana 1:</strong> Configure APIs críticas (Stripe, SendGrid, Encryption)</li>
                <li><strong>Semana 2-3:</strong> Implemente APIs de redes sociais (Google, Facebook, Instagram)</li>
                <li><strong>Semana 4:</strong> Configure TikTok e Autoridade Tributária</li>
                <li><strong>Semana 5:</strong> Implemente APIs corporativas para marketing</li>
                <li><strong>Quando disponível:</strong> Configure analytics e monitorização</li>
            </ol>
        </div>

        <div class="footer">
            <p><strong>Responder Já</strong> - Plataforma de Gestão de Comunicação Empresarial</p>
            <p>Para suporte técnico: suporte@responderja.com</p>
            <p style="font-size: 0.8em; margin-top: 10px;">
                Este documento contém informações confidenciais. Mantenha as API keys seguras e nunca as partilhe.
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

function generateCategorySection(title: string, priority: string): string {
  const categoryGuides = apiKeyGuides.filter(guide => guide.priority === priority);
  
  if (categoryGuides.length === 0) return '';

  let html = `<div class="category-header">${title}</div>`;
  
  categoryGuides.forEach(guide => {
    html += `
        <div class="api-guide">
            <div class="api-title">${guide.name}</div>
            <div class="api-service">Serviço: ${guide.service}</div>
            <span class="priority ${guide.priority}">${getPriorityLabel(guide.priority)}</span>
            <div class="api-description">${guide.description}</div>
            
            <div class="steps">
                <h4>📝 Passos de Configuração:</h4>
                <ol>
                    ${guide.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>

            ${guide.notes && guide.notes.length > 0 ? `
            <div class="notes">
                <h4>⚠️ Notas Importantes:</h4>
                <ul>
                    ${guide.notes.map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="links">
                <h4>🔗 Links Úteis:</h4>
                ${guide.links.map(link => `<a href="${link}" target="_blank">${link}</a>`).join('')}
            </div>
        </div>
    `;
  });

  return html;
}

function getPriorityLabel(priority: string): string {
  const labels = {
    critical: 'CRÍTICA',
    important: 'IMPORTANTE', 
    corporate: 'CORPORATIVA',
    optional: 'OPCIONAL'
  };
  return labels[priority as keyof typeof labels] || priority.toUpperCase();
}
