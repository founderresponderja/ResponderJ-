
import fs from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import type { Invoice, InvoiceSettings, InvoiceItem } from "@shared/schema";
import process from 'process';
import { Buffer } from 'buffer';

// Helper interface for Invoice with Items
export interface InvoiceWithDetails extends Invoice {
  items: InvoiceItem[];
}

export class PDFService {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join((process as any).cwd(), 'generated_invoices');
    this.ensureOutputDirectory();
  }

  /**
   * Gera PDF da fatura e guarda em disco
   */
  async generateInvoicePDF(
    invoice: InvoiceWithDetails,
    settings: InvoiceSettings
  ): Promise<string> {
    try {
      // Use cast to any to allow access to all properties dynamically
      const inv = invoice as any;
      console.log(`📄 Gerando PDF para fatura ${inv.invoiceNumber}...`);

      const fileName = `${inv.invoiceNumber.replace(/\//g, '_')}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Gerar PDF Programaticamente com jsPDF
      const doc = new jsPDF();
      
      this.renderInvoiceContent(doc, invoice, settings);
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      fs.writeFileSync(filePath, pdfBuffer);

      console.log(`✅ PDF gerado: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error("❌ Erro ao gerar PDF:", error);
      throw error;
    }
  }

  /**
   * Renderiza o conteúdo da fatura no documento jsPDF
   */
  private renderInvoiceContent(doc: jsPDF, invoice: InvoiceWithDetails, settings: InvoiceSettings) {
    const margin = 20;
    let y = 20;

    // Use cast to any for invoice to bypass TS errors if properties are missing in type definition but present at runtime
    const inv = invoice as any;

    // Helper para formatação de moeda
    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(num);
    };

    // Helper para data
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-PT').format(date);
    };

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(0, 123, 255); // Azul #007bff
    doc.text("FATURA", margin, y);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    y += 8;
    doc.text(`Nº: ${inv.invoiceNumber}`, margin, y);
    y += 5;
    doc.text(`Data: ${formatDate(inv.issueDate)}`, margin, y);

    // --- Company Info (Lado Direito) ---
    y = 20;
    const rightColX = 120;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Responder Já", rightColX, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(settings.companyName || '', rightColX, y);
    y += 5;
    doc.text(settings.companyAddress || '', rightColX, y);
    y += 5;
    doc.text(`NIF: ${settings.companyNif}`, rightColX, y);

    // Linha separadora
    y = 45;
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);

    // --- Customer Info ---
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Cliente:", margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(inv.customerName, margin, y);
    
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(80);
    if (inv.customerVatNumber) doc.text(`NIF: ${inv.customerVatNumber}`, margin, y);
    
    if (inv.customerAddress) {
        y += 5;
        doc.text(inv.customerAddress, margin, y);
    }
    
    y += 5;
    doc.text(`Vencimento: ${formatDate(inv.dueDate)}`, margin, y);

    // --- Items Table Header ---
    y += 15;
    const tableTop = y;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 5, 170, 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Descrição", margin + 2, y);
    doc.text("Qtd.", 100, y);
    doc.text("Preço", 120, y);
    doc.text("IVA", 150, y);
    doc.text("Total", 170, y);
    
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);

    // --- Items ---
    inv.items.forEach((item: any) => {
        const description = item.description.length > 40 ? item.description.substring(0, 37) + '...' : item.description;
        doc.text(description, margin + 2, y);
        doc.text(item.quantity.toString(), 100, y);
        doc.text(formatCurrency(item.unitPrice), 120, y);
        doc.text(`${item.vatRate}%`, 150, y);
        doc.text(formatCurrency(item.totalAmount), 170, y);
        
        y += 8;
    });

    // Linha final da tabela
    doc.line(margin, y - 5, 190, y - 5);

    // --- Totals ---
    y += 5;
    const totalsX = 130;
    const valueX = 170;

    doc.text("Subtotal:", totalsX, y);
    doc.text(formatCurrency(inv.subtotal), valueX, y);
    
    y += 6;
    doc.text("IVA:", totalsX, y);
    doc.text(formatCurrency(inv.vatAmount), valueX, y);
    
    if (parseFloat(inv.withholdingAmount || '0') > 0) {
        y += 6;
        doc.text("Retenção:", totalsX, y);
        doc.text(`-${formatCurrency(inv.withholdingAmount)}`, valueX, y);
    }
    
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", totalsX, y);
    doc.text(formatCurrency(inv.totalAmount), valueX, y);

    // --- Footer / AT Info ---
    y = 250; // Bottom page
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    
    if (inv.atDocumentId) {
        doc.text(`Processado por computador.`, margin, y);
        doc.text(`AT Doc ID: ${inv.atDocumentId}`, margin, y + 4);
        doc.text(`Código Validação: ${inv.atValidationCode || '----'}`, margin, y + 8);
    } else {
        doc.text("Este documento não serve como fatura fiscal (Modo Rascunho/Demo).", margin, y);
    }
    
    doc.text("Responder Já - Plataforma de Gestão de Respostas", margin, 280);
  }

  /**
   * Gera HTML da fatura (base para emails ou preview)
   */
  generateInvoiceHTML(
    invoice: InvoiceWithDetails,
    settings: InvoiceSettings
  ): string {
    // Cast to any to bypass TS errors
    const inv = invoice as any;
    
    const formatCurrency = (amount: string) => {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
      }).format(parseFloat(amount));
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('pt-PT').format(date);
    };

    return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>Fatura ${inv.invoiceNumber}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; background: white; }
        .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #007bff; margin: 0; }
        .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background: #f8f9fa; text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
        .table td { padding: 10px; border-bottom: 1px solid #eee; }
        .totals { float: right; width: 250px; }
        .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; margin-top: 5px; padding-top: 5px; }
        .footer { clear: both; margin-top: 50px; font-size: 0.8em; text-align: center; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <h1>FATURA</h1>
            <p><strong>${inv.invoiceNumber}</strong> | Data: ${formatDate(inv.issueDate)}</p>
        </div>

        <div class="details">
            <div class="company">
                <strong>${settings.companyName}</strong><br>
                ${settings.companyAddress}<br>
                NIF: ${settings.companyNif}
            </div>
            <div class="customer">
                <strong>Cliente:</strong><br>
                ${inv.customerName}<br>
                ${inv.customerVatNumber ? `NIF: ${inv.customerVatNumber}<br>` : ''}
                ${inv.customerAddress || ''}
            </div>
        </div>

        <table class="table">
            <thead>
                <tr><th>Descrição</th><th>Qtd</th><th>Preço</th><th>IVA</th><th>Total</th></tr>
            </thead>
            <tbody>
                ${inv.items.map((item: any) => `
                <tr>
                    <td>${item.description}</td>
                    <td>${parseFloat(item.quantity)}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${parseFloat(item.vatRate)}%</td>
                    <td>${formatCurrency(item.totalAmount)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row"><span>Subtotal:</span> <span>${formatCurrency(inv.subtotal)}</span></div>
            <div class="totals-row"><span>IVA:</span> <span>${formatCurrency(inv.vatAmount)}</span></div>
            ${parseFloat(inv.withholdingAmount) > 0 ? `<div class="totals-row"><span>Retenção:</span> <span>-${formatCurrency(inv.withholdingAmount)}</span></div>` : ''}
            <div class="totals-row total-final"><span>Total:</span> <span>${formatCurrency(inv.totalAmount)}</span></div>
        </div>

        <div class="footer">
            <p>Processado por programa certificado nº 0000/AT</p>
            <p>Responder Já - Soluções de Automação</p>
        </div>
    </div>
</body>
</html>`;
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Diretório criado: ${this.outputDir}`);
    }
  }

  getInvoicePath(invoiceNumber: string): string {
    const fileName = `${invoiceNumber.replace(/\//g, '_')}.pdf`;
    return path.join(this.outputDir, fileName);
  }

  invoicePdfExists(invoiceNumber: string): boolean {
    const filePath = this.getInvoicePath(invoiceNumber);
    return fs.existsSync(filePath);
  }
}

export default PDFService;
    