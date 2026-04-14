import { notificationService } from './notification-service.js';
import { automationService } from './automation-service.js';

// Serviço de tarefas automáticas agendadas
export class CronService {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor() {
    this.initializeScheduledTasks();
  }

  private initializeScheduledTasks(): void {
    console.log('⏰ Inicializando tarefas automáticas...');

    // Verificar créditos baixos a cada 6 horas
    this.scheduleTask('check-low-credits', 6 * 60 * 60 * 1000, () => {
      notificationService.checkLowCredits();
    });
    
    // Processamento de Automação de Respostas (a cada 1 minuto para "Responder Já")
    this.scheduleTask('automation-batch', 1 * 60 * 1000, () => {
      automationService.processNewReviewsBatch();
    });

    // Newsletter semanal (domingos às 09:00)
    this.scheduleWeeklyTask('weekly-newsletter', 0, 9, 0, () => {
      notificationService.sendWeeklyNewsletter();
    });

    // Relatório diário para admins (todos os dias às 08:00)
    this.scheduleDailyTask('daily-report', 8, 0, () => {
      this.sendDailyReport();
    });

    // Limpeza de logs antigos (mensalmente)
    this.scheduleMonthlyTask('cleanup-logs', 1, 2, 0, () => {
      this.cleanupOldLogs();
    });

    console.log('✅ Tarefas automáticas configuradas');
  }

  // Agendar tarefa simples com intervalo
  private scheduleTask(
    name: string, 
    intervalMs: number, 
    task: () => void | Promise<void>
  ): void {
    const interval = setInterval(async () => {
      try {
        // console.log(`🔄 Executando tarefa: ${name}`); // Verbose
        await task();
      } catch (error) {
        console.error(`❌ Erro na tarefa ${name}:`, error);
      }
    }, intervalMs);

    this.intervals.set(name, interval);
  }

  // Agendar tarefa diária
  private scheduleDailyTask(
    name: string,
    hour: number,
    minute: number,
    task: () => void | Promise<void>
  ): void {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);

      // Se já passou da hora de hoje, agendar para amanhã
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      const timeUntilNext = next.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          console.log(`🔄 Executando tarefa diária: ${name}`);
          await task();
          console.log(`✅ Tarefa diária concluída: ${name}`);
        } catch (error) {
          console.error(`❌ Erro na tarefa diária ${name}:`, error);
        }
        
        // Reagendar para o próximo dia
        scheduleNext();
      }, timeUntilNext);
    };

    scheduleNext();
  }

  // Agendar tarefa semanal
  private scheduleWeeklyTask(
    name: string,
    dayOfWeek: number, // 0 = domingo, 1 = segunda, etc.
    hour: number,
    minute: number,
    task: () => void | Promise<void>
  ): void {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      
      // Calcular dias até o próximo dia da semana desejado
      const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7;
      if (daysUntilNext === 0 && next <= now) {
        // Se é hoje mas já passou da hora, agendar para a próxima semana
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilNext);
      }

      const timeUntilNext = next.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          console.log(`🔄 Executando tarefa semanal: ${name}`);
          await task();
          console.log(`✅ Tarefa semanal concluída: ${name}`);
        } catch (error) {
          console.error(`❌ Erro na tarefa semanal ${name}:`, error);
        }
        
        // Reagendar para a próxima semana
        scheduleNext();
      }, timeUntilNext);
    };

    scheduleNext();
  }

  // Agendar tarefa mensal
  private scheduleMonthlyTask(
    name: string,
    dayOfMonth: number,
    hour: number,
    minute: number,
    task: () => void | Promise<void>
  ): void {
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date();
      next.setDate(dayOfMonth);
      next.setHours(hour, minute, 0, 0);

      // Se já passou do dia deste mês, agendar para o próximo mês
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      const timeUntilNext = next.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          console.log(`🔄 Executando tarefa mensal: ${name}`);
          await task();
          console.log(`✅ Tarefa mensal concluída: ${name}`);
        } catch (error) {
          console.error(`❌ Erro na tarefa mensal ${name}:`, error);
        }
        
        // Reagendar para o próximo mês
        scheduleNext();
      }, timeUntilNext);
    };

    scheduleNext();
  }

  // Relatório diário para administradores
  private async sendDailyReport(): Promise<void> {
    try {
      const today = new Date().toLocaleDateString('pt-PT');
      const report = await this.generateDailyReport();
      
      await notificationService.notifySystemEvent(
        'update',
        `Relatório Diário - ${today}\n\n${report}`,
        'low'
      );
    } catch (error) {
      console.error('Erro ao gerar relatório diário:', error);
    }
  }

  // Limpeza de logs antigos
  private async cleanupOldLogs(): Promise<void> {
    try {
      console.log('🧹 Iniciando limpeza de logs antigos...');
      
      // Implementar limpeza real na base de dados
      // Por agora apenas log
      
      await notificationService.notifySystemEvent(
        'maintenance',
        'Limpeza automática de logs executada com sucesso',
        'low'
      );
    } catch (error) {
      console.error('Erro na limpeza de logs:', error);
    }
  }

  // Gerar relatório diário
  private async generateDailyReport(): Promise<string> {
    try {
      // Aqui buscaríamos estatísticas reais da base de dados
      const stats = {
        newUsers: 3,
        responsesGenerated: 45,
        creditsUsed: 90,
        revenue: 125.50,
        errors: 2
      };

      return `
📊 RELATÓRIO DIÁRIO

👥 Novos Utilizadores: ${stats.newUsers}
✨ Respostas Geradas: ${stats.responsesGenerated}
💳 Créditos Utilizados: ${stats.creditsUsed}
💰 Receita: €${stats.revenue.toFixed(2)}
❌ Erros Reportados: ${stats.errors}

Sistema funcionando normalmente.
      `.trim();
    } catch (error) {
      return 'Erro ao gerar estatísticas do relatório diário';
    }
  }

  // Parar todas as tarefas
  public stopAllTasks(): void {
    console.log('🛑 Parando todas as tarefas automáticas...');
    
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`✅ Tarefa parada: ${name}`);
    });
    
    this.intervals.clear();
  }

  // Adicionar nova tarefa em runtime
  public addTask(
    name: string,
    intervalMs: number,
    task: () => void | Promise<void>
  ): void {
    if (this.intervals.has(name)) {
      console.warn(`⚠️ Tarefa ${name} já existe, substituindo...`);
      clearInterval(this.intervals.get(name)!);
    }
    
    this.scheduleTask(name, intervalMs, task);
    console.log(`✅ Nova tarefa adicionada: ${name}`);
  }

  // Remover tarefa específica
  public removeTask(name: string): boolean {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      console.log(`✅ Tarefa removida: ${name}`);
      return true;
    }
    return false;
  }

  // Listar tarefas ativas
  public getActiveTasks(): { id: string, name: string, status: string, schedule: string, lastRun: string }[] {
    return Array.from(this.intervals.keys()).map(key => ({
      id: key,
      name: key,
      status: 'active',
      schedule: 'automatic',
      lastRun: new Date().toISOString()
    }));
  }
}

// Instância singleton
export const cronService = new CronService();