
export const businessMetricsService = {
  async getCriticalMetricsDashboard() {
    return {
      revenue: { totalRevenue: 12450, growth: 15 },
      users: { activeUsers24h: 85, totalUsers: 127 },
      performance: { uptime: "99.9%", averageResponseTime: 124, successRate: 99.2 },
      alerts: this.getActiveAlerts()
    };
  },

  async getMetricsByCategory(category: string) {
    // Mock data simulation
    return { 
      category, 
      value: Math.floor(Math.random() * 100),
      trend: 'up',
      timestamp: new Date().toISOString()
    };
  },

  getActiveAlerts() {
    return [
      { id: "1", severity: "warning", message: "High memory usage on Storage node", timestamp: new Date().toISOString() },
      { id: "2", severity: "info", message: "Daily backup completed successfully", timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: "3", severity: "error", message: "Failed payment webhook delivery (retry scheduled)", timestamp: new Date(Date.now() - 14400000).toISOString() }
    ];
  },

  async acknowledgeAlert(id: string, userId: string) {
    console.log(`Alert ${id} acknowledged by ${userId}`);
    return true;
  },

  async resolveAlert(id: string) {
    console.log(`Alert ${id} resolved`);
    return true;
  },

  async forceMetricsUpdate() {
    console.log("Metrics update forced");
    return true;
  }
};
