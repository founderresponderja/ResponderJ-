/**
 * 🌐 URL BUILDER DINÂMICO
 * Sistema centralizado para construção de URLs em toda a aplicação
 * Resolve o problema de URLs hardcoded e garante flexibilidade
 */

import { domainManager } from '../config/domains.js';

export class URLBuilder {
  private static instance: URLBuilder;
  
  private constructor() {}
  
  public static getInstance(): URLBuilder {
    if (!URLBuilder.instance) {
      URLBuilder.instance = new URLBuilder();
    }
    return URLBuilder.instance;
  }

  /**
   * 🔗 Constrói URL baseada no contexto da request ou ambiente
   */
  public buildAppURL(path: string, req?: any): string {
    return domainManager.buildURL(path, req);
  }

  /**
   * 📧 URLs específicas para emails
   */
  public buildEmailURL(path: string): string {
    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://responderja.pt' 
      : domainManager.getPrimaryDomain();
    
    return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * 🎯 URLs para dashboard
   */
  public getDashboardURL(req?: any): string {
    return this.buildAppURL('/dashboard', req);
  }

  /**
   * 💳 URLs para billing
   */
  public getBillingURL(req?: any): string {
    return this.buildAppURL('/billing', req);
  }

  /**
   * 🔐 URLs para auth
   */
  public getAuthURL(req?: any): string {
    return this.buildAppURL('/auth', req);
  }

  /**
   * ⚙️ URLs para configurações
   */
  public getSettingsURL(req?: any): string {
    return this.buildAppURL('/settings', req);
  }
}

// 🚀 Export singleton
export const urlBuilder = URLBuilder.getInstance();