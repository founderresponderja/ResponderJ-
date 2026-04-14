import { LoggingService, SecurityLogEntry } from "./logging-service.js";
import { AlertService } from "./alert-service.js";
import { ThreatDetectionService } from "./threat-detection-service.js";
import { SecurityMetricsService } from "./security-metrics-service.js";

export class SecurityService {
  private static instance: SecurityService;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  static addLog(logData: Omit<SecurityLogEntry, 'id' | 'timestamp'>) {
    const entry = LoggingService.addLog(logData);
    
    // Analyze for threats after adding
    ThreatDetectionService.analyzeLogEntry(entry);
    
    // Auto-trigger alert if critical
    if (entry.level === 'critical') {
      AlertService.addAlert({
        severity: 'critical',
        type: entry.type as any, // Type casting for compatibility
        description: entry.details,
        ip: entry.ip,
        userId: entry.userId,
        metadata: {
          endpoint: entry.endpoint,
          statusCode: entry.statusCode,
          userAgent: entry.userAgent
        }
      });
    }
    
    return entry;
  }

  logActivity(type: string, action: string, details: any): void {
    SecurityService.addLog({
      level: 'info',
      type: type as any,
      ip: 'system',
      userAgent: 'BusinessMetricsService',
      endpoint: `/system/${action}`,
      details: JSON.stringify(details)
    });
  }

  static initializeSampleData() {
    LoggingService.addLog({
      level: 'info',
      type: 'access',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      endpoint: '/dashboard',
      userId: 'user123',
      details: 'Successful dashboard access',
      statusCode: 200,
      duration: '45ms'
    });

    LoggingService.addLog({
      level: 'error',
      type: 'auth',
      ip: '10.0.0.50',
      userAgent: 'curl/7.68.0',
      endpoint: '/api/auth/login',
      details: 'Failed login attempt - invalid credentials',
      statusCode: 401,
      duration: '120ms'
    });

    LoggingService.addLog({
      level: 'warning',
      type: 'rate_limit',
      ip: '203.0.113.10',
      userAgent: 'Python/3.8 urllib',
      endpoint: '/api/data',
      details: 'Rate limit exceeded',
      statusCode: 429,
      duration: '5ms'
    });

    LoggingService.addLog({
      level: 'critical',
      type: 'access',
      ip: '198.51.100.25',
      userAgent: 'sqlmap/1.5.2',
      endpoint: '/admin/../../../etc/passwd',
      details: 'Suspicious path traversal attempt',
      statusCode: 403,
      duration: '12ms'
    });
  }

  // Delegate methods to appropriate services
  static getRecentLogs = LoggingService.getRecentLogs;
  static getFilteredLogs = LoggingService.getFilteredLogs;
  static getLogs = LoggingService.getLogs;
  static exportToCSV = LoggingService.exportToCSV;
  static exportToJSON = LoggingService.exportToJSON;
  
  static getActiveAlerts = AlertService.getActiveAlerts;
  static getAlerts = AlertService.getAlerts;
  static resolveAlert = AlertService.resolveAlert;
  static resolveAlertById = AlertService.resolveAlertById;
  
  static getSecurityMetrics = SecurityMetricsService.getSecurityMetrics;
  static getMetrics = SecurityMetricsService.getMetrics;
  
  static isBlocked = ThreatDetectionService.isBlocked;
  static isSuspicious = ThreatDetectionService.isSuspicious;
}

// Initialize sample data if in development
if (process.env.NODE_ENV === 'development') {
  SecurityService.initializeSampleData();
}