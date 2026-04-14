import { Router } from "express";
import { requireAuth } from "../auth.js";
import { GoogleGenAI, Type } from "@google/genai";
import { randomUUID } from "crypto";

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Interface para contas de redes sociais
interface SocialMediaAccount {
  id: string;
  platform: "facebook" | "instagram";
  accountName: string;
  accountHandle: string;
  isActive: boolean;
  followers: number;
  profileImageUrl?: string;
}

// Interface para posts
interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  scheduledFor?: string;
  publishedAt?: string;
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
}

// Simular dados de contas conectadas
const mockAccounts: SocialMediaAccount[] = [
  {
    id: "fb-account-1",
    platform: "facebook",
    accountName: "Responder Já - Página Oficial",
    accountHandle: "@responderja",
    isActive: true,
    followers: 15420,
    profileImageUrl: undefined
  },
  {
    id: "ig-account-1",
    platform: "instagram",
    accountName: "responder_ja",
    accountHandle: "@responder_ja",
    isActive: true,
    followers: 8750,
    profileImageUrl: undefined
  }
];

// Simular dados de posts
let mockPosts: Post[] = [
  {
    id: "post-1",
    content: "🚀 Nova funcionalidade no Responder Já! Agora podes gerar respostas ainda mais personalizadas para os teus clientes. #ResponderJa #IA #AtendimentoAoCliente",
    mediaUrls: [],
    publishedAt: "2025-08-22T10:30:00Z",
    platforms: ["facebook", "instagram"],
    status: "published",
    engagement: {
      likes: 124,
      comments: 18,
      shares: 12,
      reach: 2340
    }
  },
  {
    id: "post-2",
    content: "📈 Dica de negócio: Responder rapidamente aos comentários dos clientes aumenta a confiança na tua marca. Com o Responder Já, tens respostas inteligentes em segundos! ⚡",
    mediaUrls: [],
    scheduledFor: "2025-08-23T09:00:00Z",
    platforms: ["facebook"],
    status: "scheduled"
  },
  {
    id: "post-3",
    content: "💡 Sabias que 68% dos consumidores valorizam empresas que respondem rapidamente online? Descobre como o Responder Já te pode ajudar! #DigitalMarketing #CustomerService",
    mediaUrls: [],
    scheduledFor: "2025-08-23T14:30:00Z",
    platforms: ["instagram"],
    status: "scheduled"
  }
];

// Listar contas conectadas
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    res.json(mockAccounts);
  } catch (error) {
    console.error("Erro ao listar contas de redes sociais:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Listar posts
router.get('/posts', requireAuth, async (req, res) => {
  try {
    res.json(mockPosts);
  } catch (error) {
    console.error("Erro ao listar posts:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Criar/Publicar post
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const { content, platforms, isScheduled, scheduledDateTime } = req.body;
    
    if (!content || !platforms || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Conteúdo e plataformas são obrigatórios"
      });
    }

    // Validar plataformas
    const validPlatforms = platforms.filter((p: string) => 
      mockAccounts.some(acc => acc.platform === p)
    );

    if (validPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhuma plataforma válida selecionada"
      });
    }

    // Criar novo post
    const newPost: Post = {
      id: randomUUID(),
      content,
      mediaUrls: [], // TODO: Implementar upload de media
      platforms: validPlatforms,
      status: isScheduled ? "scheduled" : "published",
      scheduledFor: isScheduled ? scheduledDateTime : undefined,
      publishedAt: !isScheduled ? new Date().toISOString() : undefined,
    };

    // Se for publicação imediata, simular engagement
    if (!isScheduled) {
      newPost.engagement = {
        likes: Math.floor(Math.random() * 100) + 10,
        comments: Math.floor(Math.random() * 20) + 2,
        shares: Math.floor(Math.random() * 15) + 1,
        reach: Math.floor(Math.random() * 1000) + 200
      };
    }

    mockPosts.unshift(newPost);

    res.json({
      success: true,
      data: newPost,
      message: isScheduled ? "Post agendado com sucesso" : "Post publicado com sucesso"
    });

  } catch (error) {
    console.error("Erro ao criar post:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Gerar hashtags com IA (Gemini)
router.post('/generate-hashtags', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Conteúdo é obrigatório"
      });
    }

    // Usar Gemini para gerar hashtags relevantes
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analisa o conteúdo fornecido e gera 5-8 hashtags relevantes em português para redes sociais (Facebook e Instagram). 

Critérios:
- Hashtags devem ser em português
- Misturar hashtags populares e específicas
- Incluir hashtags relacionadas com negócios/marketing digital se relevante
- Evitar hashtags muito genéricas
- Máximo 25 caracteres por hashtag

Conteúdo: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    res.json({
      success: true,
      hashtags: result.hashtags || []
    });

  } catch (error) {
    console.error("Erro ao gerar hashtags:", error);
    
    // Fallback hashtags
    const fallbackHashtags = [
      "#business", "#marketing", "#digital", "#portugal", "#sucesso"
    ];
    
    res.json({
      success: true,
      hashtags: fallbackHashtags
    });
  }
});

// Obter analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    // Simular dados de analytics
    const analytics = {
      totalPosts: mockPosts.length,
      totalReach: mockPosts.reduce((sum, post) => sum + (post.engagement?.reach || 0), 0),
      totalEngagement: mockPosts.reduce((sum, post) => 
        sum + (post.engagement?.likes || 0) + (post.engagement?.comments || 0) + (post.engagement?.shares || 0), 0
      ),
      engagementRate: "4.2%",
      facebook: {
        posts: mockPosts.filter(p => p.platforms.includes("facebook")).length,
        reach: 8520,
        likes: 445,
        comments: 89,
        shares: 34
      },
      instagram: {
        posts: mockPosts.filter(p => p.platforms.includes("instagram")).length,
        reach: 6240,
        likes: 692,
        comments: 127,
        shares: 28
      }
    };

    res.json(analytics);

  } catch (error) {
    console.error("Erro ao obter analytics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Cancelar post agendado
router.delete('/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const postIndex = mockPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post não encontrado"
      });
    }

    const post = mockPosts[postIndex];
    if (post.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Apenas posts agendados podem ser cancelados"
      });
    }

    mockPosts.splice(postIndex, 1);

    res.json({
      success: true,
      message: "Post cancelado com sucesso"
    });

  } catch (error) {
    console.error("Erro ao cancelar post:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

export default router;