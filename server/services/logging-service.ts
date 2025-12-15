import crypto from "crypto";

export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  type: 'auth' | 'access' | 'rate_limit' | 'error' | 'audit' | 'Brute Force Attack' | 'Rate Limit Abuse' | 'Server Error' | 'Suspicious Access' | 'SQL Injection Attempt';
  ip: string;
  userAgent: string;
  endpoint: string;
  userId?: string;
  sessionId?: string;
  details: string;
  statusCode?: number;
  duration?: string;
}

export class LoggingService {
  private static logs: SecurityLogEntry[] = [];
  private static maxLogEntries = 10000;

  static addLog(logData: Omit<SecurityLogEntry, 'id' | 'timestamp'>) {
    const entry: SecurityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...logData
    };

    this.logs.unshift(entry);
    
    // Manter tamanho do log controlado (Rotação de logs em memória)
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(0, this.maxLogEntries);
    }

    // Log para console em dev para debug imediato
    if (process.env.NODE_ENV === 'development') {
        const color = entry.level === 'critical' || entry.level === 'error' ? '\x1b[31m' : '\x1b[32m'; // Red or Green
        const reset = '\x1b[0m';
        // console.log(`${color}[${entry.type.toUpperCase()}] ${entry.details}${reset}`);
    }

    return entry;
  }

  static getRecentLogs(limit: number = 50): SecurityLogEntry[] {
    return this.logs.slice(0, limit);
  }

  static getFilteredLogs(limit: number, filters: any): SecurityLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    if (filters.type) {
      filteredLogs = filteredLogs.filter(log => log.type === filters.type);
    }
    if (filters.ip) {
      filteredLogs = filteredLogs.filter(log => log.ip === filters.ip);
    }
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    return filteredLogs.slice(0, limit);
  }

  static getLogs(filters: {
    range?: string;
    type?: string;
    search?: string;
    level?: string;
    limit?: number;
    offset?: number;
  } = {}): SecurityLogEntry[] {
    let filteredLogs = [...this.logs];

    // Date range filter
    if (filters.range) {
      const cutoff = this.getDateCutoff(filters.range);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp).getTime() >= cutoff
      );
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.type === filters.type);
    }

    // Level filter
    if (filters.level && filters.level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.endpoint.toLowerCase().includes(searchTerm) ||
        log.ip.toLowerCase().includes(searchTerm) ||
        log.details.toLowerCase().includes(searchTerm) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm))
      );
    }

    // Pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  static exportToCSV(logs: SecurityLogEntry[]): string {
    const headers = [
      'ID', 'Timestamp', 'Level', 'Type', 'IP', 'Endpoint', 
      'Status Code', 'Duration', 'User ID', 'Details'
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.level,
      log.type,
      log.ip,
      log.endpoint,
      log.statusCode || '',
      log.duration || '',
      log.userId || '',
      log.details.replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  static exportToJSON(logs: SecurityLogEntry[]): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalEntries: logs.length,
      logs
    }, null, 2);
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

  static getAllLogs(): SecurityLogEntry[] {
    return this.logs;
  }
}