/**
 * Performance Optimizations for Responder Já
 * Optimizações específicas para melhorar performance e gestão de memória
 */

import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';
import { Buffer } from 'buffer';
import process from 'process';

// Cache de respostas IA com gestão de memória
export class ResponseCache {
  private cache: LRUCache<string, CachedResponse>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000, ttl: number = 3600000) { // 1 hora TTL
    this.cache = new LRUCache({
      max: maxSize,
      ttl: ttl,
      maxSize: 50 * 1024 * 1024, // 50MB máximo
      sizeCalculation: (value: CachedResponse) => {
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
      },
      dispose: (value: any, key: string) => {
        console.log(`Cache disposal: ${key} (size: ${Buffer.byteLength(JSON.stringify(value), 'utf8')} bytes)`);
      }
    });
  }

  get(key: string): CachedResponse | undefined {
    const result = this.cache.get(key);
    if (result) {
      this.hits++;
      return result;
    } else {
      this.misses++;
      return undefined;
    }
  }

  set(key: string, response: string, metadata: ResponseMetadata): void {
    const cachedResponse: CachedResponse = {
      response,
      metadata,
      timestamp: Date.now(),
      accessCount: 0
    };
    this.cache.set(key, cachedResponse);
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) * 100,
      calculatedSize: this.cache.calculatedSize
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

interface CachedResponse {
  response: string;
  metadata: ResponseMetadata;
  timestamp: number;
  accessCount: number;
}

interface ResponseMetadata {
  platform: string;
  tone: string;
  language: string;
  userId: string;
}

// Pool de conexões optimizado
export class ConnectionPool {
  private connections: Connection[] = [];
  private available: Connection[] = [];
  private pending: Array<{ resolve: (conn: Connection) => void; reject: (err: Error) => void }> = [];
  private maxConnections: number;
  private connectionTimeout: number;

  constructor(maxConnections: number = 20, connectionTimeout: number = 30000) {
    this.maxConnections = maxConnections;
    this.connectionTimeout = connectionTimeout;
  }

