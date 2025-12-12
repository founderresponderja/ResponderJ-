// =====================================
// DETECÇÃO AVANÇADA DE AMEAÇAS - RESPONDER JÁ
// =====================================
// Implementado pelo melhor engenheiro de criptografia do mundo
// Data: 26 Agosto 2025
// =====================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { SecurityLogService } from '../services/security-log-service';

interface ThreatPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface IPReputation {
  ip: string;
  threatScore: number; // 0-100
  attackCount: number;
  lastAttack: Date;
  blocked: boolean;
  country?: string;
}

export class AdvancedThreatDetector {
  private static ipReputations = new Map<string, IPReputation>();
  private static suspiciousUserAgents = new Set<string>();
  private static rateLimitViolations = new Map<string, number>();
  
  // Patterns de ataques conhecidos
  private static threatPatterns: ThreatPattern[] = [
    {
      name: 'SQL_INJECTION',
      pattern: /(union.*select|select.*from|insert.*into|delete.*from|drop.*table|exec.*xp_|script.*src|javascript:|vbscript:|onload=|onerror=)/i,
      severity: 'critical',
      description: 'Tentativa de SQL Injection'
    },
    {
      name: 'XSS_ATTACK',
      pattern: /(<script|<iframe|<object|<embed|<applet|<meta.*refresh|eval\(|expression\(|url\(javascript)/i,
      severity: 'high',
      description: 'Tentativa de Cross-Site Scripting (XSS)'
    },
    {
      name: 'PATH_TRAVERSAL',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|\.\.%2f|\.\.%5c)/i,
      severity: 'high',
      description: 'Tentativa de Path Traversal'
    },
    {
      name: 'COMMAND_INJECTION',
      pattern: /(;|\||\&|\$\(|\`|nc.*-l|wget.*http|curl.*http|powershell|cmd.*\/c)/i,
      severity: 'critical',
      description: 'Tentativa de Command Injection'
    },
    {
      name: 'LDAP_INJECTION',
      pattern: /(\*\)\(|\|\(|\&\(|objectclass=|cn=|ou=|dc=)/i,
      severity: 'medium',
      description: 'Tentativa de LDAP Injection'
    },
    {
      name: 'XXE_ATTACK',
      pattern: /(<!entity|%.*entity|file:\/\/|expect:\/\/)/i,
      severity: 'high',
      description: 'Tentativa de XML External Entity (XXE)'
    },
    {
      name: 'SSRF_ATTACK',
      pattern: /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.|0x|file:\/\/|dict:\/\/|ftp:\/\/|gopher:\/\/)/i,
      severity: 'high',
      description: 'Tentativa de Server-Side Request Forgery (SSRF)'
    }
  ];

  // User agents suspeitos
  private static suspiciousAgentPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /dirbuster/i,
    /gobuster/i,
    /wfuzz/i,
    /curl.*bot/i,
    /python.*requests/i,
    /perl.*lwp/i
  ];

  /**
   * Detecta e classifica ameaças em tempo real
   */
  static detectThreats(req: Request): {
    threats: Array<{pattern: ThreatPattern, matches: string[]}>,
    threatScore: number,
    shouldBlock: boolean
  } {
    const threats: Array<{pattern: ThreatPattern, matches: string[]}> = [];
    let totalThreatScore = 0;

    // Analisar URL, headers, query params, e body
    const dataToAnalyze = [
      req.url,
      JSON.stringify(req.query),
      JSON.stringify(req.headers),
      req.body ? JSON.stringify(req.body) : ''
    ].join(' ');

    // Detectar patterns de ataque usando métodos funcionais
    const severityScores = { low: 10, medium: 25, high: 50, critical: 100 };
    
    const detectedThreats = this.threatPatterns
      .map(pattern => ({ pattern, matches: dataToAnalyze.match(pattern.pattern) }))
      .filter(({ matches }) => matches)
      .map(({ pattern, matches }) => ({
        pattern,
        matches: matches!.filter(m => m), // Remove empty matches
        score: severityScores[pattern.severity]
      }));
    
    threats.push(...detectedThreats.map(({ pattern, matches }) => ({ pattern, matches })));
    totalThreatScore += detectedThreats.reduce((sum, { score }) => sum + score, 0);

    // Verificar user agent suspeito usando find e funcional
    const userAgent = (req.headers['user-agent'] || '') as string;
    const suspiciousMatches = this.suspiciousAgentPatterns.filter(pattern => pattern.test(userAgent));
    
    if (suspiciousMatches.length > 0) {
      totalThreatScore += suspiciousMatches.length * 30;
      this.suspiciousUserAgents.add(userAgent);
    }

    return {
      threats,
      threatScore: totalThreatScore,
      shouldBlock: totalThreatScore >= 50 // Block if high threat
    };
  }

  /**
   * Actualiza reputação de IP baseado em comportamento
   */
  static updateIPReputation(ip: string, threatScore: number, isAttack: boolean = false) {
    let reputation = this.ipReputations.get(ip) || {
      ip,
      threatScore: 0,
      attackCount: 0,
      lastAttack: new Date(),
      blocked: false
    };

    // Atualizar baseado no tipo de comportamento
    if (isAttack) {
      reputation.attackCount++;
      reputation.lastAttack = new Date();
      reputation.threatScore = Math.min(100, reputation.threatScore + threatScore);
    } else {
      // Decay threat score over time for legitimate behaviour
      reputation.threatScore = Math.max(0, reputation.threatScore - 1);
    }

    // Auto-block IPs with high threat scores - early return se já bloqueado
    if (reputation.blocked) {
      this.ipReputations.set(ip, reputation);
      return reputation;
    }

    if (reputation.threatScore >= 75 || reputation.attackCount >= 5) {
      reputation.blocked = true;
    }

    this.ipReputations.set(ip, reputation);
    return reputation;
  }

  /**
   * Verifica se IP está bloqueado
   */
  static isBlocked(ip: string): boolean {
    const reputation = this.ipReputations.get(ip);
    return reputation?.blocked || false;
  }

  /**
   * Middleware principal de detecção
   */
  static middleware = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = this.getClientIP(req);
    const path = req.path;
    const fullUrl = req.originalUrl || req.url;

    // 🔒 Skip detection for development assets and application pages
    const safePaths = [
      '/src/', '/@vite/', '/@fs/', '/node_modules/',
      '/favicon.ico', '/robots.txt', '/api/auth/',
      '/api/health', '/', '/saber-mais', '/auth', 
      '/dashboard', '/about', '/static'
    ];

    if (safePaths.some(safePath => path.startsWith(safePath) || fullUrl.includes(safePath))) {
      return next();
    }
    
    // Verificar se IP está bloqueado
    if (this.isBlocked(clientIP)) {
      SecurityLogService.addLog({
        level: 'critical',
        type: 'access',
        ip: clientIP,
        userAgent: (req.headers['user-agent'] || 'Unknown') as string,
        endpoint: req.path,
        details: 'Access denied - IP blocked due to high threat score',
        statusCode: 403
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP has been temporarily blocked due to suspicious activity'
      });
    }

    // Detectar ameaças na request actual
    const analysis = this.detectThreats(req);
    
    if (analysis.threats.length > 0) {
      // Log todas as ameaças detectadas
      for (const threat of analysis.threats) {
        SecurityLogService.addLog({
          level: threat.pattern.severity === 'critical' ? 'critical' : 'error',
          type: 'audit',
          ip: clientIP,
          userAgent: (req.headers['user-agent'] || 'Unknown') as string,
          endpoint: req.path,
          details: `${threat.pattern.description}: ${threat.matches.join(', ')}`,
          statusCode: analysis.shouldBlock ? 403 : undefined
        });
      }

      // Actualizar reputação IP
      this.updateIPReputation(clientIP, analysis.threatScore, true);

      // Bloquear se ameaça alta
      if (analysis.shouldBlock) {
        return res.status(403).json({
          error: 'Security violation detected',
          message: 'Request blocked due to potential security threat'
        });
      }
    }

    // Rate limiting baseado em reputação
    const reputation = this.ipReputations.get(clientIP);
    if (reputation && reputation.threatScore > 25) {
      const violations = this.rateLimitViolations.get(clientIP) || 0;
      if (violations >= 3) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from suspicious IP'
        });
      }
      this.rateLimitViolations.set(clientIP, violations + 1);
      
      // Clear violation count after 1 minute
      setTimeout(() => {
        this.rateLimitViolations.delete(clientIP);
      }, 60000);
    }

    next();
  };

  /**
   * Obter IP real do cliente (considerando proxies/load balancers)
   */
  private static getClientIP(req: Request): string {
    return (
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for']?.toString().split(',')[0]) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    ).replace(/^::ffff:/, '');
  }

  /**
   * Obter estatísticas de segurança
   */
  static getSecurityStats() {
    const now = Date.now();
    const recentAttacks = Array.from(this.ipReputations.values())
      .filter(rep => now - rep.lastAttack.getTime() < 24 * 60 * 60 * 1000); // Last 24h

    return {
      totalIPs: this.ipReputations.size,
      blockedIPs: Array.from(this.ipReputations.values()).filter(rep => rep.blocked).length,
      recentAttacks: recentAttacks.length,
      suspiciousUserAgents: this.suspiciousUserAgents.size,
      topThreats: this.getTopThreats()
    };
  }

  /**
   * Obter top ameaças detectadas
   */
  private static getTopThreats() {
    // Esta implementação seria expandida para armazenar histórico de ameaças
    return this.threatPatterns.map(pattern => ({
      name: pattern.name,
      severity: pattern.severity,
      description: pattern.description
    }));
  }

  /**
   * Limpar IPs antigos (manutenção automática)
   */
  static cleanupOldIPs() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [ip, reputation] of this.ipReputations.entries()) {
      if (now - reputation.lastAttack.getTime() > maxAge && reputation.threatScore === 0) {
        this.ipReputations.delete(ip);
      }
    }
  }
}

// Auto-cleanup a cada hora
setInterval(() => {
  AdvancedThreatDetector.cleanupOldIPs();
}, 60 * 60 * 1000);
