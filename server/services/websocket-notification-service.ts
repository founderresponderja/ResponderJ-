
/**
 * 🔔 SERVIÇO DE NOTIFICAÇÕES EM TEMPO REAL
 * WebSocket para notificações instantâneas aos utilizadores
 */

import WebSocket from 'ws';
import { storage } from '../storage.js';

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  connectionTime: Date;
  isAlive: boolean;
}

interface NotificationPayload {
  type: 'credit' | 'response' | 'system' | 'trial' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class WebSocketNotificationService {
  private static instance: WebSocketNotificationService;
  private clients: Map<string, WebSocketClient> = new Map();
  private wss?: WebSocket.Server;

  private constructor() {}

  public static getInstance(): WebSocketNotificationService {
    if (!WebSocketNotificationService.instance) {
      WebSocketNotificationService.instance = new WebSocketNotificationService();
    }
    return WebSocketNotificationService.instance;
  }

  /**
   * 🚀 Inicializar servidor WebSocket
   */
  public initialize(server: any): void {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/notifications'
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Heartbeat para manter conexões ativas
    setInterval(() => {
      this.heartbeat();
    }, 30000); // 30 segundos

    console.log('🔔 WebSocket Notification Service inicializado');
  }

  /**
   * 🤝 Gerir nova conexão WebSocket
   */
  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      // Extrair userId da query string ou headers
      // Nota: Em ambiente real, deve-se validar o token de sessão/cookie
      const url = new URL(req.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      
      // Simulação de autenticação básica para Websocket
      if (!userId) {
        ws.close(1008, 'Autenticação necessária');
        return;
      }

      // Validar utilizador
      const user = await storage.getUserById(userId);
      if (!user) {
        ws.close(1008, 'Utilizador inválido');
        return;
      }

      // Adicionar cliente
      const client: WebSocketClient = {
        ws,
        userId,
        connectionTime: new Date(),
        isAlive: true
      };

      this.clients.set(userId, client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(userId);
        // console.log(`🔔 Cliente ${userId} desconectado`);
      });

      ws.on('error', (error) => {
        console.error(`❌ Erro WebSocket para ${userId}:`, error);
        this.clients.delete(userId);
      });

      // Enviar confirmação de conexão
      this.sendToClient(userId, {
        type: 'system',
        title: 'Conectado',
        message: 'Notificações em tempo real ativas',
        priority: 'low'
      });

      // console.log(`✅ Cliente ${userId} conectado via WebSocket`);

    } catch (error) {
      console.error('❌ Erro ao processar conexão WebSocket:', error);
      ws.close(1011, 'Erro interno');
    }
  }

  /**
   * 💓 Heartbeat para manter conexões
   */
  private heartbeat(): void {
    this.clients.forEach((client, userId) => {
      if (!client.isAlive) {
        // console.log(`💔 Removendo cliente inativo: ${userId}`);
        client.ws.terminate();
        this.clients.delete(userId);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });
  }

  /**
   * 📤 Enviar notificação para utilizador específico
   */
  public async sendToClient(userId: string, notification: NotificationPayload): Promise<boolean> {
    const client = this.clients.get(userId);
    
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      // Cliente não conectado - poderia guardar na BD para entrega posterior
      return false;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        ...notification
      };

      client.ws.send(JSON.stringify(payload));
      
      // Aqui poderia salvar também na base de dados de notificações
      
      return true;
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação para ${userId}:`, error);
      return false;
    }
  }

  /**
   * 📢 Broadcast para todos os utilizadores conectados
   */
  public async broadcastToAll(notification: NotificationPayload): Promise<number> {
    let successCount = 0;
    
    for (const userId of this.clients.keys()) {
      const success = await this.sendToClient(userId, notification);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * 👥 Broadcast para utilizadores específicos
   */
  public async broadcastToUsers(userIds: string[], notification: NotificationPayload): Promise<number> {
    let successCount = 0;
    
    for (const userId of userIds) {
      const success = await this.sendToClient(userId, notification);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * 📊 Estatísticas de conexões
   */
  public getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByUser: Array<{userId: string; connectionTime: Date}>;
  } {
    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(c => c.isAlive).length,
      connectionsByUser: Array.from(this.clients.entries()).map(([userId, client]) => ({
        userId,
        connectionTime: client.connectionTime
      }))
    };
  }

  /**
   * 🔔 Enviar notificação de créditos baixos
   */
  public async notifyLowCredits(userId: string, remainingCredits: number): Promise<void> {
    await this.sendToClient(userId, {
      type: 'credit',
      title: 'Créditos Baixos',
      message: `Restam apenas ${remainingCredits} créditos. Considere fazer um upgrade.`,
      priority: 'high',
      actionUrl: '/billing',
      metadata: { remainingCredits }
    });
  }

  /**
   * 🎯 Enviar notificação de resposta gerada
   */
  public async notifyResponseGenerated(userId: string, responseCount: number): Promise<void> {
    await this.sendToClient(userId, {
      type: 'response',
      title: 'Resposta Gerada',
      message: `Nova resposta IA gerada com sucesso. Total: ${responseCount}`,
      priority: 'medium',
      actionUrl: '/dashboard',
      metadata: { responseCount }
    });
  }

  /**
   * ⏰ Enviar notificação de trial
   */
  public async notifyTrialExpiring(userId: string, daysRemaining: number): Promise<void> {
    await this.sendToClient(userId, {
      type: 'trial',
      title: 'Trial a Expirar',
      message: `O seu trial expira em ${daysRemaining} dias. Não perca o acesso!`,
      priority: 'high',
      actionUrl: '/billing',
      metadata: { daysRemaining }
    });
  }
}

// Singleton export
export const wsNotificationService = WebSocketNotificationService.getInstance();
