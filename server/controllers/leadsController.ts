import type { Request, Response } from "express";
import { storage } from "../storage";
import { ControllerUtils } from "../utils/ControllerUtils";

export class LeadsController {
  // Listar leads com paginação
  static async getLeads(req: Request, res: Response) {
    try {
      const { page, limit, offset } = ControllerUtils.getPaginationParams(req);
      const status = req.query.status as string;
      const search = req.query.search as string;
      
      let leads;
      if (search) {
        leads = await storage.searchLeads(search);
      } else if (status) {
        leads = await storage.getLeadsByStatus(status);
      } else {
        leads = await storage.getLeads(offset, limit);
      }
      
      const totalCount = await storage.getLeadsCount();
      const response = ControllerUtils.createPaginatedResponse(leads, page, limit, totalCount);
      
      res.json({
        leads: response.data,
        pagination: response.pagination
      });
    } catch (error) {
      ControllerUtils.handleError(error, 'ao obter leads', res);
    }
  }

  // Criar novo lead
  static async createLead(req: Request, res: Response) {
    try {
      const leadData = req.body;
      
      // Verificar se já existe
      const exists = await ControllerUtils.validateLeadExists(leadData.email);
      if (exists) {
        return res.status(409).json({ error: 'Email já existe como lead ou cliente' });
      }
      
      const lead = await ControllerUtils.createLeadWithDefaults(leadData, 'manual');
      res.status(201).json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao criar lead', res);
    }
  }

  // Atualizar lead
  static async updateLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const lead = await storage.updateLead(id, updateData);
      res.json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao atualizar lead', res);
    }
  }

  // Eliminar lead
  static async deleteLead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await storage.deleteLead(id);
      res.status(204).send();
    } catch (error) {
      ControllerUtils.handleError(error, 'ao eliminar lead', res);
    }
  }

  // Atualizar status do lead
  static async updateLeadStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const lead = await storage.updateLead(id, { status });
      res.json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao atualizar status do lead', res);
    }
  }

  // Obter estatísticas de leads
  static async getLeadsStats(req: Request, res: Response) {
    try {
      const total = await storage.getLeadsCount();
      
      const statusStats = {
        novo: (await storage.getLeadsByStatus('novo')).length,
        contactado: (await storage.getLeadsByStatus('contactado')).length,
        interessado: (await storage.getLeadsByStatus('interessado')).length,
        convertido: (await storage.getLeadsByStatus('convertido')).length,
        descartado: (await storage.getLeadsByStatus('descartado')).length,
      };
      
      const nonClients = statusStats.novo + statusStats.contactado + statusStats.interessado + statusStats.descartado;
      
      res.json({
        total,
        nonClients,
        byStatus: statusStats,
      });
    } catch (error) {
      ControllerUtils.handleError(error, 'ao obter estatísticas', res);
    }
  }
}