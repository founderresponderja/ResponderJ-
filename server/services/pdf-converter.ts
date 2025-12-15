
import jsPDF from 'jspdf';
import { Buffer } from 'buffer';

export class PDFConverter {
  /**
   * Converte HTML em PDF usando jsPDF (implementação simplificada)
   */
  static async convertHTMLToPDF(htmlContent: string, filename?: string): Promise<Buffer> {
    try {
      // Esta é uma implementação simplificada
      // Em produção, seria melhor usar Puppeteer ou similar para melhor qualidade
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Extrair texto do HTML (implementação básica)
      const textContent = this.extractTextFromHTML(htmlContent);
      
      // Adicionar conteúdo ao PDF com formatação básica
      doc.setFontSize(16);
      doc.text('Relatório - Responder Já', 20, 20);
      
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(textContent, 170);
      doc.text(lines, 20, 40);

      // Retornar buffer do PDF
      // Note: jsPDF's output('arraybuffer') returns an ArrayBuffer, convert to Buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      return pdfBuffer;
    } catch (error) {
      console.error('Erro na conversão HTML para PDF:', error);
      throw new Error('Falha na geração de PDF');
    }
  }

  /**
   * Extrai texto de HTML (implementação básica)
   */
  private static extractTextFromHTML(html: string): string {
    // Remove tags HTML e formata texto básico
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limitar tamanho para demo
  }

  /**
   * Configurar headers para download de PDF
   */
  static setPDFHeaders(res: any, filename: string): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  /**
   * Gerar nome de arquivo com timestamp
   */
  static generatePDFFilename(prefix: string, period?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const periodSuffix = period ? `-${period}` : '';
    return `${prefix}${periodSuffix}-${timestamp}.pdf`;
  }
}
