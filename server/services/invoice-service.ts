
import { storage } from "../storage";
import ATService, { type InvoiceData, type ATCredentials } from "./at-service";
import PDFService from "./pdf-service";
import { EmailService } from "./email-service";
import type { 
  Invoice, 
  InvoiceItem, 
  InvoiceSettings, 
  InsertInvoice, 
  InsertInvoiceItem 
} from "@shared/schema";

export interface CreateInvoiceRequest {
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerPostalCode?: string;
  customerCity?: string;
  customerCountry?: string;
  customerVatNumber?: string;
  
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    productCode?: string;
    productCategory?: string;
  }>;
  
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date;
  dueDate?: Date;
  notes?: string;
  
  // Flags de controlo
  autoSubmitToAT?: boolean;
  autoSendEmail?: boolean;
}

export interface InvoiceCalculations {
  subtotal: number;
  vatAmount: number;
  withholdingAmount: number;
  totalAmount: number;
  items: Array<InvoiceItem & {
    lineTotal: number;
    vatAmount: number;
    totalAmount: number;
  }>;
}

export class InvoiceService {
  private atService: ATService;
  private pdfService: PDFService;
  private emailService: EmailService;

  constructor() {
    this.atService = new ATService();
    this.pdfService = new PDFService();
    this.emailService = new EmailService();
  }

