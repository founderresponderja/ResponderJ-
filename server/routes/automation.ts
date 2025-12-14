
import type { Express } from "express";
import { requireAuth } from "../auth";
import { aiResponseService } from "../services/ai-response-service";
import { storage } from "../storage";
import { InsertAutomationRule } from "@shared/schema";

export function registerAutomationRoutes(app: Express) {
  // Listar regras de automação
  app.get("/api/automation/rules", requireAuth, async (req: any, res) => {
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
  app.post("/api/automation/rules", requireAuth, async (req: any, res) => {
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
  app.patch("/api/automation/rules/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;

      // Ensure ownership
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
  app.delete("/api/automation/rules/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      
      // Ensure ownership
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

  // Executar regras de automação (Simulador)
  app.post("/api/automation/execute", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { text, platform, sentiment, rating } = req.body;

      // Obter regras da DB para este utilizador
      const userRules = await storage.getAutomationRules(userId);
      const activeRules = userRules.filter(rule => rule.isActive && rule.platform === platform);
      const triggeredRules = [];

      for (const rule of activeRules) {
        let shouldTrigger = false;
        
        // Type casting for JSONB fields
        const trigger = rule.trigger as any;
        const action = rule.action as any;

        switch (trigger.type) {
          case 'keyword':
            const keywords = (trigger.value as string).split('|');
            shouldTrigger = keywords.some(keyword => 
              text.toLowerCase().includes(keyword.toLowerCase())
            );
            break;
          
          case 'sentiment':
            shouldTrigger = sentiment === trigger.value;
            break;
          
          case 'rating':
            const ratingValue = parseFloat(trigger.value as string);
            const inputRating = parseFloat(rating);
            switch (trigger.condition) {
              case 'less_than': shouldTrigger = inputRating < ratingValue; break;
              case 'greater_than': shouldTrigger = inputRating > ratingValue; break;
              case 'equals': shouldTrigger = inputRating === ratingValue; break;
            }
            break;
        }

        if (shouldTrigger) {
          // Actualizar contador de triggers na DB
          await storage.updateAutomationRule(rule.id, {
             triggerCount: (rule.triggerCount || 0) + 1,
             lastTriggered: new Date()
          });
          
          let responseText = action.template;

          // Se a ação for responder automaticamente, usar a IA para gerar a resposta
          if (action.type === 'auto_respond') {
            try {
              const aiResult = await aiResponseService.generateResponse({
                comment: text,
                platform: platform,
                tone: 'professional', // Pode ser parametrizado na regra futuramente
                extraInstructions: `Diretriz da regra de automação: ${action.template}`,
                responseType: 'reply'
              });
              responseText = aiResult.response;
            } catch (error) {
              console.error("Failed to generate AI response for automation:", error);
              responseText = "Erro ao gerar resposta automática. (Fallback)";
            }
          }

          triggeredRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            action: action.type,
            template: action.template,
            generatedResponse: responseText
          });
        }
      }

      res.json({
        triggeredRules,
        executedCount: triggeredRules.length
      });
    } catch (error: any) {
      console.error("Erro ao executar automação:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
