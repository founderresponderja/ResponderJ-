import type { Request, Response } from "express";
import { storage } from "../storage";
import { emailService } from "../services/email-service";
import { ControllerUtils } from "../utils/ControllerUtils";

export class LeadsEmailController {
  // Processar sequência de emails automáticos
  static async processEmailSequence(req: any, res: any) {
    try {
      const leadsForEmails = await storage.getLeadsForEmailSequence();
      
      const result = await ControllerUtils.processLeadsArray(
        leadsForEmails,
        async (lead) => {
          await processLeadEmailSequence(lead);
        },
        { checkExists: false }
      );
      
      res.json({ processed: result.processed, errors: result.errors });
    } catch (error) {
      ControllerUtils.handleError(error, 'no processamento de emails', res, req);
    }
  }

  // Enviar email de boas-vindas para novos leads
  static async sendWelcomeEmails(req: any, res: any) {
    try {
      await sendWelcomeEmailsToNewLeads();
      res.json({ message: 'Emails de boas-vindas enviados' });
    } catch (error) {
      ControllerUtils.handleError(error, 'ao enviar emails de boas-vindas', res, req);
    }
  }
}

// Processar sequência de emails para um lead
async function processLeadEmailSequence(lead: any) {
  const now = new Date();
  
  if (lead.emailStatus === 'pending' && !lead.firstEmailSentAt) {
    // Primeiro email
    await emailService.sendLeadWelcomeEmail(lead.email, {
      companyName: lead.companyName,
      contactName: lead.contactName || 'Responsável',
    });
    
    await storage.updateLeadEmailStatus(lead.id, 'first_sent', now);
    
  } else if (lead.emailStatus === 'first_sent' && lead.firstEmailSentAt && !lead.secondEmailSentAt) {
    const daysSinceFirst = Math.floor((now.getTime() - new Date(lead.firstEmailSentAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceFirst >= 7) {
      await emailService.sendLeadFollowUpEmail(lead.email, {
        companyName: lead.companyName,
        contactName: lead.contactName || 'Responsável',
        followUpNumber: 1,
      });
      
      await storage.updateLeadEmailStatus(lead.id, 'second_sent', now);
    }
    
  } else if (lead.emailStatus === 'second_sent' && lead.secondEmailSentAt && !lead.thirdEmailSentAt) {
    const daysSinceSecond = Math.floor((now.getTime() - new Date(lead.secondEmailSentAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSecond >= 30) {
      await emailService.sendLeadFollowUpEmail(lead.email, {
        companyName: lead.companyName,
        contactName: lead.contactName || 'Responsável',
        followUpNumber: 2,
      });
      
      await storage.updateLeadEmailStatus(lead.id, 'third_sent', now);
    }
    
  } else if (lead.emailStatus === 'third_sent' && lead.thirdEmailSentAt) {
    const daysSinceThird = Math.floor((now.getTime() - new Date(lead.thirdEmailSentAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceThird >= 60) {
      await storage.updateLeadEmailStatus(lead.id, 'dormant', now);
    }
  }
}

// Enviar emails de boas-vindas para novos leads usando processamento paralelo
async function sendWelcomeEmailsToNewLeads() {
  const pendingLeads = await storage.getLeadsByEmailStatus('pending');
  
  // Processar leads em paralelo para melhor performance
  const emailPromises = pendingLeads.map(async (lead) => {
    try {
      await emailService.sendLeadWelcomeEmail(lead.email, {
        companyName: lead.companyName,
        contactName: lead.contactName || 'Responsável',
      });
      
      await storage.updateLeadEmailStatus(lead.id, 'first_sent', new Date());
      return { success: true, lead: lead.email };
    } catch (error) {
      console.error(`❌ Erro ao enviar email para ${lead.email}:`, error);
      return { success: false, lead: lead.email, error };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const summary = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<any>).value)
    .reduce(
      (acc, result) => {
        if (result.success) acc.success++;
        else acc.errors++;
        return acc;
      },
      { success: 0, errors: 0 }
    );
    
  console.log(`📧 Emails enviados: ${summary.success} sucessos, ${summary.errors} erros`);
  return summary;
}