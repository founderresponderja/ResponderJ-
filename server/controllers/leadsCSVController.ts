import type { Request, Response } from "express";
import { storage } from "../storage";
import { ControllerUtils } from "../utils/ControllerUtils";

export class LeadsCSVController {
  // Importar leads de CSV
  static async importCSV(req: any, res: any) {
    try {
      const { csvData } = req.body;
      
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ error: 'Dados CSV são obrigatórios' });
      }
      
      const result = await storage.importLeadsFromCSV(csvData);
      res.json(result);
    } catch (error) {
      ControllerUtils.handleError(error, 'na importação CSV', res, req);
    }
  }

  // Exportar leads para CSV
  static async exportCSV(req: any, res: any) {
    try {
      const csvContent = await storage.exportLeadsToCSV();
      
      ControllerUtils.setCSVHeaders(res, 'leads.csv');
      res.send(csvContent);
    } catch (error) {
      ControllerUtils.handleError(error, 'na exportação CSV', res, req);
    }
  }

  // Upload de CSV (simplificado)
  static async uploadCSV(req: any, res: any) {
    try {
      const { csvData, filename } = req.body;
      
      const validation = ControllerUtils.validateRequired({ csvData }, ['csvData']);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Dados CSV são obrigatórios' });
      }
      
      // Processar dados CSV (parse simples por linhas)
      // Nota: em produção usaríamos uma lib como csv-parse, mas aqui fazemos manual
      // Assumindo que csvData é uma string raw
      const lines = (csvData as string).split('\n').filter((line: string) => line.trim());
      if (lines.length === 0) {
        return res.status(400).json({ error: 'Ficheiro CSV vazio' });
      }
      
      // Header esperado: companyName,email,...
      const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
      const requiredFields = ['companyName', 'email'];
      
      const hasRequiredFields = requiredFields.every(field => 
        header.some((h: string) => h.toLowerCase() === field.toLowerCase())
      );
      
      if (!hasRequiredFields) {
        return res.status(400).json({ 
          error: 'CSV deve ter pelo menos as colunas: companyName, email' 
        });
      }
      
      res.json({ 
        message: 'Upload iniciado',
        filename,
        rowCount: lines.length - 1
      });
    } catch (error) {
      ControllerUtils.handleError(error, 'no upload CSV', res, req);
    }
  }
}