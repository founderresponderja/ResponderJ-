/**
 * Gera um documento HTML que pode ser convertido/visualizado como PDF
 * Contém o guia completo de configuração das API Keys
 */
export function generateApiKeyGuideHTML(): string {
  const date = new Date().toLocaleDateString('pt-PT');
  
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Guia de Configuração de API Keys - Responder Já</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        h3 { color: #374151; margin-top: 20px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .critical { background-color: #dc2626; }
        .important { background-color: #d97706; }
        .corporate { background-color: #2563eb; }
        .key-block { background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #9ca3af; margin-bottom: 20px; }
        .key-name { font-family: monospace; font-weight: bold; font-size: 1.1em; color: #1f2937; }
        .steps { margin-left: 20px; }
        .footer { margin-top: 50px; font-size: 0.9em; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Guia de Configuração de API Keys</h1>
      <p>Este documento descreve todas as chaves de API necessárias para o funcionamento completo da plataforma <strong>Responder Já</strong>.</p>
      <p><strong>Data de geração:</strong> ${date}</p>

      <h2>🔴 Nível 1: Chaves Críticas (Obrigatórias)</h2>
      <p>Sem estas chaves, a aplicação não funcionará corretamente.</p>

      <div class="key-block" style="border-left-color: #dc2626;">
        <p><span class="key-name">OPENAI_API_KEY</span> <span class="badge critical">CRÍTICO</span></p>
        <p><strong>Serviço:</strong> OpenAI (GPT-4)</p>
        <p><strong>Função:</strong> Geração de respostas automáticas, análise de sentimento e sugestões inteligentes.</p>
        <p><strong>Como obter:</strong></p>
        <ol class="steps">
          <li>Aceda a <a href="https://platform.openai.com/api-keys">platform.openai.com</a></li>
          <li>Crie uma conta ou faça login</li>
          <li>Clique em "Create new secret key"</li>
          <li>Copie a chave gerada (começa por 'sk-')</li>
        </ol>
      </div>

      <div class="key-block" style="border-left-color: #dc2626;">
        <p><span class="key-name">STRIPE_SECRET_KEY</span> <span class="badge critical">CRÍTICO</span></p>
        <p><strong>Serviço:</strong> Stripe Payments</p>
        <p><strong>Função:</strong> Processamento de pagamentos, subscrições e faturação.</p>
        <p><strong>Como obter:</strong></p>
        <ol class="steps">
          <li>Aceda a <a href="https://dashboard.stripe.com/apikeys">dashboard.stripe.com</a></li>
          <li>Vá a Developers > API Keys</li>
          <li>Copie a "Secret key" (começa por 'sk_live_' ou 'sk_test_')</li>
        </ol>
      </div>

      <div class="key-block" style="border-left-color: #dc2626;">
        <p><span class="key-name">SENDGRID_API_KEY</span> <span class="badge critical">CRÍTICO</span></p>
        <p><strong>Serviço:</strong> Twilio SendGrid</p>
        <p><strong>Função:</strong> Envio de emails transacionais, notificações e recuperação de password.</p>
        <p><strong>Como obter:</strong></p>
        <ol class="steps">
          <li>Aceda a <a href="https://app.sendgrid.com/settings/api_keys">app.sendgrid.com</a></li>
          <li>Vá a Settings > API Keys</li>
          <li>Clique em "Create API Key" com permissões "Full Access" ou "Mail Send"</li>
          <li>Copie a chave gerada (começa por 'SG.')</li>
        </ol>
      </div>

      <div class="key-block" style="border-left-color: #dc2626;">
        <p><span class="key-name">ENCRYPTION_KEY</span> <span class="badge critical">CRÍTICO</span></p>
        <p><strong>Serviço:</strong> Segurança Interna</p>
        <p><strong>Função:</strong> Encriptação de dados sensíveis na base de dados (tokens, passwords).</p>
        <p><strong>Como obter:</strong></p>
        <ul class="steps">
          <li>Gere uma string aleatória de 32 caracteres (hexadecimal ou base64)</li>
          <li>Pode usar o comando: <code>openssl rand -hex 32</code></li>
        </ul>
      </div>

      <h2>🟠 Nível 2: Chaves Importantes (Funcionalidades Core)</h2>
      <p>Necessárias para integrações específicas e login social.</p>

      <div class="key-block" style="border-left-color: #d97706;">
        <p><span class="key-name">GOOGLE_CLIENT_ID / SECRET</span> <span class="badge important">IMPORTANTE</span></p>
        <p><strong>Serviço:</strong> Google Cloud Platform</p>
        <p><strong>Função:</strong> Login com Google e integração com Google My Business/Maps.</p>
        <p><strong>Como obter:</strong></p>
        <ol class="steps">
          <li>Aceda a <a href="https://console.cloud.google.com/apis/credentials">console.cloud.google.com</a></li>
          <li>Crie um projeto e configure o "OAuth consent screen"</li>
          <li>Crie credenciais "OAuth client ID"</li>
          <li>Adicione os URIs de redirecionamento autorizados</li>
        </ol>
      </div>

      <div class="key-block" style="border-left-color: #d97706;">
        <p><span class="key-name">FACEBOOK_CLIENT_ID / SECRET</span> <span class="badge important">IMPORTANTE</span></p>
        <p><strong>Serviço:</strong> Meta for Developers</p>
        <p><strong>Função:</strong> Login com Facebook e gestão de páginas/Instagram.</p>
        <p><strong>Como obter:</strong></p>
        <ol class="steps">
          <li>Aceda a <a href="https://developers.facebook.com/apps/">developers.facebook.com</a></li>
          <li>Crie uma app do tipo "Business"</li>
          <li>Configure o "Facebook Login"</li>
          <li>Copie o App ID e App Secret das configurações básicas</li>
        </ol>
      </div>

      <h2>🔵 Nível 3: Chaves Corporativas (Expansão)</h2>
      <p>Para funcionalidades avançadas e integrações enterprise.</p>

      <div class="key-block" style="border-left-color: #2563eb;">
        <p><span class="key-name">TIKTOK_CLIENT_ID</span> <span class="badge corporate">CORPORATE</span></p>
        <p><strong>Serviço:</strong> TikTok for Business</p>
        <p><strong>Função:</strong> Gestão de comentários e vídeos no TikTok.</p>
      </div>

      <div class="key-block" style="border-left-color: #2563eb;">
        <p><span class="key-name">AT_API_USERNAME / PASSWORD</span> <span class="badge corporate">CORPORATE</span></p>
        <p><strong>Serviço:</strong> Autoridade Tributária</p>
        <p><strong>Função:</strong> Comunicação automática de faturas (SAFT).</p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Amplia Solutions - Responder Já. Documento Confidencial.</p>
      </div>
    </body>
    </html>
  `;
}