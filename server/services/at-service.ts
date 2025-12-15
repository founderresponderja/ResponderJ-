import { encrypt, decrypt } from "../encryption";
import { createHash } from "crypto";

// Portuguese Tax Authority (AT) Service
// Simulação do serviço da Autoridade Tributária Portuguesa
// Para integração real seria necessário seguir a documentação oficial da AT

export interface ATCredentials {
  username: string;
  password: string;
  testMode: boolean;
}

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerVatNumber?: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
}

export interface ATSubmissionResult {
  success: boolean;
  reference?: string;
  validationCode?: string;
  qrCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export class ATService {
  private baseUrl: string;
  
  constructor(testMode: boolean = true) {
    // URLs reais da AT seriam diferentes
    this.baseUrl = testMode 
      ? "https://servicos.portaldasfinancas.gov.pt/fews/test" 
      : "https://servicos.portaldasfinancas.gov.pt/fews";
  }

  /**
   * Autentica com a AT usando as credenciais fornecidas
   */
  async authenticate(credentials: ATCredentials): Promise<string | null> {
    try {
      console.log("🔐 Autenticando com a Autoridade Tributária...");
      
      // Simulação da autenticação com a AT
      // Na implementação real seria uma chamada SOAP/REST para a AT
      if (credentials.testMode) {
        // Simular autenticação de teste
        const simulatedToken = `at_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("✅ Autenticação de teste bem-sucedida");
        return simulatedToken;
      }

      // Para produção seria necessário:
      // 1. Validar certificados digitais
      // 2. Fazer autenticação SOAP com a AT
      // 3. Obter token de sessão válido
      
      throw new Error("Autenticação em produção requer certificados digitais válidos");
      
    } catch (error) {
      console.error("❌ Erro na autenticação AT:", error);
      return null;
    }
  }

  /**
   * Submete uma fatura à AT para validação e obtenção do código de validação
   */
  async submitInvoice(
    credentials: ATCredentials, 
    invoiceData: InvoiceData
  ): Promise<ATSubmissionResult> {
    try {
      console.log(`📄 Submetendo fatura ${invoiceData.invoiceNumber} à AT...`);

      // Autenticar primeiro
      const token = await this.authenticate(credentials);
      if (!token) {
        throw new Error("Falha na autenticação com a AT");
      }

      // Validar dados da fatura
      this.validateInvoiceData(invoiceData);

      if (credentials.testMode) {
        // Simulação para modo de teste
        const result: ATSubmissionResult = {
          success: true,
          reference: `AT${Date.now()}`,
          validationCode: this.generateValidationCode(invoiceData),
          qrCode: this.generateQRCode(invoiceData),
          timestamp: new Date().toISOString()
        };

        console.log("✅ Fatura submetida com sucesso (modo teste):", {
          reference: result.reference,
          validationCode: result.validationCode
        });

        return result;
      }

      // Para produção seria necessário:
      // 1. Converter dados para formato SAFT-PT
      // 2. Assinar digitalmente com certificado
      // 3. Submeter via webservice da AT
      // 4. Processar resposta e extrair códigos de validação

      throw new Error("Submissão em produção requer implementação completa do protocolo da AT");

    } catch (error) {
      console.error("❌ Erro na submissão à AT:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Consulta o estado de uma fatura na AT
   */
  async getInvoiceStatus(
    credentials: ATCredentials,
    atReference: string
  ): Promise<{ status: string; details?: any }> {
    try {
      console.log(`🔍 Consultando estado da fatura ${atReference} na AT...`);

      const token = await this.authenticate(credentials);
      if (!token) {
        throw new Error("Falha na autenticação com a AT");
      }

      if (credentials.testMode) {
        // Simulação para modo de teste
        return {
          status: "validated",
          details: {
            submissionDate: new Date().toISOString(),
            validationDate: new Date().toISOString(),
            status: "Fatura validada com sucesso"
          }
        };
      }

      throw new Error("Consulta em produção requer implementação completa do protocolo da AT");

    } catch (error) {
      console.error("❌ Erro na consulta à AT:", error);
      return {
        status: "error",
        details: { error: error instanceof Error ? error.message : "Erro desconhecido" }
      };
    }
  }

  /**
   * Valida os dados da fatura antes de submeter à AT
   */
  private validateInvoiceData(invoiceData: InvoiceData): void {
    if (!invoiceData.invoiceNumber) {
      throw new Error("Número da fatura é obrigatório");
    }

    if (!invoiceData.customerName) {
      throw new Error("Nome do cliente é obrigatório");
    }

    if (invoiceData.totalAmount <= 0) {
      throw new Error("Valor total deve ser positivo");
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error("Fatura deve ter pelo menos um item");
    }

    // Validar NIF se fornecido
    if (invoiceData.customerVatNumber) {
      if (!this.isValidNIF(invoiceData.customerVatNumber)) {
        throw new Error("NIF do cliente inválido");
      }
    }

    // Validar cálculos
    const calculatedSubtotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
    const calculatedVat = invoiceData.items.reduce((sum, item) => 
      sum + (item.total * item.vatRate / 100), 0
    );

    if (Math.abs(calculatedSubtotal - invoiceData.subtotal) > 0.01) {
      throw new Error("Subtotal não confere com soma dos itens");
    }

    if (Math.abs(calculatedVat - invoiceData.vatAmount) > 0.01) {
      throw new Error("Valor do IVA não confere");
    }
  }

  /**
   * Valida um NIF português
   */
  private isValidNIF(nif: string): boolean {
    const cleanNif = nif.replace(/\s/g, '');
    
    if (!/^\d{9}$/.test(cleanNif)) {
      return false;
    }

    const digits = cleanNif.split('').map(Number);
    const checksum = digits.slice(0, 8).reduce((sum, digit, index) => 
      sum + digit * (9 - index), 0
    );

    const remainder = checksum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;

    return digits[8] === checkDigit;
  }

  /**
   * Gera código de validação simulado
   */
  private generateValidationCode(invoiceData: InvoiceData): string {
    // Algoritmo simplificado para simulação
    // Na realidade o código é gerado pela AT
    const hash = createHash('md5')
      .update(`${invoiceData.invoiceNumber}-${invoiceData.totalAmount}-${Date.now()}`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    
    return `ABCD-${hash}`;
  }

  /**
   * Gera QR Code simulado
   */
  private generateQRCode(invoiceData: InvoiceData): string {
    // Formato simplificado do QR Code
    // Na realidade seria gerado pela AT com formato específico
    return `A:${invoiceData.invoiceNumber}*B:${invoiceData.totalAmount}*C:${Date.now()}*D:ABCD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  /**
   * Encripta credenciais da AT para armazenamento seguro
   */
  static async encryptCredentials(credentials: ATCredentials): Promise<{
    encryptedUsername: string;
    encryptedPassword: string;
    testMode: boolean;
  }> {
    const encryptedUsername = await encrypt(credentials.username);
    const encryptedPassword = await encrypt(credentials.password);
    return {
      encryptedUsername,
      encryptedPassword,
      testMode: credentials.testMode
    };
  }

  /**
   * Desencripta credenciais da AT
   */
  static async decryptCredentials(encrypted: {
    encryptedUsername: string;
    encryptedPassword: string;
    testMode: boolean;
  }): Promise<ATCredentials> {
    const username = await decrypt(encrypted.encryptedUsername);
    const password = await decrypt(encrypted.encryptedPassword);
    return {
      username,
      password,
      testMode: encrypted.testMode
    };
  }
}

export default ATService;
