
import type { Express } from "express";
import { requireAuth } from "../auth";

interface ContentPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  platform: string[];
  scheduledDate: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  contentType: 'text' | 'image' | 'video' | 'article';
  tags: string[];
  engagementTarget?: number;
  estimatedReach?: number;
  createdAt: string;
  publishedAt?: string;
  updatedAt?: string;
}

// Armazenamento temporário em memória (em produção seria na base de dados)
let contentPosts: ContentPost[] = [];

export function registerContentRoutes(app: any) {
  // Listar posts do calendário
  app.get("/api/content/calendar", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const userPosts = contentPosts.filter(post => post.userId === userId);
      res.json(userPosts);
    } catch (error: any) {
      console.error("Erro ao listar posts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Criar novo post
  app.post("/api/content/posts", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const { 
        title, 
        content, 
        platform, 
        contentType, 
        scheduledDate, 
        tags, 
        engagementTarget 
      } = req.body;

      // Calcular alcance estimado baseado no tipo de conteúdo e plataformas
      let estimatedReach = 1000; // Base
      if (contentType === 'video') estimatedReach *= 2.5;
      if (contentType === 'image') estimatedReach *= 1.8;
      if (Array.isArray(platform)) {
          estimatedReach *= platform.length; // Multiplicar pelo número de plataformas
      }

      const newPost: ContentPost = {
        id: Date.now().toString(),
        userId,
        title,
        content,
        platform: Array.isArray(platform) ? platform : [platform],
        scheduledDate,
        status: 'scheduled',
        contentType,
        tags: Array.isArray(tags) ? tags : [],
        engagementTarget,
        estimatedReach: Math.round(estimatedReach),
        createdAt: new Date().toISOString()
      };

      contentPosts.push(newPost);
      res.status(201).json(newPost);
    } catch (error: any) {
      console.error("Erro ao criar post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Actualizar post
  app.patch("/api/content/posts/:id", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const postIndex = contentPosts.findIndex(post => 
        post.id === id && post.userId === userId
      );

      if (postIndex === -1) {
        return res.status(404).json({ error: "Post não encontrado" });
      }

      contentPosts[postIndex] = {
        ...contentPosts[postIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      res.json(contentPosts[postIndex]);
    } catch (error: any) {
      console.error("Erro ao actualizar post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Eliminar post
  app.delete("/api/content/posts/:id", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const postIndex = contentPosts.findIndex(post => 
        post.id === id && post.userId === userId
      );

      if (postIndex === -1) {
        return res.status(404).json({ error: "Post não encontrado" });
      }

      contentPosts.splice(postIndex, 1);
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao eliminar post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Publicar post agendado
  app.post("/api/content/posts/:id/publish", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const postIndex = contentPosts.findIndex(post => 
        post.id === id && post.userId === userId
      );

      if (postIndex === -1) {
        return res.status(404).json({ error: "Post não encontrado" });
      }

      const post = contentPosts[postIndex];

      // Simular publicação nas plataformas
      try {
        // Aqui seria feita a integração real com as APIs das plataformas
        for (const platform of post.platform) {
          console.log(`Publicando "${post.title}" em ${platform}`);
          // await publishToPlatform(platform, post);
        }

        contentPosts[postIndex] = {
          ...post,
          status: 'published',
          publishedAt: new Date().toISOString()
        };

        res.json(contentPosts[postIndex]);
      } catch (publishError) {
        contentPosts[postIndex] = {
          ...post,
          status: 'failed'
        };

        res.status(500).json({ 
          error: "Falha na publicação",
          post: contentPosts[postIndex]
        });
      }
    } catch (error: any) {
      console.error("Erro ao publicar post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Obter estatísticas do calendário
  app.get("/api/content/stats", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const userPosts = contentPosts.filter(post => post.userId === userId);
      
      const stats = {
        total: userPosts.length,
        scheduled: userPosts.filter(p => p.status === 'scheduled').length,
        published: userPosts.filter(p => p.status === 'published').length,
        draft: userPosts.filter(p => p.status === 'draft').length,
        failed: userPosts.filter(p => p.status === 'failed').length,
        totalEstimatedReach: userPosts.reduce((sum, p) => sum + (p.estimatedReach || 0), 0),
        averageEngagementTarget: userPosts.reduce((sum, p) => sum + (p.engagementTarget || 0), 0) / (userPosts.length || 1),
        platformBreakdown: userPosts.reduce((acc: any, post) => {
          post.platform.forEach(platform => {
            acc[platform] = (acc[platform] || 0) + 1;
          });
          return acc;
        }, {}),
        contentTypeBreakdown: userPosts.reduce((acc: any, post) => {
          acc[post.contentType] = (acc[post.contentType] || 0) + 1;
          return acc;
        }, {})
      };

      res.json(stats);
    } catch (error: any) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({ error: error.message });
    }
  });
}