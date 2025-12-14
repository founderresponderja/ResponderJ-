
import type { Express } from "express";
import { corporateSocialService } from "../services/corporate-social-service";
import { storage } from "../storage";
import { requireAuth } from "../auth";

export function registerCorporateSocialRoutes(app: Express) {
  // Listar configurações das plataformas disponíveis
  app.get("/api/admin/corporate-social/platforms", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const platforms = corporateSocialService.getPlatformConfigs();
      res.json(platforms);
    } catch (error) {
      console.error("Erro ao obter plataformas:", error);
      res.status(500).json({ 
        message: "Erro ao obter plataformas",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Obter contas corporativas conectadas
  app.get("/api/admin/corporate-social/accounts", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const accounts = await storage.getCorporateSocialAccounts();
      
      // Remover tokens sensíveis antes de enviar
      const safeAccounts = accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        username: account.username,
        isConnected: account.isConnected,
        followerCount: account.followerCount,
        isActive: account.isActive,
        lastSync: account.lastSync,
        connectedAt: account.createdAt,
        profileImageUrl: account.profileImageUrl
      }));

      res.json(safeAccounts);
    } catch (error) {
      console.error("Erro ao obter contas corporativas:", error);
      res.status(500).json({ 
        message: "Erro ao obter contas corporativas",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Iniciar conexão OAuth para uma plataforma
  app.post("/api/admin/corporate-social/connect/:platform", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { platform } = req.params;
      const redirectUri = `${req.protocol}://${req.headers.host}/api/admin/corporate-social/callback/${platform}`;
      const state = `admin_${platform}_${Date.now()}`;

      const authUrl = corporateSocialService.generateAuthUrl(platform, redirectUri, state);
      
      res.json({ authUrl, state });
    } catch (error) {
      console.error("Erro ao gerar URL de autorização:", error);
      res.status(500).json({ 
        message: "Erro ao iniciar conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Callback OAuth para conectar plataforma
  app.get("/api/admin/corporate-social/callback/:platform", async (req, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      if (error) {
        console.error(`Erro no callback ${platform}:`, error);
        return res.redirect(`/admin?error=social_auth_failed&platform=${platform}&message=${encodeURIComponent(error as string)}`);
      }

      if (!code || !state) {
        return res.redirect(`/admin?error=social_auth_failed&platform=${platform}&message=Parâmetros inválidos`);
      }

      // Validar estado
      if (!(state as string).startsWith('admin_')) {
        return res.redirect(`/admin?error=social_auth_failed&platform=${platform}&message=Estado inválido`);
      }

      const redirectUri = `${req.protocol}://${req.headers.host}/api/admin/corporate-social/callback/${platform}`;
      
      // Trocar código por tokens
      const credentials = await corporateSocialService.exchangeCodeForToken(platform, code as string, redirectUri);
      
      // Obter informações da conta
      const accountInfo = await corporateSocialService.getPlatformInfo(platform, credentials.accessToken);
      
      // Encriptar credenciais
      const encryptedCredentials = corporateSocialService.encryptCredentials(credentials);
      
      // Guardar conta na base de dados
      await storage.saveCorporateSocialAccount({
        platform: platform,
        username: accountInfo.username,
        accessToken: encryptedCredentials,
        refreshToken: credentials.refreshToken ? corporateSocialService.encryptCredentials({ refreshToken: credentials.refreshToken }) : null,
        tokenExpiresAt: credentials.expiresAt,
        followerCount: accountInfo.followerCount,
        isConnected: true,
        isActive: true,
        profileImageUrl: accountInfo.profileImageUrl,
        lastSync: new Date()
      });

      res.redirect(`/admin?success=social_connected&platform=${platform}&username=${accountInfo.username}`);
    } catch (error) {
      console.error(`Erro no callback ${req.params.platform}:`, error);
      res.redirect(`/admin?error=social_auth_failed&platform=${req.params.platform}&message=${encodeURIComponent(error instanceof Error ? error.message : "Erro desconhecido")}`);
    }
  });

  // Publicar conteúdo em múltiplas plataformas
  app.post("/api/admin/corporate-social/publish", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { text, images, video, platforms, scheduledFor } = req.body;

      if (!text && !images && !video) {
        return res.status(400).json({ message: "É necessário pelo menos texto, imagem ou vídeo" });
      }

      if (!platforms || platforms.length === 0) {
        return res.status(400).json({ message: "Selecione pelo menos uma plataforma" });
      }

      // Obter credenciais das plataformas selecionadas
      const accounts = await storage.getCorporateSocialAccountsByPlatforms(platforms);
      
      if (accounts.length === 0) {
        return res.status(400).json({ message: "Nenhuma conta conectada para as plataformas selecionadas" });
      }

      const platformCredentials: Record<string, string> = {};
      accounts.forEach(account => {
        platformCredentials[account.platform] = account.accessToken;
      });

      const postContent = {
        text,
        images,
        video,
        platforms,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      };

      // Publicar em todas as plataformas
      const results = await corporateSocialService.publishToMultiplePlatforms(postContent, platformCredentials);

      // Registar publicação na base de dados
      await storage.createCorporatePost({
        content: text,
        mediaUrls: [...(images || []), ...(video ? [video] : [])],
        platforms: platforms,
        publishResults: results,
        scheduledFor: postContent.scheduledFor,
        publishedAt: new Date(),
        createdBy: req.user?.claims?.sub || req.user?.id
      });

      res.json({
        success: true,
        results: results,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      });
    } catch (error) {
      console.error("Erro ao publicar conteúdo:", error);
      res.status(500).json({ 
        message: "Erro ao publicar conteúdo",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Sincronizar dados de uma conta
  app.post("/api/admin/corporate-social/sync/:accountId", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { accountId } = req.params;
      const account = await storage.getCorporateSocialAccount(accountId);
      
      if (!account) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }

      const credentials = corporateSocialService.decryptCredentials(account.accessToken);
      const accountInfo = await corporateSocialService.getPlatformInfo(account.platform, credentials.accessToken);

      // Atualizar informações da conta
      await storage.updateCorporateSocialAccount(accountId, {
        username: accountInfo.username,
        followerCount: accountInfo.followerCount,
        profileImageUrl: accountInfo.profileImageUrl,
        lastSync: new Date()
      });

      res.json({ 
        success: true, 
        message: "Conta sincronizada com sucesso",
        accountInfo 
      });
    } catch (error) {
      console.error("Erro ao sincronizar conta:", error);
      res.status(500).json({ 
        message: "Erro ao sincronizar conta",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Desconectar conta
  app.delete("/api/admin/corporate-social/accounts/:accountId", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { accountId } = req.params;
      await storage.deleteCorporateSocialAccount(accountId);

      res.json({ success: true, message: "Conta desconectada com sucesso" });
    } catch (error) {
      console.error("Erro ao desconectar conta:", error);
      res.status(500).json({ 
        message: "Erro ao desconectar conta",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Obter histórico de publicações
  app.get("/api/admin/corporate-social/posts", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { page = 1, limit = 20 } = req.query;
      const posts = await storage.getCorporatePosts({
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json(posts);
    } catch (error) {
      console.error("Erro ao obter histórico de posts:", error);
      res.status(500).json({ 
        message: "Erro ao obter histórico de posts",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Obter estatísticas das redes sociais corporativas
  app.get("/api/admin/corporate-social/stats", requireAuth, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const stats = await storage.getCorporateSocialStats();
      res.json(stats);
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({ 
        message: "Erro ao obter estatísticas",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
}
