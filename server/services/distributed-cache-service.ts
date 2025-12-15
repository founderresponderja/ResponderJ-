import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import zlib from 'zlib';

interface CacheItem<T = any> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  compressed?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
  compressionRatio: number;
}

interface CacheConfig {
  maxSize: number; // MB
  defaultTTL: number; // seconds
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  enableTags: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export class DistributedCacheService {
  private cache: LRUCache<string, CacheItem>;
  private stats: CacheStats;
  private config: CacheConfig;
  private tagIndex = new Map<string, Set<string>>(); // tag -> Set<keys>
  private compressionEnabled: boolean;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100, // 100MB default
      defaultTTL: 3600, // 1 hour default
      compressionThreshold: 1024, // 1KB threshold
      enableCompression: true,
      enableTags: true,
      evictionPolicy: 'lru',
      ...config
    };

    this.compressionEnabled = this.config.enableCompression && this.isCompressionAvailable();

    this.cache = new LRUCache<string, CacheItem>({
      max: 10000, // Maximum number of items
      maxSize: this.config.maxSize * 1024 * 1024, // Convert MB to bytes
      sizeCalculation: (item: CacheItem) => {
        return this.calculateItemSize(item);
      },
      dispose: (value: CacheItem, key: string) => {
        this.stats.evictions++;
        this.removeFromTagIndex(key, value.tags);
      },
      ttl: this.config.defaultTTL * 1000, // Convert to milliseconds
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
      evictions: 0,
      compressionRatio: 1
    };

    this.startStatsUpdater();
  }

  /**
   * Armazena um item no cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options?: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    }
  ): Promise<boolean> {
    try {
      const ttl = (options?.ttl || this.config.defaultTTL) * 1000;
      const tags = options?.tags || [];
      const now = Date.now();

      let finalValue = value;
      let compressed = false;

      // Compressão se habilitada e valor for grande o suficiente
      if (this.compressionEnabled && options?.compress !== false) {
        const serialized = JSON.stringify(value);
        if (serialized.length > this.config.compressionThreshold) {
          finalValue = await this.compressValue(serialized) as T;
          compressed = true;
        }
      }

      const item: CacheItem<T> = {
        value: finalValue,
        ttl,
        createdAt: now,
        accessCount: 0,
        lastAccessed: now,
        tags,
        compressed
      };

      this.cache.set(key, item, { ttl });

      // Indexar tags se habilitado
      if (this.config.enableTags && tags.length > 0) {
        this.addToTagIndex(key, tags);
      }

      return true;
    } catch (error) {
      console.error(`Erro ao definir cache para chave ${key}:`, error);
      return false;
    }
  }

  /**
   * Obtém um item do cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const item = this.cache.get(key) as CacheItem<T> | undefined;

      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      // Verificar TTL manual se necessário
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      // Atualizar estatísticas de acesso
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.stats.hits++;
      this.updateHitRate();

      // Descomprimir se necessário
      if (item.compressed) {
        const decompressed = await this.decompressValue(item.value as string);
        return JSON.parse(decompressed) as T;
      }

      return item.value;
    } catch (error) {
      console.error(`Erro ao obter cache para chave ${key}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const item = this.cache.peek(key);
    return item ? !this.isExpired(item) : false;
  }

  /**
   * Remove um item do cache
   */
  delete(key: string): boolean {
    const item = this.cache.peek(key);
    if (item && this.config.enableTags) {
      this.removeFromTagIndex(key, item.tags);
    }
    return this.cache.delete(key);
  }

  /**
   * Remove todos os itens com uma tag específica
   */
  deleteByTag(tag: string): number {
    if (!this.config.enableTags) {
      return 0;
    }

    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let deletedCount = 0;
    for (const key of Array.from(keys)) {
      if (this.cache.delete(key)) {
        deletedCount++;
      }
    }

    this.tagIndex.delete(tag);
    return deletedCount;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.resetStats();
  }

