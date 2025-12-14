import { storage } from "../storage";
import { emailService } from "./email-service";

export const emailSequenceService = {
  async createSequenceForUser(userId: string) {
    console.log(`Creating email sequence for user ${userId}`);
    
    const user = await storage.getUser(userId);
    if (!user) return;

    // Send Welcome Email immediately
    await emailService.sendEmail({
        to: user.email,
        subject: "Bem-vindo ao Responder Já!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0ea5e9;">Olá ${user.firstName},</h1>
            <p>Bem-vindo à plataforma que vai revolucionar a sua gestão de reviews.</p>
            <p>A sua conta foi criada e o período de teste de 7 dias começou.</p>
            <br>
            <a href="https://responderja.pt/dashboard" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aceder ao Dashboard</a>
          </div>
        `
    });

    // In a real database implementation, we would insert rows into an 'email_sequences' table here
    // with scheduled dates for Day 1, Day 3, Day 6 emails.
    
    return true;
  },

  async processPendingSequences() {
      // Logic to find pending emails in DB (e.g. scheduled for today) and send them
      // This would be called by a cron job
      console.log("Processing pending email sequences...");
      
      // Mock processing
      return { processed: 0, sent: 0, errors: 0 };
  }
};