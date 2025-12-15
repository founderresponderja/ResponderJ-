import sgMail, { MailService } from '@sendgrid/mail';
import { storage } from '../storage';
import fs from 'fs';
import path from 'path';

// Interface para dados de email
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

// Interface para configurações de email
export interface EmailConfig {
  from: string;
  replyTo?: string;
  trackingSettings?: {
    clickTracking?: boolean;
    openTracking?: boolean;
  };
}

// Interface para envio de fatura
export interface SendInvoiceEmailParams {
  to: string;
  invoice: any;
  settings: any;
  pdfPath: string;
}

// Interface para contacto
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  type: string;
}

export class EmailService {
  private isConfigured: boolean = false;
  private defaultConfig: EmailConfig;

  constructor() {
    this.defaultConfig = {
      from: process.env.FROM_EMAIL || 'noreply@responderja.com',
      replyTo: process.env.REPLY_TO_EMAIL || 'suporte@responderja.com',
      trackingSettings: {
        clickTracking: true,
        openTracking: true,
      }
    };

    this.initializeService();
  }

  private initializeService() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
      console.log('✅ SendGrid configurado com sucesso');
    } else {
      console.warn('⚠️ SENDGRID_API_KEY não configurada. Emails serão logados apenas.');
    }
  }

  // Teste de conexão SendGrid
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('⚠️ SendGrid não configurado - teste simulado');
      return false;
    }

    try {
      // Enviar email de teste
      await this.sendEmail({
        to: 'teste@responderja.com',
        subject: 'Teste de Conexão SendGrid',
        html: '<h1>Teste</h1><p>Conexão SendGrid funcionando!</p>',
        text: 'Teste - Conexão SendGrid funcionando!'
      });
      return true;
    } catch (error) {
      console.error('❌ Erro no teste SendGrid:', error);
      return false;
    }
  }

  // Enviar email simples
  async sendEmail(emailData: EmailData, config?: Partial<EmailConfig>): Promise<boolean> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const msg: any = {
      to: emailData.to,
      from: finalConfig.from,
      replyTo: finalConfig.replyTo,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      trackingSettings: finalConfig.trackingSettings,
    };

    // Early return para modo simulado
    if (!this.isConfigured) {
      console.log('📧 Email simulado (SendGrid não configurado):');
      console.log(`Para: ${msg.to}`);
      console.log(`Assunto: ${msg.subject}`);
      // console.log(`Conteúdo: ${msg.html}`); // Reduce verbosity
      return true;
    }

    try {
      await sgMail.send(msg);
      console.log(`✅ Email enviado para: ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  // Email de notificação de resposta gerada (Automation)
  async sendResponseGeneratedEmail(
    userEmail: string, 
    userName: string, 
    platform: string,
    responsePreview: string
  ): Promise<boolean> {
    const subject = `✨ Nova Resposta Automática: ${platform}`;
    const html = this.generateResponseTemplate(userName, platform, responsePreview);
    
    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: `${userName}, o Responder Já gerou e publicou uma nova resposta para ${platform}.`
    });
  }

  // Email de créditos adicionados
  async sendCreditsAddedEmail(userEmail: string, userName: string, credits: number): Promise<boolean> {
    const subject = '💰 Créditos Adicionados à Sua Conta';
    const html = this.generateCreditsTemplate(userName, credits);
    
    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: `Olá ${userName}, foram adicionados ${credits} créditos à sua conta Responder Já.`
    });
  }

  // Email de boas-vindas para leads
  async sendLeadWelcomeEmail(email: string, data: { companyName: string; contactName: string }): Promise<boolean> {
    const subject = `Bem-vindo ao Responder Já, ${data.contactName}!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Olá ${data.contactName},</h1>
        <p>Obrigado pelo interesse da <strong>${data.companyName}</strong> na Responder Já.</p>
        <p>Estamos aqui para ajudar a automatizar as suas respostas a reviews e melhorar a sua reputação online.</p>
        <br>
        <p>Equipa Responder Já</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  }

  async sendLeadFollowUpEmail(email: string, data: { companyName: string; contactName: string; followUpNumber: number }): Promise<boolean> {
    const subject = `Ainda interessado em melhorar as reviews da ${data.companyName}?`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Olá ${data.contactName},</p>
        <p>Apenas para verificar se tem alguma questão sobre como o Responder Já pode ajudar a ${data.companyName}.</p>
        <br>
        <p>Equipa Responder Já</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  }
  
  // Placeholder methods for other email types needed by the system
  async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<boolean> {
    console.log(`📧 Sending invoice to ${params.to}`);
    return true; 
  }

  // Templates HTML
  private generateResponseTemplate(userName: string, platform: string, responsePreview: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>✨ Resposta Automática Gerada!</h1>
                <p>Para ${platform}</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Olá ${userName},</p>
                <p>O Responder Já detetou uma nova avaliação e publicou a seguinte resposta automaticamente:</p>
                
                <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; font-style: italic;">
                    "${responsePreview}"
                </div>
                
                <p style="font-size: 12px; color: #666;">Pode editar ou apagar esta resposta no painel da plataforma.</p>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://responderja.com/dashboard" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Aceder ao Dashboard</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateCreditsTemplate(userName: string, credits: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>💰 Créditos Adicionados!</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Olá ${userName},</p>
                <p>Foram adicionados <strong>${credits} créditos</strong> à sua conta com sucesso.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

// Instância singleton
export const emailService = new EmailService();