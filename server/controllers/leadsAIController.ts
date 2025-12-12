import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";

// Schema de validação para pesquisa AI
const aiSearchSchema = z.object({
  region: z.string().optional(),
  businessType: z.string().optional(),
  platforms: z.array(z.string()).default(['facebook', 'instagram', 'google', 'linkedin']),
  limit: z.number().min(1).max(500).default(100),
});

export class LeadsAIController {
  // Pesquisa AI de leads nas redes sociais
  static async aiSearch(req: Request, res: Response) {
    try {
      const result = aiSearchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Dados inválidos", details: result.error });
      }

      const { region, businessType, platforms, limit } = result.data;
      
      // Simular pesquisa AI (integração com APIs reais seria implementada aqui)
      const mockLeads = await generateMockAILeads({ region, businessType, platforms, limit });
      
      // Filtrar leads que já existem
      const filteredLeads = [];
      let filteredCount = 0;

      for (const lead of mockLeads) {
        const exists = await storage.checkLeadExists(lead.email);
        if (!exists) {
          filteredLeads.push(lead);
        } else {
          filteredCount++;
        }
      }
      
      res.json({
        leads: filteredLeads,
        searchParams: { region, businessType, platforms },
        total: filteredLeads.length,
        filtered: filteredCount,
      });
    } catch (error) {
      console.error("Erro na pesquisa AI:", error);
      res.status(500).json({ error: "Erro interno na pesquisa AI" });
    }
  }

  // Importar leads da pesquisa AI
  static async importAIResults(req: Request, res: Response) {
    try {
      const { leads } = req.body;
      
      if (!Array.isArray(leads)) {
        return res.status(400).json({ error: 'Leads deve ser um array' });
      }
      
      const results = {
        imported: 0,
        skipped: 0,
        errors: 0
      };

      const errorsList: string[] = [];

      // Processamento em lote
      await Promise.all(leads.map(async (leadData: any) => {
        try {
          // Validar existência
          const exists = await storage.checkLeadExists(leadData.email);
          
          if (exists) {
            results.skipped++;
            return;
          }

          // Criar lead com defaults
          await storage.createLead({
            companyName: leadData.companyName,
            contactName: leadData.contactName || '',
            email: leadData.email,
            phone: leadData.phone || '',
            website: leadData.website || '',
            industry: leadData.industry || '',
            region: leadData.region || '',
            businessType: leadData.businessType || '',
            source: 'ai_search',
            status: 'novo',
            emailStatus: 'pending',
          });
          
          results.imported++;
        } catch (err) {
          results.errors++;
          errorsList.push(`Erro ao importar ${leadData.email}: ${(err as Error).message}`);
        }
      }));
      
      res.json({
        ...results,
        details: errorsList.length > 0 ? errorsList : undefined
      });
    } catch (error) {
      console.error("Erro ao importar resultados AI:", error);
      res.status(500).json({ error: "Erro interno ao processar importação" });
    }
  }
}

// Gerar leads mock para simulação da pesquisa AI
async function generateMockAILeads({ region, businessType, platforms, limit }: any) {
  const mockBusinesses = [
    'Restaurante Central', 'Hotel Mar Azul', 'Café da Esquina', 'Pizzaria Napoli',
    'Pensão do Centro', 'Bistro Moderno', 'Taberna Tradicional', 'Pastelaria Doce',
    'Marisqueira Atlântico', 'Quinta Rural', 'SPA & Wellness', 'Casa de Chá'
  ];
  
  const leads = [];
  // Garantir que limit é um número
  const max = typeof limit === 'number' ? limit : 50;
  
  for (let i = 0; i < Math.min(max, 50); i++) {
    const businessName = mockBusinesses[i % mockBusinesses.length];
    // Gerar string aleatória para evitar duplicatas em testes repetidos
    const randomSuffix = Math.floor(Math.random() * 10000);
    
    leads.push({
      companyName: `${businessName} ${i + 1}`,
      contactName: `Contacto ${i + 1}`,
      email: `contacto${i + 1}_${randomSuffix}@${businessName.toLowerCase().replace(/\s+/g, '')}.pt`,
      phone: `+351 ${200000000 + i}`,
      website: `https://${businessName.toLowerCase().replace(/\s+/g, '')}.pt`,
      industry: businessType || 'Restauração',
      region: region || 'Lisboa',
      businessType: businessType || 'Restaurante',
      aiConfidence: (0.7 + Math.random() * 0.3).toFixed(2),
      leadScore: Math.floor(60 + Math.random() * 40),
    });
  }
  
  return leads;
}