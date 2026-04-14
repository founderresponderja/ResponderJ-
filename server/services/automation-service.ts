import { db } from "../db.js";
import { reviews, responses, establishments, users } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { storage } from "../storage.js";
import { aiResponseService } from "./ai-response-service.js";
import { emailService } from "./email-service.js";

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
          template: action.template
        });
        
        console.log(`✅ Regra "${rule.name}" acionada para utilizador ${userId}`);
      }
    }

    return triggeredResults;
  },

  /**
   * Processo batch para verificar novas reviews e aplicar automação
   * Verifica reviews sem resposta e aplica as regras configuradas pelo utilizador
   */
  async processNewReviewsBatch() {
     console.log("🔄 [Automação] A verificar novas interações para resposta automática...");
     
     try {
        // Buscar reviews que ainda não têm resposta associada
        const pendingItems = await db
            .select({
                review: reviews,
                userId: establishments.userId
            })
            .from(reviews)
            .innerJoin(establishments, eq(reviews.establishmentId, establishments.id))
            .leftJoin(responses, eq(reviews.id, responses.reviewId))
            .where(isNull(responses.id))
            .limit(20); // Lote pequeno para evitar bloqueios

        for (const item of pendingItems) {
            const { review, userId } = item;
            
            // Verificar se utilizador tem créditos suficientes
            const user = await storage.getUser(userId);
            if (!user || (user.credits || 0) <= 0) continue;

            // Executar motor de regras
            const results = await this.executeAutomation(userId, {
                text: review.reviewText || "",
                platform: review.platform,
                rating: review.rating || undefined,
                sentiment: review.sentiment || undefined,
                author: review.authorName || "Cliente"
            });

            if (results.length > 0) {
                // Processar resultados
                for (const res of results) {
                    if (res.action === 'auto_respond' && res.response) {
                        // Salvar resposta gerada
                        await storage.createAiResponse({
                            reviewId: review.id,
                            userId: userId,
                            responseText: res.response,
                            tone: "automático",
                            language: review.language || "pt",
                            responseType: "auto_reply",
                            creditsUsed: 1,
                            aiModel: "gemini-2.5-flash",
                            customerName: review.authorName,
                            isPublished: true, // Assumimos publicação automática
                            publishedAt: new Date(),
                            // @ts-ignore - Propriedades opcionais no schema
                            variationNumber: 1
                        });

                        // Debitar crédito
                        await storage.updateUserCredits(userId, (user.credits || 0) - 1);
                        
                        // Registar transação de crédito
                        await storage.createCreditTransaction({
                            userId,
                            type: 'usage',
                            amount: -1,
                            description: `Resposta Automática (Regra: ${res.ruleName})`
                        });

                        // Enviar notificação por email se o utilizador tiver email configurado
                        if (user.email) {
                            try {
                                await emailService.sendResponseGeneratedEmail(
                                    user.email,
                                    user.firstName,
                                    review.platform,
                                    res.response
                                );
                            } catch (emailError) {
                                console.error("Erro ao enviar notificação de automação:", emailError);
                            }
                        }

                        console.log(`🤖 Auto-resposta gerada para review ${review.id}`);
                    }
                }
            } else {
                // Nenhuma regra correspondeu. 
                // Registar uma resposta "sistema" ou "ignorada" para evitar processar esta review novamente no próximo batch.
                // Isto previne loops infinitos de verificação em reviews que não têm regras aplicáveis.
                await storage.createAiResponse({
                    reviewId: review.id,
                    userId: userId,
                    responseText: "Ignorado: Nenhuma regra de automação correspondeu.",
                    tone: "system",
                    language: "system",
                    responseType: "automation_skip", 
                    creditsUsed: 0,
                    aiModel: "system",
                    customerName: review.authorName,
                    isPublished: false, 
                    publishedAt: new Date(),
                    // @ts-ignore
                    variationNumber: 0
                });
                console.log(`⏩ Review ${review.id} ignorada (sem regras correspondentes)`);
            }
        }
     } catch (error) {
         console.error("Erro no processamento batch de automação:", error);
     }
     
     return true;
  }
};