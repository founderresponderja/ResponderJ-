import { emailService } from "./email-service";
import { urlBuilder } from "../utils";

export const onboardingEmailService = {
  async sendWelcome(user: any) {
    const dashboardUrl = urlBuilder.getDashboardURL();
    return emailService.sendEmail({
      to: user.email,
      subject: "Comece a usar o Responder Já",
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>Olá ${user.firstName}!</h1>
          <p>A sua conta foi criada com sucesso.</p>
          <p>Para começar a poupar tempo, conecte as suas plataformas no painel de controlo.</p>
          <p><strong>Dica rápida:</strong> Configure o "Perfil de Negócio" para que a IA conheça o tom da sua marca.</p>
          <br>
          <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ir para Dashboard</a>
        </div>
      `
    });
  },

  async sendTips(user: any) {
    return emailService.sendEmail({
      to: user.email,
      subject: "Dicas para melhores respostas",
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Como maximizar o Responder Já</h2>
          <p>Sabia que responder em menos de 24h aumenta a sua visibilidade no Google?</p>
          <p>Use a nossa funcionalidade de "Automação" para aprovar respostas de confiança automaticamente.</p>
        </div>
      `
    });
  }
};