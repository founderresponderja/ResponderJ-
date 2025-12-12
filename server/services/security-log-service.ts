
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
    // Implementação básica de log para consola
    const timestamp = new Date().toISOString();
    console.log(`[SECURITY][${log.level.toUpperCase()}] ${timestamp} - ${log.type}: ${log.details} (IP: ${log.ip}${log.userId ? `, User: ${log.userId}` : ''})`);
  }
}
