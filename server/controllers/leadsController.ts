import type { Request, Response } from "express";
import { storage } from "../storage";
import { ControllerUtils, AppError } from "../utils/ControllerUtils";

export class LeadsController {
  // Listar leads com paginação
  static async getLeads(req: any, res: any) {
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
      ControllerUtils.handleError(error, 'ao obter leads', res, req);
    }
  }

  // Criar novo lead
  static async createLead(req: any, res: any) {
    try {
      const leadData = req.body;

      // Validação de formato de email
      if (!ControllerUtils.validateEmail(leadData.email)) {
        throw AppError.validation('Formato de email inválido', 'email', leadData.email);
      }
      
      // Verificar se já existe
      const exists = await ControllerUtils.validateLeadExists(leadData.email);
      if (exists) {
        return res.status(409).json({ error: 'Email já existe como lead ou cliente' });
      }
      
      const lead = await ControllerUtils.createLeadWithDefaults(leadData, 'manual');
      res.status(201).json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao criar lead', res, req);
    }
  }

  // Atualizar lead
  static async updateLead(req: any, res: any) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validação de formato de email se estiver a ser atualizado
      if (updateData.email && !ControllerUtils.validateEmail(updateData.email)) {
        throw AppError.validation('Formato de email inválido', 'email', updateData.email);
      }
      
      const lead = await storage.updateLead(id, updateData);
      res.json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao atualizar lead', res, req);
    }
  }

  // Eliminar lead
  static async deleteLead(req: any, res: any) {
    try {
      const { id } = req.params;
      await storage.deleteLead(id);
      res.status(204).send();
    } catch (error) {
      ControllerUtils.handleError(error, 'ao eliminar lead', res, req);
    }
  }

  // Atualizar status do lead
  static async updateLeadStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const lead = await storage.updateLead(id, { status });
      res.json(lead);
    } catch (error) {
      ControllerUtils.handleError(error, 'ao atualizar status do lead', res, req);
    }
  }

  // Obter estatísticas de leads
  static async getLeadsStats(req: any, res: any) {
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
      ControllerUtils.handleError(error, 'ao obter estatísticas', res, req);
    }
  }
}