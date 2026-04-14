
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { GoogleGenAI, Type } from "@google/genai";
import { ControllerUtils } from "../utils/ControllerUtils.js";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema de validação para pesquisa AI
const aiSearchSchema = z.object({
  region: z.string().optional(),
  businessType: z.string().optional(),
  platforms: z.array(z.string()).default(['facebook', 'instagram', 'google', 'linkedin']),
  limit: z.number().min(1).max(500).default(100),
});

export class LeadsAIController {
  // Pesquisa AI de leads nas redes sociais
  static async aiSearch(req: any, res: any) {
    try {
      const result = aiSearchSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Dados inválidos", details: result.error });
      }

      const { region, businessType, platforms, limit } = result.data;
      
      // Pesquisa AI Real com Gemini
      const leads = await generateAILeads({ region, businessType, platforms, limit });
      
      // Filtrar leads que já existem
      const filteredLeads = [];
      let filteredCount = 0;

      for (const lead of leads) {
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
      ControllerUtils.handleError(error, 'na pesquisa AI', res, req);
    }
  }

  // Importar leads da pesquisa AI
  static async importAIResults(req: any, res: any) {
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
      ControllerUtils.handleError(error, 'ao importar resultados AI', res, req);
    }
  }
}

// Gerar leads usando Gemini 2.5 Flash
async function generateAILeads({ region, businessType, platforms, limit }: any) {
  const prompt = `
    Generate a list of realistic fictional (or real if you know them) business leads for a sales simulation in the region of "${region}" specifically for "${businessType}".
    
    Context:
    - We are looking for potential clients for a "Review Management Platform".
    - They should be businesses that likely have reviews on ${platforms.join(', ')}.
    - Provide ${Math.min(limit, 15)} detailed leads.
    
    For each lead, generate:
    - Company Name
    - Contact Name (Manager/Owner)
    - Email (generate a realistic email like info@company.pt or manager@company.pt)
    - Phone Number (Portuguese format)
    - Website (optional)
    - Industry/Category
    - AI Confidence Score (0.0 to 1.0 based on how good a fit they are)
    - Lead Score (0-100)
    
    Output strictly valid JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              contactName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              industry: { type: Type.STRING },
              region: { type: Type.STRING },
              businessType: { type: Type.STRING },
              aiConfidence: { type: Type.NUMBER },
              leadScore: { type: Type.INTEGER }
            },
            required: ["companyName", "email", "industry"]
          }
        }
      }
    });

    const leads = JSON.parse(response.text || "[]");
    
    // Add default region/businessType if missing from AI response
    return leads.map((lead: any) => ({
      ...lead,
      region: lead.region || region,
      businessType: lead.businessType || businessType
    }));

  } catch (error) {
    console.error("Error generating leads with Gemini:", error);
    // Fallback to empty array to avoid crash
    return [];
  }
}