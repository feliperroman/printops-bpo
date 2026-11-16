/**
 * Gestor de Colas de Prioridad BPO y Concurrencia en Memoria / Redis
 * Trazabilidad: docs/03-bpo-operational-flow.md §2–§4, RF-06, RNF-02, Caso Borde 06 y 07
 * 
 * Prioridades:
 * P1 (Crítica - Hardware) > P2 (Alta - Borde Laminado) > P3 (Normal - Onshape CAD)
 * 
 * Soporta conexión nativa a Redis mediante ioredis (write-through) y estado en memoria
 * sincronizado de baja latencia para pruebas locales y CI/CD ($0 Cloud).
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

export interface SlaBreachEvaluation {
  sla_breach_risk: boolean;
  reasons: string[];
  queue_length: number;
  oldest_p1_wait_seconds: number;
}

export class RedisQueueManager {
  private redis: Redis | null = null;
  private inMemoryQueue: Map<string, QueuedTicketItem> = new Map();
  private inMemoryOperators: Map<
    string,
    { status: OperatorState; lastHeartbeat: number; activeTicket?: QueuedTicketItem }
  > = new Map();
  private inMemoryPrinters: Map<string, PrinterState> = new Map();
  private ttlSeconds: number;
  private slaBreachTriggered = false;

  constructor(redisUrl?: string, ttlSeconds: number = 1800) {
    this.ttlSeconds = ttlSeconds; // 30 minutos por defecto (TTL sesión)

    if (redisUrl && !redisUrl.includes('mock')) {
      try {
        this.redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 1500
        });
        this.redis.on('error', () => {
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

  async enqueueTicket(
    ticketId: string,
    priority: PriorityLevel,
    payload?: any,
    enqueuedAtMs: number = Date.now()
  ): Promise<number> {
    const score = this.calculatePriorityScore(priority, enqueuedAtMs);
    const item: QueuedTicketItem = {
      ticketId,
      priority,
      score,
      enqueuedAt: enqueuedAtMs,
      payload
    };

    this.inMemoryQueue.set(ticketId, item);

    if (this.redis) {
      try {
        await this.redis.zadd('printops:queue:tier2', score, ticketId);
        if (payload) {
          await this.redis.set(`printops:ticket:${ticketId}`, JSON.stringify(payload), 'EX', 86400);
        }
      } catch {
        this.redis = null;
      }
    }

    return this.inMemoryQueue.size;
  }

  async dispatchNextTicket(operatorId: string): Promise<QueuedTicketItem | null> {
    if (this.inMemoryQueue.size === 0) return null;

    // Buscar el elemento con mayor score de forma atómica
    const sorted = Array.from(this.inMemoryQueue.values()).sort((a, b) => b.score - a.score);
    const highest = sorted[0];
    this.inMemoryQueue.delete(highest.ticketId);

    if (this.redis) {
      try {
        await this.redis.zrem('printops:queue:tier2', highest.ticketId);
      } catch {
        this.redis = null;
      }
    }

    // Actualizar estado del operador a ocupado y asociar ticket activo
    const newStatus: OperatorState =
      highest.priority === 'P1_HARDWARE_MAINTENANCE' ? 'BUSY_MAINTENANCE' : 'BUSY_CAD_DESIGN';

    this.inMemoryOperators.set(operatorId, {
      status: newStatus,
      lastHeartbeat: Date.now(),
      activeTicket: highest
    });

    return highest;
  }

  setOperatorStatus(operatorId: string, status: OperatorState, heartbeatMs: number = Date.now()) {
    const existing = this.inMemoryOperators.get(operatorId);
    this.inMemoryOperators.set(operatorId, {
      status,
      lastHeartbeat: heartbeatMs,
      activeTicket: status === 'AVAILABLE' ? undefined : existing?.activeTicket
    });
  }

  getOperatorStatus(operatorId: string): OperatorState {
    const op = this.inMemoryOperators.get(operatorId);
    if (!op) return 'OFFLINE';

    // Caso Borde 07: Verificar TTL de 30 minutos sin actividad (heartbeat)
    const elapsedSeconds = (Date.now() - op.lastHeartbeat) / 1000;
    if (elapsedSeconds > this.ttlSeconds) {
      op.status = 'OFFLINE';
      // Si el operador tenía un ticket asignado y abandonó la sesión, reintegrarlo al inicio de la cola
      if (op.activeTicket) {
        const reclaimed = op.activeTicket;
        op.activeTicket = undefined;
        this.inMemoryQueue.set(reclaimed.ticketId, reclaimed);
        this.slaBreachTriggered = true;
      }
      return 'OFFLINE';
    }

    return op.status;
  }

  evaluateSlaBreachRisk(): SlaBreachEvaluation {
    const reasons: string[] = [];
    const now = Date.now();
    let oldestP1WaitSeconds = 0;

    // Verificar expiración de operadores activos antes de evaluar
    for (const opId of this.inMemoryOperators.keys()) {
      this.getOperatorStatus(opId);
    }

    if (this.slaBreachTriggered) {
      reasons.push('OPERATOR_TTL_EXPIRED_TICKET_REQUEUED');
    }

    if (this.inMemoryQueue.size > 10) {
      reasons.push(`QUEUE_OVERFLOW_${this.inMemoryQueue.size}_TICKETS`);
    }

    for (const item of this.inMemoryQueue.values()) {
      if (item.priority === 'P1_HARDWARE_MAINTENANCE') {
        const waitSec = Math.round((now - item.enqueuedAt) / 1000);
        if (waitSec > oldestP1WaitSeconds) {
          oldestP1WaitSeconds = waitSec;
        }
        if (waitSec > 1800) {
          reasons.push(`P1_TICKET_${item.ticketId}_WAIT_EXCEEDED_30M`);
        }
      }
    }

    return {
      sla_breach_risk: reasons.length > 0,
      reasons,
      queue_length: this.inMemoryQueue.size,
      oldest_p1_wait_seconds: oldestP1WaitSeconds
    };
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
    this.slaBreachTriggered = false;
  }
}