  async acquire(): Promise<Connection> {
    // Verificar conexões disponíveis
    const availableConnection = this.available.pop();
    if (availableConnection && availableConnection.isValid()) {
      return availableConnection;
    }

    // Criar nova conexão se possível
    if (this.connections.length < this.maxConnections) {
      const connection = await this.createConnection();
      this.connections.push(connection);
      return connection;
    }

    // Aguardar na fila
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.resolve === resolve);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      this.pending.push({
        resolve: (conn: Connection) => {
          clearTimeout(timeout);
          resolve(conn);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  release(connection: Connection): void {
    if (!connection.isValid()) {
      // Remover conexão inválida
      const index = this.connections.indexOf(connection);
      if (index >= 0) {
        this.connections.splice(index, 1);
      }
      return;
    }

    // Atender fila de espera primeiro
    const pending = this.pending.shift();
    if (pending) {
      pending.resolve(connection);
      return;
    }

    // Retornar para pool disponível
    this.available.push(connection);
  }

  private async createConnection(): Promise<Connection> {
    // Simular criação de conexão
    return new Connection();
  }

  getStats() {
    return {
      total: this.connections.length,
      available: this.available.length,
      pending: this.pending.length,
      inUse: this.connections.length - this.available.length
    };
  }

  async close(): Promise<void> {
    // Fechar todas as conexões
    await Promise.all(this.connections.map(conn => conn.close()));
    this.connections = [];
    this.available = [];
    
    // Rejeitar requisições pendentes
    this.pending.forEach(p => p.reject(new Error('Pool closed')));
    this.pending = [];
  }
}

class Connection {
  private createdAt: number = Date.now();
  private lastUsed: number = Date.now();
  private closed: boolean = false;

  isValid(): boolean {
    const maxAge = 60 * 60 * 1000; // 1 hora
    const now = Date.now();
    return !this.closed && (now - this.createdAt < maxAge);
  }

  use(): void {
    this.lastUsed = Date.now();
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

// Rate limiter com sliding window
export class RateLimiter {
  private windows = new Map<string, SlidingWindow>();
  private cleanup: ReturnType<typeof setInterval>;

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minuto
  ) {
    // Limpeza periódica
    this.cleanup = setInterval(() => {
      this.cleanupExpiredWindows();
    }, this.windowMs);
  }

  async isAllowed(identifier: string): Promise<boolean> {
    const now = Date.now();
    const window = this.getOrCreateWindow(identifier);
    
    // Remover requisições antigas
    window.removeOldRequests(now - this.windowMs);
    
    // Verificar limite
    if (window.count() >= this.maxRequests) {
      return false;
    }
    
    // Adicionar nova requisição
    window.addRequest(now);
    return true;
  }

  private getOrCreateWindow(identifier: string): SlidingWindow {
    let window = this.windows.get(identifier);
    if (!window) {
      window = new SlidingWindow();
      this.windows.set(identifier, window);
    }
    return window;
  }

  private cleanupExpiredWindows(): void {
    const now = Date.now();
    for (const [identifier, window] of Array.from(this.windows.entries())) {
      window.removeOldRequests(now - this.windowMs);
      if (window.count() === 0) {
        this.windows.delete(identifier);
      }
    }
  }

  getStats() {
    return {
      activeWindows: this.windows.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }

  destroy(): void {
    if (this.cleanup) {
      clearInterval(this.cleanup);
    }
    this.windows.clear();
  }
}

class SlidingWindow {
  private requests: number[] = [];

  addRequest(timestamp: number): void {
    this.requests.push(timestamp);
  }

  removeOldRequests(cutoff: number): void {
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  count(): number {
    return this.requests.length;
  }
}

// Monitor de performance
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private gcStats: GCStats = { count: 0, duration: 0, lastGC: 0 };

  constructor() {
    // Monitorar garbage collection se disponível
    const p = process as any;
    if (p.versions && p.versions.node && parseInt(p.versions.node) >= 14) {
      this.setupGCMonitoring();
    }
  }

  startTimer(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    let metric = this.metrics.get(label);
    if (!metric) {
      metric = {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        average: 0
      };
      this.metrics.set(label, metric);
    }

    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.average = metric.total / metric.count;
  }

  getMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics);
  }

  getMemoryUsage() {
    const p = process as any;
    const usage = p.memoryUsage ? p.memoryUsage() : { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
    return {
      heap: {
        used: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100
      },
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      gc: this.gcStats
    };
  }

  private setupGCMonitoring(): void {
    const g = globalThis as any;
    if (g.gc) {
      const originalGC = g.gc;
      g.gc = async () => {
        const start = performance.now();
        originalGC();
        const duration = performance.now() - start;
        
        this.gcStats.count++;
        this.gcStats.duration += duration;
        this.gcStats.lastGC = Date.now();
      };
    }
  }

  reset(): void {
    this.metrics.clear();
    this.gcStats = { count: 0, duration: 0, lastGC: 0 };
  }
}

interface PerformanceMetric {
  count: number;
  total: number;
  min: number;
  max: number;
  average: number;
}

interface GCStats {
  count: number;
  duration: number;
  lastGC: number;
}

// Singleton instances para uso global
export const responseCache = new ResponseCache(1000, 3600000);
export const connectionPool = new ConnectionPool(20, 30000);
export const rateLimiter = new RateLimiter(100, 60000);
export const performanceMonitor = new PerformanceMonitor();

// Funções de cleanup para graceful shutdown
export function cleanup(): Promise<void[]> {
  return Promise.all([
    connectionPool.close(),
    new Promise<void>(resolve => {
      rateLimiter.destroy();
      resolve();
    }),
    new Promise<void>(resolve => {
      responseCache.clear();
      resolve();
    })
  ]);
}

// Middleware para Express
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const timer = performanceMonitor.startTimer(`${req.method} ${req.path}`);
    
    res.on('finish', () => {
      timer();
      performanceMonitor.recordMetric('response_size', res.get('content-length') || 0);
      performanceMonitor.recordMetric('status_' + res.statusCode, 1);
    });
    
    next();
  };
}

// Rate limiting middleware
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
  const limiter = new RateLimiter(maxRequests, windowMs);
  
  return async (req: any, res: any, next: any) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    
    const allowed = await limiter.isAllowed(identifier);
    if (!allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    next();
  };
}
