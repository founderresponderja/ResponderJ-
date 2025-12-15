import { OAuth2Client } from 'google-auth-library';
import { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { urlBuilder } from "./utils";

// =====================================
// CONFIGURAÇÃO GOOGLE OAUTH
// =====================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = urlBuilder.buildAppURL('/api/auth/google/callback');

let client: OAuth2Client | null = null;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALLBACK_URL);
  console.log("✅ Google Auth configurado com sucesso.");
} else {
  console.warn("⚠️ AVISO: Variáveis GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não definidas. Login Google desativado.");
}

export function setupGoogleAuth(app: any) {
  
  // 1. Redirecionar para Google
  app.get("/api/auth/google", (req: any, res: any) => {
    if (!client) {
      return res.status(503).send("Login com Google não configurado neste servidor.");
    }

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      prompt: 'consent'
    });
    
    res.redirect(authorizeUrl);
  });

  // 2. Callback do Google
  app.get("/api/auth/google/callback", async (req: any, res: any) => {
    if (!client) {
      return res.redirect('/login?error=server_configuration');
    }

    try {
      const { code } = req.query;
      
      if (!code) {
        return res.redirect('/login?error=google_no_code');
      }

      // Trocar código por tokens
      const { tokens } = await client.getToken(code as string);
      client.setCredentials(tokens);

      // Obter identidade do utilizador
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return res.redirect('/login?error=google_invalid_token');
      }

      const { sub, email, given_name, family_name, picture } = payload;

      if (!email) {
        return res.redirect('/login?error=google_no_email');
      }

      console.log(`🌐 Google Auth Callback recebido para: ${email}`);

      // Verificar se utilizador existe
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`🆕 Criando novo utilizador via Google: ${email}`);
        
        // Gerar password segura aleatória (já que o login é via Google)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 14);

        // Criar utilizador respeitando o schema do classicAuth/auth
        user = await storage.createUser({
          email: email,
          password: hashedPassword,
          firstName: given_name || 'Google',
          lastName: family_name || 'User',
          phone: "", // Opcional
          companyName: "Google Account", // Placeholder
          nif: "", // Opcional
          credits: 10, // Créditos Trial
          emailVerified: true, // Email vem verificado do Google
          emailVerificationToken: null,
          isActive: true,
          isAdmin: false,
          isSuperAdmin: false,
          role: "user"
        });

        // Registo de auditoria
        await storage.createAuditLog({
          userId: user.id,
          action: "register_google",
          entity: "user",
          entityId: user.id,
          description: "Registo via Google OAuth",
          severity: "info",
        });

      } else {
        // Utilizador já existe
        if (!user.isActive) {
           return res.redirect('/login?error=account_suspended');
        }

        // Atualizar last login
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        console.log(`👋 Utilizador Google retornou: ${email}`);
      }

      // Criar sessão Passport
      req.login(user, (err: any) => {
        if (err) {
          console.error("💥 Erro ao criar sessão Google:", err);
          return res.redirect('/login?error=session_error');
        }
        
        // Redirecionar para a app principal
        // O frontend deve verificar a sessão (/api/auth/user) ao carregar
        res.redirect('/');
      });

    } catch (error) {
      console.error("💥 Erro crítico no Google Auth:", error);
      res.redirect('/login?error=auth_failed');
    }
  });
}