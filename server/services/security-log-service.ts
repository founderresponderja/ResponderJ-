import { SecurityService } from './security-service';

export class SecurityLogService {
  static addLog(log: {
    level: string;
    type: string;
    ip?: string;
    userAgent?: string;
    endpoint?: string;
    details?: string;
    statusCode?: number;
    userId?: string;
  }) {
    // Map to SecurityLogEntry format
    const logEntry = {
      level: (log.level as any) || 'info',
      type: (log.type as any) || 'access',
      ip: log.ip || 'unknown',
      userAgent: log.userAgent || 'unknown',
      endpoint: log.endpoint || 'unknown',
      details: log.details || '',
      statusCode: log.statusCode,
      userId: log.userId
    };
    
    // Use the central SecurityService which handles threats and alerts automatically
    SecurityService.addLog(logEntry);
  }
}