  /**
   * Obtém todas as chaves do cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cache com pattern get-or-set
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options?: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    }
  ): Promise<T> {
    // Tentar obter do cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Se não existir, gerar valor
    const value = await factory();
    
    // Armazenar no cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Atualiza TTL de um item
   */
  touch(key: string, ttl?: number): boolean {
    const item = this.cache.peek(key);
    if (!item) {
      return false;
    }

    const newTTL = (ttl || this.config.defaultTTL) * 1000;
    item.ttl = newTTL;
    item.lastAccessed = Date.now();

    // Re-inserir com novo TTL
    this.cache.set(key, item, { ttl: newTTL });
    return true;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats & {
    config: CacheConfig;
    itemCount: number;
    averageItemSize: number;
    topKeys: Array<{ key: string; accessCount: number; size: number }>;
  } {
    this.updateMemoryUsage();

    // Obter top 10 chaves mais acessadas
    const allItems = Array.from(this.cache.entries() as Iterable<[string, CacheItem]>)
      .map(([key, item]) => ({
        key,
        accessCount: item.accessCount,
        size: this.calculateItemSize(item)
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      ...this.stats,
      config: this.config,
      itemCount: this.cache.size,
      averageItemSize: this.cache.size > 0 ? this.stats.memoryUsage / this.cache.size : 0,
      topKeys: allItems
    };
  }

  /**
   * Optimiza o cache removendo itens expirados
   */
  optimize(): {
    removedExpired: number;
    removedLeastUsed: number;
    memoryFreed: number;
  } {
    const initialSize = this.cache.size;
    const initialMemory = this.stats.memoryUsage;

    let removedExpired = 0;
    let removedLeastUsed = 0;

    // Remover itens expirados
    for (const [key, item] of this.cache.entries() as Iterable<[string, CacheItem]>) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        removedExpired++;
      }
    }

    // Se ainda estivermos perto do limite, remover itens menos usados
    if (this.cache.calculatedSize && this.cache.calculatedSize > (this.config.maxSize * 0.8 * 1024 * 1024)) {
      const sortedByUsage = Array.from(this.cache.entries() as Iterable<[string, CacheItem]>)
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, Math.floor(this.cache.size * 0.1)); // Remover 10% dos menos usados

      for (const [key] of sortedByUsage) {
        this.cache.delete(key);
        removedLeastUsed++;
      }
    }

    const memoryFreed = initialMemory - this.stats.memoryUsage;

    return {
      removedExpired,
      removedLeastUsed,
      memoryFreed
    };
  }

  /**
   * Gera relatório detalhado do cache
   */
  generateReport(): {
    summary: CacheStats;
    performance: {
      hitRate: number;
      avgResponseTime: number;
      compressionEfficiency: number;
    };
    memory: {
      usage: number;
      efficiency: number;
      largestItems: Array<{ key: string; size: number }>;
    };
    tags: Array<{ tag: string; keyCount: number }>;
  } {
    const stats = this.getStats();
    
    // Analisar items por tamanho
    const itemsBySizeDesc = Array.from(this.cache.entries() as Iterable<[string, CacheItem]>)
      .map(([key, item]) => ({
        key,
        size: this.calculateItemSize(item)
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Analisar tags
    const tagStats = Array.from(this.tagIndex.entries())
      .map(([tag, keys]) => ({
        tag,
        keyCount: keys.size
      }))
      .sort((a, b) => b.keyCount - a.keyCount);

    return {
      summary: stats,
      performance: {
        hitRate: stats.hitRate,
        avgResponseTime: 15, // Simulado
        compressionEfficiency: stats.compressionRatio
      },
      memory: {
        usage: stats.memoryUsage,
        efficiency: (stats.hits / (stats.hits + stats.misses + 1)) * 100,
        largestItems: itemsBySizeDesc
      },
      tags: tagStats
    };
  }

  // === MÉTODOS PRIVADOS ===

  private isExpired(item: CacheItem): boolean {
    return Date.now() > (item.createdAt + item.ttl);
  }

  private calculateItemSize(item: CacheItem): number {
    try {
      const serialized = JSON.stringify(item);
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      return 1000; // Fallback size
    }
  }

  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = this.cache.calculatedSize || 0;
    this.stats.size = this.cache.size;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
      evictions: 0,
      compressionRatio: 1
    };
  }

  private isCompressionAvailable(): boolean {
    return typeof zlib !== 'undefined';
  }

  private async compressValue(value: string): Promise<string> {
    if (!this.compressionEnabled) {
      return value;
    }

    try {
      const compressed = zlib.gzipSync(Buffer.from(value, 'utf8'));
      return compressed.toString('base64');
    } catch {
      return value;
    }
  }

  private async decompressValue(compressedValue: string): Promise<string> {
    if (!this.compressionEnabled) {
      return compressedValue;
    }

    try {
      const buffer = Buffer.from(compressedValue, 'base64');
      const decompressed = zlib.gunzipSync(buffer);
      return decompressed.toString('utf8');
    } catch {
      return compressedValue;
    }
  }

  private startStatsUpdater(): void {
    // Atualizar estatísticas a cada 30 segundos
    setInterval(() => {
      this.updateMemoryUsage();
      
      // Auto-optimização se necessário
      if (this.cache.size > 8000) { // 80% do limite
        this.optimize();
      }
    }, 30000);
  }

  /**
   * Cleanup no shutdown
   */
  destroy(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }
}

// Instâncias especializadas
export const responseCache = new DistributedCacheService({
  maxSize: 50, // 50MB para respostas IA
  defaultTTL: 3600, // 1 hora
  enableCompression: true,
  enableTags: true
});

export const sessionCache = new DistributedCacheService({
  maxSize: 20, // 20MB para sessões
  defaultTTL: 1800, // 30 minutos
  enableCompression: false, // Sessões são pequenas
  enableTags: false
});

export const apiCache = new DistributedCacheService({
  maxSize: 30, // 30MB para respostas de API
  defaultTTL: 300, // 5 minutos
  enableCompression: true,
  enableTags: true
});

// Cache principal
export const distributedCache = new DistributedCacheService({
  maxSize: 100,
  defaultTTL: 3600,
  enableCompression: true,
  enableTags: true
});
