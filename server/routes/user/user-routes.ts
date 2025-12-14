
import type { Express } from "express";
import { storage } from "../../storage";
import { requireAuth } from "../../auth";

/**
 * Configuração de rotas relacionadas com utilizadores
 * 
 * Inclui perfil de utilizador, estatísticas, dados pessoais e preferências.
 * Todas as rotas requerem autenticação.
 */
export function setupUserRoutes(app: Express): void {
  console.log('👤 Configurando rotas de utilizador...');

  // Obter dados do utilizador autenticado
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
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
  app.get('/api/user/stats', requireAuth, async (req: any, res) => {
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
  app.get('/api/user', requireAuth, async (req: any, res) => {
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
  app.put('/api/user/profile', requireAuth, async (req: any, res) => {
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

  // Endpoint para fixar roles de utilizadores (debug)
  app.post('/api/debug/fix-user-roles', async (req, res) => {
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
