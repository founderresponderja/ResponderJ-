
import type { Express } from "express";
import { requireAuth } from "../auth";
import { generateApiKeyGuideHTML } from "../services/pdf-generator";
import fs from 'fs';
import path from 'path';

export function registerApiKeysGuideRoutes(app: any) {
  // Gerar e servir o PDF de instruções das API keys
  app.get("/api/admin/api-keys-guide/pdf", requireAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.claims?.sub && !req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Gerar HTML
      const htmlContent = generateApiKeyGuideHTML();
      
      // Definir headers para download como HTML (que pode ser convertido para PDF)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="API-Keys-Guide-Responder-Ja.html"');
      
      res.send(htmlContent);
    } catch (error) {
      console.error("Erro ao gerar guia de API keys:", error);
      res.status(500).json({ 
        message: "Erro ao gerar guia",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Endpoint para verificar status das API keys
  app.get("/api/admin/api-keys/status", requireAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.claims?.sub && !req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const apiKeyStatus = {
        configured: {
          count: 0,
          keys: [] as string[]
        },
        missing: {
          critical: [] as string[],
          important: [] as string[],
          corporate: [] as string[],
          optional: [] as string[]
        }
      };

      // Definir todas as chaves primeiro
      const configuredKeys = [
        'OPENAI_API_KEY',
        'DATABASE_URL', 
        'SESSION_SECRET'
      ];

      const criticalKeys = [
        'STRIPE_SECRET_KEY',
        'VITE_STRIPE_PUBLIC_KEY', 
        'SENDGRID_API_KEY',
        'ENCRYPTION_KEY'
      ];

      // Verificar chaves configuradas
      configuredKeys.forEach(key => {
        if (process.env[key]) {
          apiKeyStatus.configured.count++;
          apiKeyStatus.configured.keys.push(key);
        }
      });

      const importantKeys = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'FACEBOOK_CLIENT_ID',
        'FACEBOOK_CLIENT_SECRET',
        'INSTAGRAM_CLIENT_ID',
        'INSTAGRAM_CLIENT_SECRET',
        'TIKTOK_CLIENT_ID',
        'TIKTOK_CLIENT_SECRET',
        'AT_API_USERNAME',
        'AT_API_PASSWORD'
      ];

      const corporateKeys = [
        'TIKTOK_CORP_CLIENT_ID',
        'TIKTOK_CORP_CLIENT_SECRET',
        'INSTAGRAM_CORP_CLIENT_ID',
        'INSTAGRAM_CORP_CLIENT_SECRET',
        'FACEBOOK_CORP_CLIENT_ID',
        'FACEBOOK_CORP_CLIENT_SECRET',
        'TWITTER_CORP_CLIENT_ID',
        'TWITTER_CORP_CLIENT_SECRET'
      ];

      const optionalKeys = [
        'GOOGLE_ANALYTICS_ID',
        'SENTRY_DSN'
      ];

      // Verificar quais estão em falta
      criticalKeys.forEach(key => {
        if (!process.env[key]) {
          apiKeyStatus.missing.critical.push(key);
        }
      });

      importantKeys.forEach(key => {
        if (!process.env[key]) {
          apiKeyStatus.missing.important.push(key);
        }
      });

      corporateKeys.forEach(key => {
        if (!process.env[key]) {
          apiKeyStatus.missing.corporate.push(key);
        }
      });

      optionalKeys.forEach(key => {
        if (!process.env[key]) {
          apiKeyStatus.missing.optional.push(key);
        }
      });

      // Calcular estatísticas
      const totalKeys = configuredKeys.length + criticalKeys.length + importantKeys.length + corporateKeys.length + optionalKeys.length;
      const missingTotal = apiKeyStatus.missing.critical.length + 
                          apiKeyStatus.missing.important.length + 
                          apiKeyStatus.missing.corporate.length + 
                          apiKeyStatus.missing.optional.length;

      const stats = {
        total: totalKeys,
        configured: apiKeyStatus.configured.count,
        missing: missingTotal,
        completionPercentage: Math.round((apiKeyStatus.configured.count / totalKeys) * 100)
      };

      res.json({
        ...apiKeyStatus,
        stats,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error("Erro ao verificar status das API keys:", error);
      res.status(500).json({ 
        message: "Erro ao verificar status",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Endpoint para obter detalhes de uma API key específica
  app.get("/api/admin/api-keys/:keyName/info", requireAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.claims?.sub && !req.user?.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { keyName } = req.params;
      
      // Mapeamento de informações das API keys
      const apiKeyInfo: Record<string, any> = {
        'STRIPE_SECRET_KEY': {
          name: 'Stripe Secret Key',
          service: 'Stripe',
          category: 'payment',
          priority: 'critical',
          description: 'Chave secreta para processar pagamentos',
          configured: !!process.env.STRIPE_SECRET_KEY,
          setupUrl: 'https://dashboard.stripe.com/apikeys',
          documentation: 'https://stripe.com/docs/keys'
        },
        'SENDGRID_API_KEY': {
          name: 'SendGrid API Key',
          service: 'SendGrid',
          category: 'email',
          priority: 'critical',
          description: 'Chave para envio de emails automáticos',
          configured: !!process.env.SENDGRID_API_KEY,
          setupUrl: 'https://app.sendgrid.com/settings/api_keys',
          documentation: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started'
        },
        'OPENAI_API_KEY': {
          name: 'OpenAI API Key',
          service: 'OpenAI',
          category: 'ai',
          priority: 'critical',
          description: 'Chave para geração de respostas com IA',
          configured: !!process.env.OPENAI_API_KEY,
          setupUrl: 'https://platform.openai.com/api-keys',
          documentation: 'https://platform.openai.com/docs/quickstart'
        }
        // Adicionar mais conforme necessário
      };

      const info = apiKeyInfo[keyName];
      if (!info) {
        return res.status(404).json({ message: "API key não encontrada" });
      }

      res.json(info);
    } catch (error) {
      console.error("Erro ao obter informações da API key:", error);
      res.status(500).json({ 
        message: "Erro ao obter informações",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}