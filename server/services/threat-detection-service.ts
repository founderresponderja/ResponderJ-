import { SecurityLogEntry } from "./logging-service";
import { AlertService } from "./alert-service";

export class ThreatDetectionService {
  private static suspiciousIPs = new Set<string>();
  private static blockedIPs = new Set<string>();
  private static violationCounts = new Map<string, number>();

  static analyzeLogEntry(entry: SecurityLogEntry) {
    // Failed login detection
    if (entry.type === 'auth' && entry.level === 'error') {
      this.handleFailedLogin(entry);
    }

    // Rate limiting detection
    if (entry.statusCode === 429) {
      this.handleRateLimit(entry);
    }

    // Server error monitoring (500s might indicate exploitation attempts)
    if (entry.statusCode && entry.statusCode >= 500) {
      this.handleServerError(entry);
    }

    // Suspicious endpoint access (e.g., trying to access .env, admin panels)
    if (this.isSuspiciousEndpoint(entry.endpoint)) {
      this.handleSuspiciousAccess(entry);
    }

    // SQL injection attempt detection
    if (this.containsSQLInjection(entry.endpoint) || this.containsSQLInjection(entry.details)) {
      this.handleSQLInjectionAttempt(entry);
    }
  }

  private static handleFailedLogin(entry: SecurityLogEntry) {
    // Track failed logins per IP
    const key = `failed_login:${entry.ip}`;
    const count = (this.violationCounts.get(key) || 0) + 1;
    this.violationCounts.set(key, count);

    // Alert threshold
    if (count >= 5) {
      AlertService.addAlert({
        severity: 'high',
        type: 'Brute Force Attack',
        description: `Multiple failed login attempts (${count}) from IP: ${entry.ip}`,
        ip: entry.ip,
        userId: entry.userId,
        metadata: { failedAttempts: count }
      });

      this.suspiciousIPs.add(entry.ip);
    }
  }

  private static handleRateLimit(entry: SecurityLogEntry) {
    const key = `rate_limit:${entry.ip}`;
    const count = (this.violationCounts.get(key) || 0) + 1;
    this.violationCounts.set(key, count);

    if (count >= 20) {
      AlertService.addAlert({
        severity: 'medium',
        type: 'Rate Limit Abuse',
        description: `Excessive rate limiting from IP: ${entry.ip}`,
        ip: entry.ip,
        metadata: { rateLimitHits: count }
      });
    }
  }

  private static handleServerError(entry: SecurityLogEntry) {
    // Only alert on recurring server errors from same source which might indicate fuzzing
    const key = `server_error:${entry.ip}`;
    const count = (this.violationCounts.get(key) || 0) + 1;
    this.violationCounts.set(key, count);

    if (count >= 10) {
      AlertService.addAlert({
        severity: 'high',
        type: 'Potential Exploit Attempt',
        description: `Repeated server errors triggered by IP: ${entry.ip}`,
        ip: entry.ip,
        userId: entry.userId,
        metadata: { statusCode: entry.statusCode, endpoint: entry.endpoint }
      });
    }
  }

  private static handleSuspiciousAccess(entry: SecurityLogEntry) {
    AlertService.addAlert({
      severity: 'medium',
      type: 'Suspicious Access',
      description: `Access to suspicious endpoint: ${entry.endpoint}`,
      ip: entry.ip,
      userId: entry.userId,
      metadata: { endpoint: entry.endpoint }
    });
    this.suspiciousIPs.add(entry.ip);
  }

  private static handleSQLInjectionAttempt(entry: SecurityLogEntry) {
    AlertService.addAlert({
      severity: 'critical',
      type: 'SQL Injection Attempt',
      description: `Potential SQL injection detected from IP: ${entry.ip}`,
      ip: entry.ip,
      userId: entry.userId,
      metadata: { endpoint: entry.endpoint, details: entry.details }
    });

    this.blockedIPs.add(entry.ip);
    console.error(`🚫 IP BLOCKED due to SQL Injection attempt: ${entry.ip}`);
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
      '/passwd',
      '.git',
      'eval('
    ];

    // Whitelist legitimate admin API routes
    if (endpoint.startsWith('/api/admin') && !endpoint.includes('..')) {
        return false;
    }

    return suspiciousPatterns.some(pattern => endpoint.toLowerCase().includes(pattern.toLowerCase()));
  }

  private static containsSQLInjection(text: string): boolean {
    if (!text) return false;
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i,
      /script\s*>/i,
      /or\s+1\s*=\s*1/i,
      /'\s*or\s*'/i,
      /--/i,
      /;\s*$/i
    ];

    return sqlPatterns.some(pattern => pattern.test(text));
  }

  static getSuspiciousIPs(): Set<string> {
    return this.suspiciousIPs;
  }

  static getBlockedIPs(): Set<string> {
    return this.blockedIPs;
  }

  static isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  static isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }
}