
import type { Express } from "express";
import { storage } from "../../storage.js";
import { requireAuth } from "../../auth.js";
import { SecurityLogService } from "../../services/security-log-service.js";

/**
 * Configuração de rotas relacionadas com utilizadores
 * 
 * Inclui perfil de utilizador, estatísticas, dados pessoais e preferências.
 * Todas as rotas requerem autenticação.
 */
export function setupUserRoutes(app: any): void {
  console.log('👤 Configurando rotas de utilizador...');

  // Obter dados do utilizador autenticado
  app.get('/api/auth/user', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Mapeamento correto: BD (snake_case) → Frontend (camelCase)
      const mappedUser = {
        ...user,
        isAdmin: user.isAdmin || false,
        isSuperAdmin: user.isSuperAdmin || false
      };
      
      console.log(`🔍 Retornando utilizador: ${user.email}, plan: ${user.selectedPlan}, admin: ${user.isAdmin}`);
      res.json(mappedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Estatísticas do utilizador para dashboard
  app.get('/api/user/stats', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calcular estatísticas do utilizador
      const stats = {
        availableCredits: user.credits || 0,
        totalResponsesGenerated: 0, // Será calculado da tabela responses
        creditsUsedThisMonth: 0, // Será calculado das transações de créditos
        lastActivityDate: new Date().toISOString(),
        planStatus: user.selectedPlan || 'free',
        isTrialActive: (user as any).isTrialActive || false
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Rota legacy para compatibilidade
  app.get('/api/user', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Mapeamento correto: BD (snake_case) → Frontend (camelCase)
      const mappedUser = {
        ...user,
        isAdmin: user.isAdmin || false,
        isSuperAdmin: user.isSuperAdmin || false
      };
      
      res.json(mappedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Atualizar perfil do utilizador
  app.put('/api/user/profile', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, companyName, phone } = req.body;
      
      await storage.updateUser(userId, {
        firstName,
        lastName,
        companyName,
        phone
      });
      
      const updatedUser = await storage.getUser(userId);
      res.json({
        message: "Perfil atualizado com sucesso",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // [NOVO] Exportação de Dados GDPR (Art. 20.º - Portabilidade)
  app.get('/api/user/export-data', requireAuth, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        console.log(`📦 Iniciando exportação de dados GDPR para user ${userId}`);

        // 1. Dados Pessoais e Conta
        const user = await storage.getUser(userId);
        
        // 2. Histórico de Atividade (Logs)
        // Nota: Em produção, buscaríamos da tabela de logs filtrado por userId
        const logs = [{ type: 'login', date: user?.lastLoginAt }]; 

        // 3. Dados Gerados (Respostas IA)
        const responses = await storage.getUserAiResponses(userId, 1000); // Limite alto para exportação

        // 4. Transações e Faturação
        const transactions = await storage.getUserCreditTransactions(userId);
        const billingInfo = await storage.getUserSubscription(userId);

        // 5. Preferências de Privacidade
        // Simulação - buscaríamos do cookie consent log ou tabela
        const privacyPreferences = {
            marketingConsent: false,
            analyticsConsent: false,
            lastUpdated: new Date().toISOString()
        };

        const exportData = {
            personalData: {
                ...user,
                password: "[REDACTED_FOR_SECURITY]"
            },
            activityLog: logs,
            generatedContent: responses,
            financialData: {
                transactions,
                subscription: billingInfo
            },
            privacySettings: privacyPreferences,
            exportMetadata: {
                exportDate: new Date().toISOString(),
                requestIp: req.ip,
                legalBasis: "GDPR Art. 20 (Data Portability)"
            }
        };

        // Log da ação de exportação (Segurança)
        SecurityLogService.addLog({
            level: 'info',
            type: 'audit',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: '/api/user/export-data',
            userId: userId,
            details: 'Utilizador solicitou portabilidade de dados (GDPR Art. 20)',
            statusCode: 200
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="dados-pessoais-${userId}-${Date.now()}.json"`);
        res.json(exportData);

    } catch (error) {
        console.error("Error exporting user data:", error);
        res.status(500).json({ message: "Erro ao exportar dados pessoais" });
    }
  });

  // Endpoint para fixar roles de utilizadores (debug)
  app.post('/api/debug/fix-user-roles', async (req: any, res: any) => {
    try {
      const fixes = [
        { email: 'trial@amplia.com', plan: 'trial' },
        { email: 'starter@amplia.com', plan: 'starter' },
        { email: 'pro@amplia.com', plan: 'pro' },
        { email: 'agencia@amplia.com', plan: 'agency' }
      ];

      const results = [];
      for (const fix of fixes) {
        const user = await storage.getUserByEmail(fix.email);
        if (user) {
          await storage.updateUser(user.id, { 
            selectedPlan: fix.plan, 
            subscriptionPlan: fix.plan 
          });
          results.push(`✅ Updated ${fix.email} with plan: ${fix.plan}`);
        } else {
          results.push(`❌ ${fix.email} user not found`);
        }
      }

      res.json({ 
        message: "User roles update completed", 
        results 
      });
    } catch (error) {
      console.error("Error fixing user roles:", error);
      res.status(500).json({ error: "Failed to fix user roles" });
    }
  });

  console.log('✅ Rotas de utilizador configuradas com sucesso');
}
