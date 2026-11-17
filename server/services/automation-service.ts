import { db } from "../db.js";
import { reviews, responses, establishments, users } from "../../shared/schema.js";
import { eq, isNull } from "drizzle-orm";
import { storage } from "../storage.js";
import { aiResponseService } from "./ai-response-service.js";

export const automationService = {
  /**
   * Executa o motor de regras de automação para um conjunto de inputs
   */
  async executeAutomation(userId: number | string, input: { 
    text: string, 
    platform: string, 
    rating?: number, 
    sentiment?: string,
    author?: string 
  }) {
    const rules = await storage.getAutomationRules(userId);
    const activeRules = rules.filter(r => r.isActive && r.platform === input.platform);
    
    const triggeredResults = [];

    for (const rule of activeRules) {
      let shouldTrigger = false;
      const trigger = rule.trigger as any;
      const action = rule.action as any;

      // 1. Verificar Trigger
      switch (trigger.type) {
        case 'keyword':
          if (trigger.value) {
            const keywords = (trigger.value as string).split('|');
            shouldTrigger = keywords.some(keyword => 
              input.text.toLowerCase().includes(keyword.toLowerCase().trim())
            );
          }
          break;
        
        case 'sentiment':
          const sentiment = input.sentiment || await aiResponseService.detectSentiment(input.text);
          shouldTrigger = sentiment.toLowerCase() === (trigger.value as string).toLowerCase();
          break;
        
        case 'rating':
          if (input.rating !== undefined) {
             const threshold = parseFloat(trigger.value as string);
             const rating = input.rating;
             switch (trigger.condition) {
               case 'equals': shouldTrigger = rating === threshold; break;
               case 'greater_than': shouldTrigger = rating > threshold; break;
               case 'less_than': shouldTrigger = rating < threshold; break;
             }
          }
          break;
      }

      // 2. Executar Ação
      if (shouldTrigger) {
        let responseText = action.template;
        let generated = false;
        
        if (action.type === 'auto_respond') {
           try {
             // Gerar resposta com IA usando o template como guia
             const aiResult = await aiResponseService.generateResponse({
               comment: input.text,
               platform: input.platform,
               tone: 'profissional', 
               extraInstructions: `REGRA AUTOMÁTICA: O template base é "${action.template}". Usa este template para responder especificamente ao cliente ${input.author || ''}.`,
               responseType: 'auto_reply'
             });
             responseText = aiResult.response;
             generated = true;
           } catch (e) {
             console.error(`Erro ao gerar resposta automática para regra ${rule.id}`, e);
             // Fallback para o template puro se a IA falhar
           }
        }

        // Atualizar contadores
        await storage.updateAutomationRule(rule.id, {
          triggerCount: (rule.triggerCount || 0) + 1,
          lastTriggered: new Date()
        });

        triggeredResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: action.type,
          response: responseText,
          generated,
          template: action.template
        });
        
        console.log(`✅ Regra "${rule.name}" acionada para utilizador ${userId}`);
      }
    }

    return triggeredResults;
  },

  /**
   * RJ-3.4: respostas automáticas, chamado pelo agendamento diário (api/cron/sync-reviews.ts)
   * logo a seguir à sincronização. Antes dependia de um setInterval que nunca corria na Vercel
   * (as funções não ficam ligadas entre pedidos), por isso a funcionalidade do plano Pro não fazia nada.
   *
   * Regras (corrigem o código antigo, que nunca tinha corrido):
   * - só reviews novas (marcadas em reviews.automation_checked_at) e dos planos com respostas automáticas;
   * - a resposta fica PENDENTE para o cliente aprovar: não é publicada sozinha e só gasta crédito
   *   ao ser aceite, como as outras (antes marcava "publicada" sem publicar e descontava logo);
   * - reviews sem regra aplicável ficam só marcadas como vistas (antes criava respostas falsas
   *   "Ignorado: ..." que apareceriam na Caixa de entrada);
   * - um email por cliente com o número de respostas à espera de aprovação;
   * - pára antes do limite de tempo da função (deadline).
   */
  async processNewReviewsBatch(options: { deadline?: number; limit?: number } = {}) {
    const deadline = options.deadline ?? Date.now() + 20000;
    const limit = options.limit ?? 50;
    const stats = { checked: 0, generated: 0, skippedPlan: 0, failed: 0, stoppedForTime: false };
    const { sql } = await import("drizzle-orm");
    const { PLAN_CAPABILITIES, normalizePlan } = await import("../../shared/planCapabilities.js");
    const { sendMail } = await import("./mailer.js");

    const { rows } = await db.execute(sql`
      SELECT r.id, r.review_text, r.platform, r.rating, r.sentiment, r.author_name, r.language,
             e.user_id
      FROM reviews r
      JOIN establishments e ON e.id = r.establishment_id
      WHERE r.automation_checked_at IS NULL
        AND r.created_at > now() - interval '7 days'
        AND NOT EXISTS (SELECT 1 FROM responses x WHERE x.review_id = r.id AND x.approval_status <> 'discarded')
      ORDER BY r.created_at
      LIMIT ${limit}`);

    const perUser = new Map<number, number>();
    for (const row of rows as any[]) {
      if (Date.now() > deadline) { stats.stoppedForTime = true; break; }
      const userId = Number(row.user_id);
      const markChecked = () => db.execute(sql`UPDATE reviews SET automation_checked_at = now() WHERE id = ${row.id}`);
      try {
        const user = await storage.getUser(userId);
        const plan = normalizePlan(user?.subscriptionPlan || user?.selectedPlan);
        if (!user || !PLAN_CAPABILITIES[plan].hasAutoResponse || Number(user.credits || 0) < 1) {
          stats.skippedPlan++;
          await markChecked();
          continue;
        }
        const results = await this.executeAutomation(userId, {
          text: row.review_text || "",
          platform: row.platform,
          rating: row.rating ?? undefined,
          sentiment: row.sentiment ?? undefined,
          author: row.author_name || "Cliente",
        });
        const auto = results.find((r: any) => r.action === "auto_respond" && r.generated && r.response);
        if (auto) {
          await storage.createAiResponse({
            reviewId: row.id,
            userId,
            responseText: auto.response,
            originalResponseText: auto.response,
            tone: "profissional",
            language: row.language || "pt",
            responseType: "auto_reply",
            creditsUsed: 1,
            aiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            customerName: row.author_name,
            approvalStatus: "pending",
            isPublished: false,
            variationNumber: 1,
            learningMeta: { automationRule: auto.ruleName, generatedBy: "automation" },
          } as any);
          stats.generated++;
          perUser.set(userId, (perUser.get(userId) || 0) + 1);
        }
        stats.checked++;
        await markChecked();
      } catch (error: any) {
        stats.failed++;
        console.error(`[automation] review ${row.id} failed:`, error?.message);
        // Fica por marcar: volta a ser tentada no próximo dia.
      }
    }

    for (const [userId, count] of perUser) {
      const user = await storage.getUser(userId).catch(() => undefined);
      if (!user?.email) continue;
      await sendMail({
        to: user.email,
        subject: `${count} ${count === 1 ? "resposta automática" : "respostas automáticas"} à espera de aprovação`,
        text: `Olá${user.firstName ? ` ${user.firstName}` : ""},\n\nAs suas regras de automação prepararam ${count} ${count === 1 ? "resposta" : "respostas"} a reviews novas. Estão na Caixa de entrada, à espera de aprovação: só são publicadas e só gastam crédito quando as aceitar.\n\nEquipa Responder Já`,
      }).catch(() => undefined);
    }
    console.log("[automation] batch", stats);
    return stats;
  }
};
