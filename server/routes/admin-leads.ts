
import type { Express } from "express";
import { isAdminMiddleware } from "../middleware/auth";
import { LeadsController } from "../controllers/leadsController";
import { LeadsAIController } from "../controllers/leadsAIController";
import { LeadsCSVController } from "../controllers/leadsCSVController";
import { LeadsEmailController } from "../controllers/leadsEmailController";

export function registerAdminLeadsRoutes(app: any) {
  
  // === GESTÃO DE LEADS ===
  
  // Listar leads com paginação, filtros e pesquisa
  app.get('/api/admin/leads', isAdminMiddleware, LeadsController.getLeads);
  
  // Criar novo lead
  app.post('/api/admin/leads', isAdminMiddleware, LeadsController.createLead);
  
  // Atualizar lead
  app.put('/api/admin/leads/:id', isAdminMiddleware, LeadsController.updateLead);
  
  // Eliminar lead
  app.delete('/api/admin/leads/:id', isAdminMiddleware, LeadsController.deleteLead);
  
  // Atualizar status do lead
  app.patch('/api/admin/leads/:id/status', isAdminMiddleware, LeadsController.updateLeadStatus);
  
  // Obter estatísticas de leads
  app.get('/api/admin/leads/stats', isAdminMiddleware, LeadsController.getLeadsStats);

  // === PESQUISA AI ===
  
  // Pesquisa AI de leads nas redes sociais
  app.post('/api/admin/leads/ai-search', isAdminMiddleware, LeadsAIController.aiSearch);
  
  // Importar leads da pesquisa AI
  app.post('/api/admin/leads/import-ai-results', isAdminMiddleware, LeadsAIController.importAIResults);

  // === IMPORTAÇÃO/EXPORTAÇÃO CSV ===
  
  // Upload e processamento de CSV
  app.post('/api/admin/leads/upload-csv', isAdminMiddleware, LeadsCSVController.uploadCSV);
  
  // Importar leads de CSV
  app.post('/api/admin/leads/import-csv', isAdminMiddleware, LeadsCSVController.importCSV);
  
  // Exportar leads para CSV
  app.get('/api/admin/leads/export-csv', isAdminMiddleware, LeadsCSVController.exportCSV);

  // === EMAIL AUTOMATION ===
  
  // Processar sequência de emails automáticos
  app.post('/api/admin/leads/process-email-sequence', isAdminMiddleware, LeadsEmailController.processEmailSequence);
  
  // Enviar emails de boas-vindas para novos leads
  app.post('/api/admin/leads/send-welcome-emails', isAdminMiddleware, LeadsEmailController.sendWelcomeEmails);

  // === CAMPANHAS (Simplificado) ===
  
  // Listar campanhas
  app.get('/api/admin/leads/campaigns', isAdminMiddleware, async (req: any, res: any) => {
    try {
      // Retorna lista vazia por enquanto (pode ser implementado depois)
      res.json({ campaigns: [] });
    } catch (error) {
      console.error('❌ Erro ao obter campanhas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
  
  // Criar campanha
  app.post('/api/admin/leads/campaigns', isAdminMiddleware, async (req: any, res: any) => {
    try {
      const { name, subject, emailTemplate } = req.body;
      
      // Simular criação de campanha
      const campaign = {
        id: Date.now().toString(),
        name,
        subject,
        emailTemplate,
        status: 'draft',
        sentCount: 0,
        openCount: 0,
        createdAt: new Date(),
      };
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error('❌ Erro ao criar campanha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
  
  // Enviar campanha
  app.post('/api/admin/leads/campaigns/:id/send', isAdminMiddleware, async (req: any, res: any) => {
    try {
      // Simular envio de campanha
      const sentCount = Math.floor(Math.random() * 50) + 10;
      
      res.json({ 
        sentCount,
        message: 'Campanha enviada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao enviar campanha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}