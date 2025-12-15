
import { emailService } from "./email-service";
import { storage } from "../storage";

export const notificationService = {
  async sendCampaignEmail(subject: string, htmlContent: string, target: string) {
    console.log(`🚀 Iniciando campanha "${subject}" para alvo: ${target}`);
    
    // Em produção, isto buscaria utilizadores reais da base de dados baseados no 'target'
    // Ex: const users = await storage.getUsersByTarget(target);
    // Por segurança e para evitar spam nesta demo, enviamos apenas para o admin configurado
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@responderja.com';
    
    const success = await emailService.sendEmail({
        to: adminEmail,
        subject: `[Campanha] ${subject}`,
        html: htmlContent
    });

    return { sent: success ? 1 : 0, target, note: "Em modo demo, enviado apenas para admin" };
  },

  async sendWeeklyNewsletter() {
    console.log("📅 A processar newsletter semanal...");
    // Lógica real de agregação de conteúdo seria aqui
    return true;
  },

  async notifySystemEvent(event: string, message: string, priority: string) {
    console.log(`[EVENTO SISTEMA] ${priority}: ${event}`);
    
    if (priority === 'high' || priority === 'critical') {
       const adminEmail = process.env.ADMIN_EMAIL || 'suporte@responderja.com';
       await emailService.sendEmail({
           to: adminEmail,
           subject: `🚨 ALERTA SISTEMA: ${event}`,
           html: `
             <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border: 1px solid #ef4444;">
               <h2 style="color: #b91c1c; margin-top:0;">Prioridade: ${priority.toUpperCase()}</h2>
               <p style="font-size: 16px;">${message}</p>
               <p style="color: #666; font-size: 12px; margin-top: 20px;">Timestamp: ${new Date().toISOString()}</p>
             </div>
           `
       });
    }
  },

  async checkLowCredits() {
    console.log("🔍 A verificar saldos de créditos baixos...");
    // Em produção: Iterar users, verificar credits < 10, enviar email via emailService
    // Placeholder seguro
  }
};