  /**
   * Cria uma nova fatura
   */
  async createInvoice(
    userId: string, 
    request: CreateInvoiceRequest
  ): Promise<Invoice> {
    try {
      console.log(`📄 Criando nova fatura para o utilizador ${userId}...`);

      // Obter configurações de faturação
      const settings = await storage.getInvoiceSettings(userId);
      if (!settings) {
        throw new Error("Configurações de faturação não encontradas. Configure primeiro no painel de administração.");
      }

      // Validar integridade dos dados fiscais
      if (request.customerVatNumber && !this.isValidPTNIF(request.customerVatNumber)) {
         // Em produção, para NIFs estrangeiros, a validação seria diferente (VIES)
         // Para PT, exigimos formato correto
         console.warn(`⚠️ NIF ${request.customerVatNumber} pode ser inválido para PT.`);
      }

      // Calcular valores da fatura
      const calculations = this.calculateInvoiceAmounts(request.items, settings);

      // Gerar número da fatura sequencial (Requisito legal: continuidade cronológica)
      const invoiceNumber = await this.generateInvoiceNumber(settings);

      // Criar fatura na base de dados
      const invoiceData: InsertInvoice = {
        userId,
        settingsId: settings.id,
        invoiceNumber,
        invoiceSeries: "A", // Série anual por defeito
        invoiceSequenceNumber: settings.invoiceSequence,
        
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerAddress: request.customerAddress,
        customerPostalCode: request.customerPostalCode,
        customerCity: request.customerCity,
        customerCountry: request.customerCountry || "Portugal",
        customerVatNumber: request.customerVatNumber,
        
        subtotal: calculations.subtotal.toString(),
        vatAmount: calculations.vatAmount.toString(),
        withholdingAmount: calculations.withholdingAmount.toString(),
        totalAmount: calculations.totalAmount.toString(),
        currency: "EUR",
        
        paymentMethod: request.paymentMethod,
        paymentReference: request.paymentReference,
        paymentDate: request.paymentDate,
        dueDate: request.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias por defeito
        
        status: "draft", // Sempre criada como Rascunho inicialmente para revisão
        issueDate: new Date(),
        notes: request.notes,
        metadata: {
          softwareCertification: "Demo Version", // Em produção: Nº Certificado AT
          createdIp: "127.0.0.1" // Deveria vir do request context
        }
      };

      const invoice = await storage.createInvoice(invoiceData);

      // Criar itens da fatura
      for (const itemData of calculations.items) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          description: itemData.description,
          quantity: itemData.quantity.toString(),
          unitPrice: itemData.unitPrice.toString(),
          vatRate: itemData.vatRate.toString(),
          lineTotal: itemData.lineTotal.toString(),
          vatAmount: itemData.vatAmount.toString(),
          totalAmount: itemData.totalAmount.toString(),
          productCode: itemData.productCode || "S001", // Código serviço genérico
          productCategory: itemData.productCategory || "S" // Serviço
        });
      }

      // Atualizar sequência da fatura (Atomicamente na BD real)
      await storage.updateInvoiceSequence(settings.id, settings.invoiceSequence + 1);

      // Log de auditoria (Obrigatório por lei para rastreabilidade)
      await storage.createInvoiceAuditLog({
        invoiceId: invoice.id,
        action: "created",
        performedBy: userId,
        details: `Fatura ${invoiceNumber} criada`,
        ipAddress: "127.0.0.1",
        userAgent: "System"
      });

      console.log(`✅ Fatura ${invoiceNumber} criada com sucesso`);

      // Processar automaticamente se solicitado (Atenção: Ao submeter à AT, torna-se imutável)
      if (request.autoSubmitToAT || request.autoSendEmail) {
        await this.processInvoiceAutomatically(invoice.id, {
          submitToAT: request.autoSubmitToAT || false,
          sendEmail: request.autoSendEmail || false
        });
      }

      return invoice;

    } catch (error) {
      console.error("❌ Erro ao criar fatura:", error);
      throw error;
    }
  }

  // Validação de NIF Português (Algoritmo Modulo 11)
  private isValidPTNIF(nif: string): boolean {
    if (!['1', '2', '3', '5', '6', '8', '9'].includes(nif.substr(0, 1)) &&
        !['45', '70', '71', '72', '74', '75', '77', '79'].includes(nif.substr(0, 2))) {
        return false;
    }
    const total = Number(nif[0]) * 9 + Number(nif[1]) * 8 + Number(nif[2]) * 7 + Number(nif[3]) * 6 + 
                  Number(nif[4]) * 5 + Number(nif[5]) * 4 + Number(nif[6]) * 3 + Number(nif[7]) * 2;
    const modulo11 = total % 11;
    const comparador = modulo11 < 2 ? 0 : 11 - modulo11;
    return Number(nif[8]) === comparador;
  }

  /**
   * Processa uma fatura automaticamente (submete à AT e envia por email)
   */
  async processInvoiceAutomatically(
    invoiceId: string,
    options: { submitToAT: boolean; sendEmail: boolean }
  ): Promise<void> {
    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) throw new Error("Fatura não encontrada");

      // Verificação de segurança fiscal
      if (invoice.status === 'cancelled') {
        throw new Error("Não é possível processar uma fatura anulada");
      }

      // Gerar PDF (Documento final)
      await this.generateInvoicePDF(invoiceId);

      // Submeter à AT se solicitado
      if (options.submitToAT) {
        // Bloqueio de alterações após submissão
        if (invoice.atDocumentId) {
            console.log("Fatura já submetida à AT anteriormente.");
        } else {
            await this.submitToAT(invoiceId);
        }
      }

      // Enviar por email se solicitado
      if (options.sendEmail) {
        await this.sendInvoiceEmail(invoiceId);
      }

      // Atualizar status
      await storage.updateInvoiceStatus(invoiceId, "issued");

    } catch (error) {
      console.error("❌ Erro no processamento automático:", error);
      throw error;
    }
  }

  /**
   * Tenta ANULAR uma fatura.
   * Pela lei portuguesa, não se podem apagar faturas emitidas.
   */
  async cancelInvoice(invoiceId: string, userId: string, reason: string): Promise<void> {
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) throw new Error("Fatura não encontrada");
      
      if (invoice.status === 'draft') {
          // Rascunhos podem ser anulados/apagados
          await storage.updateInvoiceStatus(invoiceId, 'cancelled');
          return;
      }

      // Se já foi comunicada à AT ou enviada ao cliente, exige Nota de Crédito
      if (invoice.atDocumentId || invoice.emailSent) {
          // Em um sistema real, aqui chamaríamos createCreditNote()
          // Como simplificação, marcamos como anulada mas mantemos o registo
          console.warn(`⚠️ Fatura ${invoice.invoiceNumber} deve ter Nota de Crédito associada.`);
          await storage.updateInvoiceStatus(invoiceId, 'cancelled');
          
          await storage.createInvoiceAuditLog({
            invoiceId: invoice.id,
            action: "cancelled",
            performedBy: userId,
            details: `Fatura anulada. Motivo: ${reason}`,
            ipAddress: "127.0.0.1",
            userAgent: "System"
          });
      }
  }

  /**
   * Calcula os valores da fatura
   */
  private calculateInvoiceAmounts(
    items: CreateInvoiceRequest['items'],
    settings: InvoiceSettings
  ): InvoiceCalculations {
    const processedItems: any[] = [];
    let subtotal = 0;
    let totalVatAmount = 0;

    for (const item of items) {
      const vatRate = item.vatRate ?? parseFloat(settings.defaultVatRate);
      const lineTotal = item.quantity * item.unitPrice;
      const vatAmount = lineTotal * (vatRate / 100);
      const totalAmount = lineTotal + vatAmount;

      processedItems.push({
        ...item,
        vatRate,
        lineTotal,
        vatAmount,
        totalAmount
      });

      subtotal += lineTotal;
      totalVatAmount += vatAmount;
    }

    const withholdingAmount = subtotal * (parseFloat(settings.withholdingTaxRate) / 100);
    const totalAmount = subtotal + totalVatAmount - withholdingAmount;

    return {
      subtotal,
      vatAmount: totalVatAmount,
      withholdingAmount,
      totalAmount,
      items: processedItems
    };
  }

  /**
   * Gera número da fatura
   */
  private async generateInvoiceNumber(settings: InvoiceSettings): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = settings.invoiceSequence.toString().padStart(6, '0');
    return `${settings.invoicePrefix}${year}/${sequence}`;
  }

  /**
   * Submete fatura à Autoridade Tributária
   */
  async submitToAT(invoiceId: string): Promise<void> {
    try {
      console.log(`🏛️ Submetendo fatura ${invoiceId} à Autoridade Tributária...`);

      const invoice = await storage.getInvoiceWithDetails(invoiceId);
      if (!invoice) throw new Error("Fatura não encontrada");

      // Validar estado antes de submeter
      if (invoice.status === 'cancelled') throw new Error("Fatura anulada não pode ser submetida");

      const settings = await storage.getInvoiceSettings(invoice.userId);
      if (!settings) throw new Error("Configurações de faturação não encontradas");

      // Preparar credenciais da AT
      let credentials: ATCredentials;
      
      if (settings.atUsername && settings.atPassword) {
        credentials = await ATService.decryptCredentials({
          encryptedUsername: settings.atUsername,
          encryptedPassword: settings.atPassword,
          testMode: settings.atTestMode || false
        });
      } else {
        credentials = {
          username: "",
          password: "",
          testMode: settings.atTestMode || false
        };
      }

      // Preparar dados da fatura para submissão
      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString(),
        customerName: invoice.customerName,
        customerVatNumber: invoice.customerVatNumber || undefined,
        subtotal: parseFloat(invoice.subtotal),
        vatAmount: parseFloat(invoice.vatAmount),
        totalAmount: parseFloat(invoice.totalAmount),
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          vatRate: parseFloat(item.vatRate),
          total: parseFloat(item.lineTotal)
        }))
      };

      // Submeter à AT
      const result = await this.atService.submitInvoice(credentials, invoiceData);

      if (result.success) {
        // Atualizar fatura com dados da AT
        await storage.updateInvoiceATData(invoiceId, {
          atSubmitted: true,
          atSubmissionDate: new Date(),
          atReference: result.reference!,
          atValidationCode: result.validationCode!,
          atQrCode: result.qrCode!
        });

        console.log(`✅ Fatura submetida à AT com sucesso:`, {
          reference: result.reference,
          validationCode: result.validationCode
        });
      } else {
        await storage.updateInvoiceATError(invoiceId, result.errorMessage!);
        throw new Error(`Erro na submissão à AT: ${result.errorMessage}`);
      }

      // Log de auditoria
      await storage.createInvoiceAuditLog({
        invoiceId,
        action: "at_submitted",
        performedBy: invoice.userId,
        details: result.success 
          ? `Submetida à AT: ${result.reference}` 
          : `Erro na submissão: ${result.errorMessage}`,
        ipAddress: "127.0.0.1",
        userAgent: "System"
      });

    } catch (error) {
      console.error("❌ Erro na submissão à AT:", error);
      throw error;
    }
  }

  /**
   * Gera PDF da fatura
   */
  async generateInvoicePDF(invoiceId: string): Promise<string> {
    try {
      console.log(`📄 Gerando PDF da fatura ${invoiceId}...`);

      const invoice = await storage.getInvoiceWithDetails(invoiceId);
      if (!invoice) {
        throw new Error("Fatura não encontrada");
      }

      const settings = await storage.getInvoiceSettings(invoice.userId);
      if (!settings) {
        throw new Error("Configurações de faturação não encontradas");
      }

      // Gerar PDF
      const pdfPath = await this.pdfService.generateInvoicePDF(invoice, settings);

      // Atualizar caminho do PDF na fatura
      await storage.updateInvoicePdfPath(invoiceId, pdfPath);

      return pdfPath;

    } catch (error) {
      console.error("❌ Erro ao gerar PDF:", error);
      throw error;
    }
  }

  /**
   * Envia fatura por email
   */
  async sendInvoiceEmail(invoiceId: string): Promise<void> {
    try {
      console.log(`📧 Enviando fatura ${invoiceId} por email...`);

      const invoice = await storage.getInvoiceWithDetails(invoiceId);
      if (!invoice) throw new Error("Fatura não encontrada");

      const settings = await storage.getInvoiceSettings(invoice.userId);
      if (!settings) throw new Error("Configurações de faturação não encontradas");

      if (!settings.invoiceEmailEnabled) {
        console.log("📧 Envio de email desabilitado nas configurações");
        return;
      }

      // Gerar PDF se não existir
      let pdfPath = invoice.pdfPath;
      if (!pdfPath) {
        pdfPath = await this.generateInvoicePDF(invoiceId);
      }

      // Enviar email
      await this.emailService.sendInvoiceEmail({
        to: invoice.customerEmail,
        invoice,
        settings,
        pdfPath
      });

      // Atualizar status de envio
      await storage.updateInvoiceEmailSent(invoiceId, true, new Date());

      // Log de auditoria
      await storage.createInvoiceAuditLog({
        invoiceId,
        action: "sent",
        performedBy: invoice.userId,
        details: `Email enviado para ${invoice.customerEmail}`,
        ipAddress: "127.0.0.1",
        userAgent: "System"
      });

    } catch (error) {
      console.error("❌ Erro ao enviar email:", error);
      throw error;
    }
  }

  /**
   * Processa pagamento e cria fatura automaticamente
   */
  async processPaymentInvoice(
    userId: string,
    paymentData: {
      paymentId: string;
      amount: number;
      currency: string;
      customerEmail: string;
      customerName: string;
      paymentMethod: string;
      description: string;
    }
  ): Promise<Invoice> {
    try {
      console.log(`💳 Processando pagamento ${paymentData.paymentId} e criando fatura...`);

      // Criar fatura para o pagamento
      const invoice = await this.createInvoice(userId, {
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerCountry: "Portugal",
        
        items: [{
          description: paymentData.description || "Serviços de resposta automática",
          quantity: 1,
          unitPrice: paymentData.amount,
          vatRate: 23 // IVA padrão em Portugal
        }],
        
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentId,
        paymentDate: new Date(),
        
        autoSubmitToAT: true,
        autoSendEmail: true
      });

      // Atualizar status para pago
      await storage.updateInvoiceStatus(invoice.id, "paid");

      return invoice;

    } catch (error) {
      console.error("❌ Erro ao processar pagamento:", error);
      throw error;
    }
  }
}

export default InvoiceService;