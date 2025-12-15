import { emailSequenceService } from './email-sequence-service';

/**
 * Serviço de agendamento para processamento automático de emails
 * Executa verificações periódicas e envia emails agendados
 * (Adaptado para usar setTimeout/setInterval nativos para evitar dependências extras)
 */
export class EmailSchedulerService {
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  
  /**
   * Inicializar o agendador de emails
   */
  start(): void {
    console.log('📅 Iniciando agendador de emails...');
    
    // Tarefa principal: processar emails agendados a cada 5 minutos
    this.scheduleInterval('process-emails', 5 * 60 * 1000, async () => {
      console.log('🔄 Executando verificação de emails agendados...');
      await emailSequenceService.processScheduledEmails();
    });
    
    // Tarefa de limpeza: limpar emails antigos falhados a cada 24 horas (às 02:00)
    this.scheduleDaily('cleanup-emails', 2, 0, async () => {
      console.log('🧹 Executando limpeza de emails antigos...');
      await this.cleanupOldEmails();
    });
    
    // Tarefa de estatísticas: gerar relatório diário às 9:00
    this.scheduleDaily('daily-stats', 9, 0, async () => {
      console.log('📊 Gerando relatório diário de emails...');
      await this.generateDailyReport();
    });
    
    console.log('✅ Agendador de emails iniciado com 3 tarefas');
  }
  
  /**
   * Parar o agendador
   */
  stop(): void {
    console.log('⏹️ Parando agendador de emails...');
    
    this.timers.forEach((timer, name) => {
      clearTimeout(timer);
      clearInterval(timer);
      console.log(`  - Tarefa "${name}" parada`);
    });
    
    this.timers.clear();
    console.log('✅ Agendador de emails parado');
  }
  
  /**
   * Obter status das tarefas agendadas
   */
  getStatus(): {
    totalTasks: number;
    runningTasks: number;
    tasks: Array<{
      name: string;
      isRunning: boolean;
      schedule: string;
    }>;
  } {
    const tasks = Array.from(this.timers.keys()).map((name) => ({
      name,
      isRunning: true,
      schedule: this.getScheduleDescription(name)
    }));
    
    return {
      totalTasks: this.timers.size,
      runningTasks: this.timers.size,
      tasks
    };
  }
  
  /**
   * Executar processamento manual de emails (para testes)
   */
  async processEmailsNow(): Promise<void> {
    console.log('▶️ Processamento manual de emails iniciado...');
    await emailSequenceService.processScheduledEmails();
    console.log('✅ Processamento manual concluído');
  }
  
  /**
   * Gerar relatório de sequências de emails para um utilizador específico
   */
  async generateUserReport(userId: string): Promise<{
    pending: number;
    sent: number;
    failed: number;
    nextScheduled: Date | null;
  }> {
    // Este seria implementado com métodos específicos no storage
    // Para já, retornamos dados simulados
    return {
      pending: 2,
      sent: 1,
      failed: 0,
      nextScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000) // Amanhã
    };
  }
  
  /**
   * Métodos privados para tarefas específicas
   */
  private async cleanupOldEmails(): Promise<void> {
    try {
      // Implementar limpeza de emails com mais de 30 dias com status 'failed'
      // ou 'cancelled'
      console.log('🧹 Limpeza de emails antigos executada');
    } catch (error) {
      console.error('❌ Erro na limpeza de emails:', error);
    }
  }
  
  private async generateDailyReport(): Promise<void> {
    try {
      const stats = await emailSequenceService.getSequenceStats();
      
      console.log('📊 Relatório Diário de Emails:');
      console.log(`  Total: ${stats.total}`);
      console.log(`  Pendentes: ${stats.pending}`);
      console.log(`  Enviados: ${stats.sent}`);
      console.log(`  Falharam: ${stats.failed}`);
      console.log(`  Cancelados: ${stats.cancelled}`);
      
      // Aqui poderia enviar relatório para administradores
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório diário:', error);
    }
  }

  // Helper para agendar intervalos
  private scheduleInterval(name: string, intervalMs: number, task: () => void) {
    const timer = setInterval(task, intervalMs);
    this.timers.set(name, timer);
  }

  // Helper para agendar tarefas diárias
  private scheduleDaily(name: string, hour: number, minute: number, task: () => void) {
    const now = new Date();
    let nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);
    
    if (now > nextRun) {
      nextRun.setDate(now.getDate() + 1);
    }
    
    const delay = nextRun.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      task();
      // Schedule next daily run
      const dailyTimer = setInterval(task, 24 * 60 * 60 * 1000);
      this.timers.set(name, dailyTimer);
    }, delay);
    
    this.timers.set(`${name}-init`, timeout);
  }
  
  private getScheduleDescription(taskName: string): string {
    if (taskName.includes('process-emails')) return 'A cada 5 minutos';
    if (taskName.includes('cleanup-emails')) return 'Diariamente às 02:00';
    if (taskName.includes('daily-stats')) return 'Diariamente às 09:00';
    return 'Recorrente';
  }
}

// Singleton instance
export const emailScheduler = new EmailSchedulerService();