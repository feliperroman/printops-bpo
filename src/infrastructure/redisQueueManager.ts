/**
 * Gestor de Colas de Prioridad BPO y Concurrencia en Memoria / Redis
 * Trazabilidad: docs/03-bpo-operational-flow.md §2–§4, RF-06, RNF-02
 * 
 * Prioridades:
 * P1 (Crítica - Hardware) > P2 (Alta - Borde Laminado) > P3 (Normal - Onshape CAD)
 * 
 * Soporta conexión nativa a Redis mediante ioredis y adaptador In-Memory de baja latencia
 * para ejecución autónoma de pruebas y CI sin dependencias externas ($0 Cloud).
 */

import Redis from 'ioredis';
import { PriorityLevel, OperatorState, PrinterState } from '../domain/types';

export interface QueuedTicketItem {
  ticketId: string;
  priority: PriorityLevel;
  score: number;
  enqueuedAt: number;
  payload?: any;
}

export class RedisQueueManager {
  private redis: Redis | null = null;
  private inMemoryQueue: Map<string, QueuedTicketItem> = new Map();
  private inMemoryOperators: Map<string, { status: OperatorState; lastHeartbeat: number }> = new Map();
  private inMemoryPrinters: Map<string, PrinterState> = new Map();
  private ttlSeconds: number;

  constructor(redisUrl?: string, ttlSeconds: number = 1800) {
    this.ttlSeconds = ttlSeconds; // 30 minutos por defecto (TTL sesión)

    if (redisUrl && !redisUrl.includes('mock') && !redisUrl.includes('localhost:6379')) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000
        });
        this.redis.on('error', () => {
          // Fallback silencioso a memoria si Redis no está activo
          this.redis = null;
        });
      } catch {
        this.redis = null;
      }
    }
  }

  private calculatePriorityScore(priority: PriorityLevel, timestampMs: number = Date.now()): number {
    let weight = 100;
    if (priority === 'P1_HARDWARE_MAINTENANCE') weight = 300;
    else if (priority === 'P2_BORDERLINE_SLICING') weight = 200;
    else if (priority === 'P3_CAD_SPLIT_REDESIGN') weight = 100;

    // El score combina el peso de prioridad (multiplicado por 1e12) y el tiempo inverso
    // para garantizar ordenamiento estricto P1 > P2 > P3 y luego FIFO
    return weight * 1e12 + (1e12 - (timestampMs % 1e12));
  }

  async enqueueTicket(ticketId: string, priority: PriorityLevel, payload?: any): Promise<number> {
    const score = this.calculatePriorityScore(priority);
    const item: QueuedTicketItem = {
      ticketId,
      priority,
      score,
      enqueuedAt: Date.now(),
      payload
    };

    if (this.redis) {
      try {
        await this.redis.zadd('printops:queue:tier2', score, ticketId);
        if (payload) {
          await this.redis.set(`printops:ticket:${ticketId}`, JSON.stringify(payload), 'EX', 86400);
        }
        return await this.redis.zcard('printops:queue:tier2');
      } catch {
        // En caso de fallo en Redis, almacenar en memoria
      }
    }

    this.inMemoryQueue.set(ticketId, item);
    return this.inMemoryQueue.size;
  }

  async dispatchNextTicket(operatorId: string): Promise<QueuedTicketItem | null> {
    if (this.redis) {
      try {
        // ZPOPMAX extrae atómicamente el elemento con mayor puntuación (P1 primero)
        const popResult = await this.redis.zpopmax('printops:queue:tier2', 1);
        if (popResult && popResult.length >= 2) {
          const ticketId = popResult[0];
          const rawPayload = await this.redis.get(`printops:ticket:${ticketId}`);
          return {
            ticketId,
            priority: 'P1_HARDWARE_MAINTENANCE', // Prioridad por score
            score: Number(popResult[1]),
            enqueuedAt: Date.now(),
            payload: rawPayload ? JSON.parse(rawPayload) : undefined
          };
        }
      } catch {
        // Fallback a memoria
      }
    }

    if (this.inMemoryQueue.size === 0) return null;

    // Buscar el elemento con mayor score en memoria
    const sorted = Array.from(this.inMemoryQueue.values()).sort((a, b) => b.score - a.score);
    const highest = sorted[0];
    this.inMemoryQueue.delete(highest.ticketId);

    // Actualizar estado del operador a ocupado
    this.setOperatorStatus(
      operatorId,
      highest.priority === 'P1_HARDWARE_MAINTENANCE' ? 'BUSY_MAINTENANCE' : 'BUSY_CAD_DESIGN'
    );

    return highest;
  }

  setOperatorStatus(operatorId: string, status: OperatorState) {
    this.inMemoryOperators.set(operatorId, {
      status,
      lastHeartbeat: Date.now()
    });
  }

  getOperatorStatus(operatorId: string): OperatorState {
    const op = this.inMemoryOperators.get(operatorId);
    if (!op) return 'OFFLINE';

    // Verificar TTL de 30 minutos sin actividad
    const elapsedSeconds = (Date.now() - op.lastHeartbeat) / 1000;
    if (elapsedSeconds > this.ttlSeconds) {
      op.status = 'OFFLINE';
      return 'OFFLINE';
    }

    return op.status;
  }

  setPrinterStatus(printerId: string, status: PrinterState) {
    this.inMemoryPrinters.set(printerId, status);
  }

  getPrinterStatus(printerId: string): PrinterState {
    return this.inMemoryPrinters.get(printerId) || 'IDLE_READY';
  }

  getQueueSnapshot(): QueuedTicketItem[] {
    return Array.from(this.inMemoryQueue.values()).sort((a, b) => b.score - a.score);
  }

  getQueueLength(): number {
    return this.inMemoryQueue.size;
  }

  clear() {
    this.inMemoryQueue.clear();
    this.inMemoryOperators.clear();
    this.inMemoryPrinters.clear();
  }
}
