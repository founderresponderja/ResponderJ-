
import type { Express } from "express";
import { requireAuth } from "../auth.js";
import { storage } from "../storage.js";
import { InsertAutomationRule } from "../../shared/schema.js";
import { automationService } from "../services/automation-service.js";

export function registerAutomationRoutes(app: any) {
  // Listar regras de automação
  app.get("/api/automation/rules", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const rules = await storage.getAutomationRules(userId);
      res.json(rules);
    } catch (error: any) {
      console.error("Erro ao listar regras:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Criar nova regra de automação
  app.post("/api/automation/rules", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const { name, platform, trigger, action } = req.body;

      const ruleData: InsertAutomationRule = {
        userId,
        name,
        platform,
        isActive: true,
        trigger,
        action,
        triggerCount: 0
      };

      const newRule = await storage.createAutomationRule(ruleData);
      res.status(201).json(newRule);
    } catch (error: any) {
      console.error("Erro ao criar regra:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Actualizar regra de automação
  app.patch("/api/automation/rules/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;

      const rules = await storage.getAutomationRules(userId);
      const rule = rules.find(r => r.id === parseInt(id));

      if (!rule) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }

      const updatedRule = await storage.updateAutomationRule(id, req.body);
      res.json(updatedRule);
    } catch (error: any) {
      console.error("Erro ao actualizar regra:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Eliminar regra de automação
  app.delete("/api/automation/rules/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      
      const rules = await storage.getAutomationRules(userId);
      const rule = rules.find(r => r.id === parseInt(id));

      if (!rule) {
        return res.status(404).json({ error: "Regra não encontrada" });
      }

      await storage.deleteAutomationRule(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao eliminar regra:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Executar regras de automação (Simulador e Teste)
  app.post("/api/automation/execute", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { text, platform, sentiment, rating } = req.body;

      const triggeredRules = await automationService.executeAutomation(userId, {
        text,
        platform,
        rating: rating ? parseFloat(rating) : undefined,
        sentiment,
        author: 'Simulador'
      });

      res.json({
        success: true,
        triggeredRules,
        executedCount: triggeredRules.length
      });
    } catch (error: any) {
      console.error("Erro ao executar automação:", error);
      res.status(500).json({ error: error.message });
    }
  });
}