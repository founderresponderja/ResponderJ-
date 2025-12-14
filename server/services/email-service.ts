
import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export const emailService = {
  async sendEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('📧 [MOCK EMAIL]', options);
      return true;
    }

    try {
      await mailService.send({
        from: process.env.FROM_EMAIL || 'noreply@responderja.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, '')
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },

  async sendLeadWelcomeEmail(to: string, data: { companyName: string; contactName: string }) {
    return this.sendEmail({
      to,
      subject: `Bem-vindo à Responder Já, ${data.contactName}!`,
      html: `
        <h1>Olá ${data.contactName},</h1>
        <p>Obrigado pelo interesse da ${data.companyName} na Responder Já.</p>
        <p>Estamos aqui para ajudar a automatizar as suas respostas a reviews.</p>
        <br>
        <p>Equipa Responder Já</p>
      `
    });
  },

  async sendLeadFollowUpEmail(to: string, data: { companyName: string; contactName: string; followUpNumber: number }) {
    return this.sendEmail({
      to,
      subject: `Ainda interessado em melhorar as reviews da ${data.companyName}?`,
      html: `
        <p>Olá ${data.contactName},</p>
        <p>Apenas para verificar se tem alguma questão sobre a nossa plataforma.</p>
        <br>
        <p>Equipa Responder Já</p>
      `
    });
  }
};
