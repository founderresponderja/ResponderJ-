/**
 * 🌐 CONFIGURAÇÃO MULTI-DOMÍNIO RESPONDER JÁ
 * Implementado pelo melhor gestor de redes do mundo!
 * 
 * Este módulo centraliza toda a configuração de domínios para garantir
 * que a aplicação funcione perfeitamente em responderja.pt e responderja.com
 */

import process from "process";

interface DomainConfig {
  domain: string;
  isMain: boolean;
  protocol: 'https' | 'http';
  environment: 'production' | 'development';
}

export class DomainManager {
  private static instance: DomainManager;
  private config: DomainConfig[];

  private constructor() {
    this.config = this.initializeDomains();
  }

  public static getInstance(): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager();
    }
    return DomainManager.instance;
  }

  private initializeDomains(): DomainConfig[] {
    const domains: DomainConfig[] = [];

    // 🎯 DOMÍNIOS OFICIAIS RESPONDER JÁ
    domains.push(
      {
        domain: 'responderja.pt',
        isMain: true,
        protocol: 'https',
        environment: 'production'
      },
      {
        domain: 'responderja.com',
        isMain: false,
        protocol: 'https', 
        environment: 'production'
      }
    );

    // 🛠️ AMBIENTE DE DESENVOLVIMENTO
    if (process.env.NODE_ENV === 'development') {
      domains.push(
        {
          domain: 'localhost:5000',
          isMain: true,
          protocol: 'http',
          environment: 'development'
        },
        {
          domain: '127.0.0.1:5000',
          isMain: false,
          protocol: 'http',
          environment: 'development'
        }
      );
    }

    // ☁️ DOMÍNIOS REPLIT
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(',').forEach(domain => {
        domains.push({
          domain: domain.trim(),
          isMain: false,
          protocol: 'https',
          environment: 'production'
        });
      });
    }

    console.log('🌐 Initialized domains:', domains.map(d => `${d.protocol}://${d.domain}`));
    return domains;
  }

  /**
   * 🚀 Obtém o domínio principal baseado no ambiente
   */
  public getPrimaryDomain(): string {
    const mainDomain = this.config.find(d => d.isMain && d.environment === (process.env.NODE_ENV === 'development' ? 'development' : 'production'));
    return mainDomain ? `${mainDomain.protocol}://${mainDomain.domain}` : 'https://responderja.pt';
  }

  /**
   * 📧 Obtém o domínio para emails (sempre responderja.pt)
   */
  public getEmailDomain(): string {
    return 'responderja.pt';
  }

  /**
   * 🔗 Gera URL completa baseada no domínio atual
   */
  public buildURL(path: string, req?: any): string {
    let baseDomain = this.getPrimaryDomain();
    
    // Se temos uma request, usar o domínio da request
    if (req) {
      const host = req.get('host') || req.headers.host;
      const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      baseDomain = `${protocol}://${host}`;
    }
    
    return `${baseDomain}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * ✅ Verifica se um domínio é permitido
   */
  public isDomainAllowed(domain: string): boolean {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return this.config.some(d => d.domain === cleanDomain || d.domain.includes(cleanDomain));
  }

  /**
   * 🎯 Obtém todos os domínios permitidos
   */
  public getAllowedDomains(): string[] {
    return this.config.map(d => d.domain);
  }

  /**
   * 🌐 Obtém todos os origins permitidos (com protocolo)
   */
  public getAllowedOrigins(): string[] {
    return this.config.map(d => `${d.protocol}://${d.domain}`);
  }
}

// 🚀 EXPORT SINGLETON PARA USO GLOBAL
export const domainManager = DomainManager.getInstance();