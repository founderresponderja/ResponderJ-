import bcrypt from "bcrypt";
import crypto from "crypto";
import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { newLoginSchema, newRegisterSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { MailService } from '@sendgrid/mail';
import { urlBuilder } from "./utils";

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Configuração de segurança
const SALT_ROUNDS = 14;
const BRAND_COLOR = "#0ea5e9"; // Brand-500

export function setupClassicAuth(app: any) {
  
  // =====================================
  // LOGIN CLÁSSICO
  // =====================================
  app.post("/api/auth/login", async (req: any, res: any) => {
    try {
      const validatedData = newLoginSchema.parse(req.body);
      const { email, password } = validatedData;

      console.log(`🔑 Login clássico iniciado: ${email}`);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`❌ Utilizador não encontrado: ${email}`);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        console.log(`⚠️ Email não verificado: ${email}`);
        return res.status(401).json({ message: "Por favor, verifique o seu email antes de entrar." });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`❌ Password incorreta: ${email}`);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Create session
      req.login(user, (err: any) => {
        if (err) {
          console.error("💥 Erro de sessão:", err);
          return res.status(500).json({ message: "Erro interno do servidor" });
        }
        
        console.log(`✅ Login com sucesso: ${email}`);
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });

    } catch (error) {
      console.error("💥 Erro no login:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // =====================================
  // REGISTO CLÁSSICO
  // =====================================
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const validatedData = newRegisterSchema.parse(req.body);
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        phone, 
        companyName, 
        companyAddress, 
        nif 
      } = validatedData;

      console.log(`📝 Novo registo clássico: ${email}`);

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Este email já se encontra registado." });
      }

      // Hash password logic consistent with auth.ts
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Create user (unverified)
      // Nota: Ajuste conforme o seu schema real do user se faltarem campos
      await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || "",
        companyName,
        nif: nif || "",
        credits: 10, // Créditos iniciais para Trial
        emailVerified: false,
        emailVerificationToken,
        isActive: true,
        isAdmin: false,
        isSuperAdmin: false,
        role: "user"
      });

      // Send verification email
      try {
        const verificationUrl = urlBuilder.buildAppURL(`/api/auth/verify-email?token=${emailVerificationToken}`, req);
        
        if (process.env.SENDGRID_API_KEY) {
            await mailService.send({
            to: email,
            from: 'noreply@responderja.com',
            subject: 'Verifique a sua conta - Responder Já',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h2 style="color: ${BRAND_COLOR}; margin-top: 0;">Bem-vindo ao Responder Já! 🚀</h2>
                    <p style="color: #334155; font-size: 16px;">Olá <strong>${firstName}</strong>,</p>
                    <p style="color: #475569; line-height: 1.6;">Obrigado por se juntar a nós. Estamos prontos para ajudar a sua empresa a brilhar nas avaliações online.</p>
                    <p style="color: #475569;">Para começar, confirme o seu email clicando no botão abaixo:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: ${BRAND_COLOR}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Verificar Email
                    </a>
                    </div>
                    
                    <p style="font-size: 13px; color: #94a3b8; margin-top: 30px;">Se o botão não funcionar, copie este link: <br> ${verificationUrl}</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
                    © ${new Date().getFullYear()} Responder Já. Todos os direitos reservados.
                </div>
                </div>
            `
            });
            console.log(`📧 Email de verificação enviado para ${email}`);
        } else {
            console.warn("⚠️ SENDGRID_API_KEY não configurada. Email não enviado.");
            console.log(`🔗 Link (DEV): ${verificationUrl}`);
        }

      } catch (emailError) {
        console.error("💥 Erro ao enviar email:", emailError);
        // Continue registration even if email fails
      }

      res.status(201).json({ 
        message: "Conta criada! Verifique o seu email para ativar a conta.",
        email: email 
      });

    } catch (error: any) {
      console.error("💥 Erro no registo:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(400).json({ message: "Erro ao criar conta" });
    }
  });

  // =====================================
  // VERIFICAÇÃO DE EMAIL
  // =====================================
  app.get("/api/auth/verify-email", async (req: any, res: any) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.redirect('/login?error=invalid_token');
      }

      const user = await storage.getUserByEmailVerificationToken(token as string);
      if (!user) {
        return res.redirect('/login?error=invalid_token');
      }

      // Verify email & clean token
      // Nota: Assegure-se que o storage suporta verifyUserEmail ou implemente update
      // await storage.verifyUserEmail(user.id);
      await storage.updateUser(user.id, { 
          emailVerified: true, 
          emailVerificationToken: null,
          credits: user.credits + 5 // Bonus credits for verification
      });

      console.log(`✅ Email verificado para utilizador: ${user.email}`);
      res.redirect('/login?verified=true');

    } catch (error) {
      console.error("💥 Erro na verificação:", error);
      res.redirect('/login?error=verification_failed');
    }
  });

  // =====================================
  // RECUPERAÇÃO DE PASSWORD (FLUXO ÚNICO)
  // =====================================
  
  // 1. Solicitar Reset
  app.post("/api/auth/forgot-password", async (req: any, res: any) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const { email } = validatedData;

      const user = await storage.getUserByEmail(email);
      
      // Security: Always return success message to prevent email enumeration
      if (!user) {
        console.log(`ℹ️ Pedido de reset para email inexistente: ${email}`);
        return res.json({ message: "Se o email existir, receberá instruções em breve." });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setPasswordResetToken(user.id, resetToken, resetExpires);

      if (process.env.SENDGRID_API_KEY) {
          const resetUrl = urlBuilder.buildAppURL(`/reset-password?token=${resetToken}`, req);
          
          await mailService.send({
            to: email,
            from: 'noreply@responderja.com',
            subject: 'Recuperação de Password',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: ${BRAND_COLOR};">Recuperação de Acesso</h2>
                <p>Olá ${user.firstName},</p>
                <p>Recebemos um pedido para alterar a password da sua conta.</p>
                <a href="${resetUrl}" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                    Criar Nova Password
                </a>
                <p style="font-size: 12px; color: #666;">Se não pediu esta alteração, ignore este email.</p>
                </div>
            `
          });
      }

      res.json({ message: "Se o email existir, receberá instruções em breve." });

    } catch (error) {
      console.error("💥 Erro no forgot-password:", error);
      res.status(400).json({ message: "Pedido inválido" });
    }
  });

  // 2. Confirmar Reset (Unificado)
  app.post("/api/auth/reset-password", async (req: any, res: any) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const { token, password } = validatedData;

      console.log(`🔄 Tentativa de reset de password com token.`);

      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Token inválido ou expirado." });
      }

      // Validate expiration
      if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "O token expirou. Peça um novo link." });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Update password & clear token
      await storage.resetUserPassword(user.id, hashedPassword);
      // Clean up token explicitly just in case storage implementation varies
      await storage.setPasswordResetToken(user.id, null, null);

      console.log(`✅ Password alterada com sucesso para user ID: ${user.id}`);
      res.json({ message: "Password alterada com sucesso! Pode entrar agora." });

    } catch (error: any) {
      console.error("💥 Erro no reset-password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "A password não cumpre os requisitos de segurança." });
      }
      res.status(400).json({ message: "Erro ao alterar password." });
    }
  });

  // =====================================
  // UTILITÁRIOS
  // =====================================

  app.get("/api/auth/user", (req: any, res: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    // Return user without sensitive data
    // @ts-ignore
    const { password, ...safeUser } = req.user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req: any, res: any) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro interno" });
      }
      res.json({ message: "Sessão terminada" });
    });
  });
}