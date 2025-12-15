import { LoggingService, SecurityLogEntry } from "./logging-service";
import { ThreatDetectionService } from "./threat-detection-service";

export interface SecurityMetrics {
  totalRequests: number;
  failedLogins: number;
  blockedIPs: number;
  suspiciousActivity: number;
  rateLimit429s: number;
  serverErrors: number;
  uniqueIPs: number;
  successRate: number;
}

export class SecurityMetricsService {
  static getSecurityMetrics(): SecurityMetrics {
    const logs = LoggingService.getAllLogs();
    
    // Filter logs for the last 24 hours
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logTime >= twentyFourHoursAgo;
    });

    const uniqueIPs = new Set(recentLogs.map(log => log.ip));

    return {
      totalRequests: recentLogs.length,
      failedLogins: recentLogs.filter(log => log.type === 'auth' && log.level === 'error').length,
      blockedIPs: ThreatDetectionService.getBlockedIPs().size,
      suspiciousActivity: recentLogs.filter(log => log.level === 'warning' || log.level === 'error' || log.level === 'critical').length,
      rateLimit429s: recentLogs.filter(log => log.statusCode === 429).length,
      serverErrors: recentLogs.filter(log => log.statusCode && log.statusCode >= 500).length,
      uniqueIPs: uniqueIPs.size,
      successRate: recentLogs.length > 0 ? 
        ((recentLogs.length - recentLogs.filter(log => log.statusCode && log.statusCode >= 400).length) / recentLogs.length) * 100 : 100
    };
  }

  static getMetrics(range: string = '24h'): SecurityMetrics {
    const cutoff = this.getDateCutoff(range);
    const logs = LoggingService.getAllLogs();
    const relevantLogs = logs.filter(log => 
      new Date(log.timestamp).getTime() >= cutoff
    );

    const totalRequests = relevantLogs.length;
    const failedLogins = relevantLogs.filter(log => 
      log.type === 'auth' && log.level === 'error'
    ).length;
    const blockedIPs = ThreatDetectionService.getBlockedIPs().size;
    const suspiciousActivity = relevantLogs.filter(log => 
      this.isSuspiciousEndpoint(log.endpoint) || log.level === 'critical'
    ).length;
    const rateLimit429s = relevantLogs.filter(log => 
      log.statusCode === 429
    ).length;
    const serverErrors = relevantLogs.filter(log => 
      log.statusCode && log.statusCode >= 500
    ).length;

    const uniqueIPs = new Set(relevantLogs.map(log => log.ip)).size;
    const successfulRequests = relevantLogs.filter(log => 
      log.statusCode && log.statusCode >= 200 && log.statusCode < 400
    ).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    return {
      totalRequests,
      failedLogins,
      blockedIPs,
      suspiciousActivity,
      rateLimit429s,
      serverErrors,
      uniqueIPs,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  private static getDateCutoff(range: string): number {
    const now = Date.now();
    switch (range) {
      case '1h': return now - (60 * 60 * 1000);
      case '24h': return now - (24 * 60 * 60 * 1000);
      case '7d': return now - (7 * 24 * 60 * 60 * 1000);
      case '30d': return now - (30 * 24 * 60 * 60 * 1000);
      default: return now - (24 * 60 * 60 * 1000);
    }
  }

  private static isSuspiciousEndpoint(endpoint: string): boolean {
    const suspiciousPatterns = [
      '/admin/',
      '/.env',
      '/config',
      '/phpmyadmin',
      '/wp-admin',
      '/../',
      '/etc/',
      '/passwd'
    ];

    if (endpoint.startsWith('/api/admin') && !endpoint.includes('..')) {
        return false;
    }

    return suspiciousPatterns.some(pattern => endpoint.toLowerCase().includes(pattern.toLowerCase()));
  }
}