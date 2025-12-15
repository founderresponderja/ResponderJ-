import crypto from "crypto";

export interface SecurityAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  ip: string;
  resolved: boolean;
  userId?: string;
  metadata?: any;
}

export class AlertService {
  private static alerts: SecurityAlert[] = [];

  static addAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>) {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData
    };

    this.alerts.unshift(alert);
    
    // Log crítico no console para visibilidade imediata em ambientes de produção
    console.warn(`🚨 SECURITY_ALERT[${alert.severity.toUpperCase()}]: ${alert.description}`);
    
    return alert;
  }

  static getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  static getAlerts(filters: {
    severity?: string;
    resolved?: boolean;
    limit?: number;
  } = {}): SecurityAlert[] {
    let filteredAlerts = [...this.alerts];

    // Severity filter
    if (filters.severity && filters.severity !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
    }

    // Resolved filter
    if (filters.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved === filters.resolved);
    }

    // Limit
    const limit = filters.limit || 50;
    return filteredAlerts.slice(0, limit);
  }

  static resolveAlert(alertId: string, resolution: any = {}): boolean {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex >= 0) {
      this.alerts[alertIndex].resolved = true;
      this.alerts[alertIndex].metadata = {
        ...this.alerts[alertIndex].metadata,
        ...resolution,
        resolvedAt: new Date().toISOString()
      };
      return true;
    }
    return false;
  }

  static resolveAlertById(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.metadata = { ...alert.metadata, resolvedAt: new Date().toISOString() };
      return true;
    }
    return false;
  }
}