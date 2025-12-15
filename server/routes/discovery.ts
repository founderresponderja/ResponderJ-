
import type { Express } from "express";
import { requireAuth } from "../auth";
import { GoogleGenAI, Type } from "@google/genai";

// Configuração da Google GenAI para análise de negócios
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface BusinessLead {
  id: string;
  name: string;
  businessType: string;
  category: string;
  phone?: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  aiScore: number;
  potentialValue: "baixo" | "médio" | "alto";
  lastUpdated: string;
}

interface SearchCriteria {
  businessType: string;
  location: string;
  region: string;
  radius: number;
  minRating?: number;
  keywords?: string;
  excludeExisting: boolean;
  timeFrame: string; // "1month", "3months", "6months", "1year"
  includeSocialMedia: boolean;
  includeNewRegistrations: boolean;
}

export function registerDiscoveryRoutes(app: any) {

  // Rota para descobrir negócios
  app.post('/api/discovery/discover', requireAuth, async (req: any, res: any) => {
    try {
      const criteria: SearchCriteria = req.body;

      // Validar critérios obrigatórios
      if (!criteria.businessType || !criteria.region) {
        return res.status(400).json({
          success: false,
          message: "Tipo de negócio e região são obrigatórios"
        });
      }

      // Descobrir negócios com IA (Simulado + Gemini Analysis)
      const discoveredBusinesses = await discoverBusinessesWithAI(criteria);

      res.json({
        success: true,
        businesses: discoveredBusinesses,
        searchCriteria: criteria,
        totalFound: discoveredBusinesses.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Erro na descoberta de negócios:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para exportar negócios descobertos em CSV
  app.post('/api/discovery/export', requireAuth, async (req: any, res: any) => {
    try {
      const { leads } = req.body;

      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      // Gerar CSV
      const csvContent = generateCSV(leads);

      // Configurar headers para download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="negocios-descobertos-${new Date().toISOString().split('T')[0]}.csv"`);
      
      // Adicionar BOM para UTF-8 e enviar
      res.send('\ufeff' + csvContent);

    } catch (error) {
      console.error("Erro na exportação CSV:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor"
      });
    }
  });

  // Rota para obter estatísticas de descoberta
  app.get('/api/discovery/stats', requireAuth, async (req: any, res: any) => {
    try {
      // Na implementação real, buscaria estatísticas da base de dados
      const stats = {
        totalDiscovered: 1247,
        thisMonth: 89,
        conversionRate: 12.5,
        topPerformingTypes: [
          { type: "restaurant", count: 456, conversionRate: 15.2 },
          { type: "accommodation", count: 342, conversionRate: 18.7 },
          { type: "retail", count: 289, conversionRate: 8.9 }
        ],
        recentDiscoveries: [
          {
            name: "Restaurante Marisqueira do Porto",
            type: "restaurant",
            aiScore: 92,
            discoveredAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            name: "Quinta das Oliveiras",
            type: "accommodation", 
            aiScore: 88,
            discoveredAt: new Date(Date.now() - 172800000).toISOString()
          }
        ]
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor"
      });
    }
  });
}

/**
 * Descobre negócios recém-criados usando IA
 * Varre internet, redes sociais e registos empresariais para encontrar novos negócios no prazo especificado
 */
async function discoverBusinessesWithAI(criteria: SearchCriteria): Promise<BusinessLead[]> {
  // Calcular data de criação baseada no timeFrame
  const now = new Date();
  let createdAfter: Date;
  
  switch (criteria.timeFrame) {
    case "1month": createdAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "3months": createdAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    case "6months": createdAfter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
    case "1year": createdAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    default: createdAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  // Dados simulados de negócios descobertos baseados na região e tipo
  // Em produção, isto conectaria a APIs de Google Maps, Facebook Graph API, etc.
  const businessTypes: Record<string, any> = {
    restaurant: {
      categories: ["Restaurante", "Pizzaria", "Café", "Pastelaria", "Churrasqueira", "Marisqueira"],
      businesses: [
        {
          name: "Restaurante O Tradicional",
          category: "Restaurante Tradicional",
          phone: "+351 234 567 890",
          email: "geral@otradicional.pt",
          website: "https://otradicional.pt",
          address: "Rua da Liberdade, 45",
          rating: 4.2,
          reviewCount: 87,
          description: "Restaurante familiar com pratos tradicionais portugueses. Aberto recentemente.",
          aiScore: 85,
          createdDate: new Date(now.getTime() - Math.random() * (now.getTime() - createdAfter.getTime())),
        },
        {
          name: "Pizzaria Bella Vista",
          category: "Pizzaria",
          phone: "+351 234 567 891",
          website: "https://bellavista.pt",
          address: "Avenida Central, 123",
          rating: 4.5,
          reviewCount: 156,
          description: "Pizzaria italiana autêntica com forno a lenha. Negócio jovem em crescimento.",
          aiScore: 92,
          createdDate: new Date(now.getTime() - Math.random() * (now.getTime() - createdAfter.getTime())),
        },
        {
          name: "Café Central",
          category: "Café",
          phone: "+351 234 567 892",
          email: "info@cafecentral.pt",
          address: "Praça da República, 12",
          rating: 4.0,
          reviewCount: 203,
          description: "Café tradicional no centro da cidade",
          aiScore: 78,
          createdDate: new Date(now.getTime() - Math.random() * (now.getTime() - createdAfter.getTime())),
        }
      ]
    },
    accommodation: {
      categories: ["Alojamento Local", "Casa de Campo", "Apartamento", "Quinta Rural"],
      businesses: [
        {
          name: "Casa da Quinta",
          category: "Alojamento Local",
          phone: "+351 234 567 893",
          email: "reservas@casadaquinta.pt",
          website: "https://casadaquinta.pt",
          address: "Estrada Nacional 234, Km 15",
          rating: 4.8,
          reviewCount: 94,
          description: "Casa rural com vista para as montanhas",
          aiScore: 94
        },
        {
          name: "Apartamentos do Centro",
          category: "Apartamento",
          phone: "+351 234 567 894",
          email: "info@apartamentoscentro.pt",
          address: "Rua do Comércio, 78",
          rating: 4.3,
          reviewCount: 67,
          description: "Apartamentos modernos no centro histórico",
          aiScore: 89
        }
      ]
    }
  };

  // Fallback para tipos genéricos
  const typeData = businessTypes[criteria.businessType] || businessTypes.restaurant;

  // Gerar leads baseados nos critérios
  const discoveredBusinesses: BusinessLead[] = typeData.businesses.map((business: any, index: number) => {
    return {
      id: `${criteria.businessType}_${index}_${Date.now()}`,
      businessType: criteria.businessType,
      name: business.name,
      category: business.category,
      phone: business.phone,
      email: business.email,
      website: business.website,
      address: business.address,
      city: criteria.location || criteria.region,
      region: criteria.region || "Portugal",
      rating: business.rating,
      reviewCount: business.reviewCount,
      description: business.description,
      aiScore: business.aiScore,
      potentialValue: business.aiScore > 90 ? "alto" : business.aiScore > 80 ? "médio" : "baixo",
      lastUpdated: new Date().toISOString(),
      socialMedia: criteria.includeSocialMedia ? {
        facebook: Math.random() > 0.5 ? `https://facebook.com/${business.name.toLowerCase().replace(/\s+/g, '')}` : undefined,
        instagram: Math.random() > 0.6 ? `@${business.name.toLowerCase().replace(/\s+/g, '')}` : undefined
      } : undefined
    };
  });

  // Filtrar por avaliação mínima se especificada
  let filteredBusinesses = discoveredBusinesses;
  if (criteria.minRating) {
    filteredBusinesses = discoveredBusinesses.filter(b => 
      b.rating && b.rating >= criteria.minRating!
    );
  }

  // Usar IA para analisar e ranquear os negócios se a chave estiver configurada
  // Verifica process.env.API_KEY (Gemini) em vez de OPENAI_API_KEY
  if (process.env.API_KEY) {
    return await enhanceWithAIAnalysis(filteredBusinesses, criteria);
  }

  return filteredBusinesses;
}

/**
 * Usa IA (Gemini) para analisar e melhorar a qualificação dos leads
 */
async function enhanceWithAIAnalysis(businesses: BusinessLead[], criteria: SearchCriteria): Promise<BusinessLead[]> {
  try {
    // Preparar dados para análise da IA
    const businessData = businesses.map(b => ({
      name: b.name,
      category: b.category,
      rating: b.rating,
      reviewCount: b.reviewCount,
      description: b.description,
      hasWebsite: !!b.website,
      hasEmail: !!b.email,
      hasSocialMedia: !!(b.socialMedia?.facebook || b.socialMedia?.instagram)
    }));

    const aiPrompt = `
Analisa os seguintes negócios RECÉM-CRIADOS e classifica-os como potenciais clientes para uma plataforma de gestão de comunicação digital e IA para respostas automáticas.

Contexto de pesquisa:
- Região: ${criteria.region}
- Tipo de negócio: ${criteria.businessType}
- Prazo de criação: ${criteria.timeFrame}

Critérios de avaliação especiais para negócios novos:
- Urgência de estabelecer presença digital
- Potencial de crescimento rápido
- Necessidade de gestão de reputação online

Negócios para analisar:
${JSON.stringify(businessData)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            businesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  businessIndex: { type: Type.INTEGER, description: "Índice do negócio no array original" },
                  aiScore: { type: Type.INTEGER, description: "Pontuação de 60 a 100" },
                  potentialValue: { type: Type.STRING, enum: ["baixo", "médio", "alto"] },
                  reasoning: { type: Type.STRING, description: "Breve explicação do potencial" }
                },
                required: ["businessIndex", "aiScore", "potentialValue", "reasoning"]
              }
            }
          }
        }
      }
    });

    const aiAnalysis = JSON.parse(response.text || "{}");
    
    // Aplicar análise da IA aos negócios
    if (aiAnalysis.businesses && Array.isArray(aiAnalysis.businesses)) {
      aiAnalysis.businesses.forEach((analysis: any) => {
        if (analysis.businessIndex < businesses.length) {
          const business = businesses[analysis.businessIndex];
          business.aiScore = analysis.aiScore;
          business.potentialValue = analysis.potentialValue;
          
          if (!business.description) {
            business.description = analysis.reasoning;
          }
        }
      });
    }

    return businesses.sort((a, b) => b.aiScore - a.aiScore);

  } catch (error) {
    console.error("Erro na análise de IA:", error);
    return businesses;
  }
}

/**
 * Gera CSV dos negócios descobertos
 */
function generateCSV(businesses: BusinessLead[]): string {
  const headers = [
    "Nome",
    "Tipo de Negócio",
    "Categoria",
    "Telefone",
    "Email",
    "Website",
    "Morada",
    "Cidade",
    "Score IA",
    "Potencial",
    "Facebook",
    "Instagram"
  ];

  const rows = businesses.map(business => [
    business.name,
    business.businessType,
    business.category,
    business.phone || "",
    business.email || "",
    business.website || "",
    business.address,
    business.city,
    business.aiScore.toString(),
    business.potentialValue,
    business.socialMedia?.facebook || "",
    business.socialMedia?.instagram || ""
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}