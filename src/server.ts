/**
 * Servidor Fastify Principal - PrintOps BPO
 * Trazabilidad: docs/06-cloud-architecture-ci-cd.md, RF-01 a RF-07
 */

import * as fs from 'fs';
import * as path from 'path';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { validateTicketInput } from './gateway/schemaValidator';
import { RulesEngine } from './domain/rules/rulesEngine';
import { RedisQueueManager } from './infrastructure/redisQueueManager';
import { OperatorState } from './domain/types';

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test'
  });

  app.register(cors, { origin: true });
  app.register(sensible);

  const rulesEngine = new RulesEngine();
  const queueManager = new RedisQueueManager(process.env.REDIS_URL);

  // 0. Interfaz Visual Web (Frontend de Pruebas BPO)
  app.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
    const htmlPath = path.resolve(__dirname, '../public/index.html');
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      return reply.type('text/html').send(htmlContent);
    }
    return reply.status(200).send({ message: 'PrintOps BPO API activa. Interfaz web en /public/index.html' });
  });

  // 1. Healthcheck Endpoint
  app.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'printops-bpo',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 2. Endpoint Principal de Triage y Cotización (Puerta de Entrada)
  app.post('/api/tickets/triage', async (req: FastifyRequest, reply: FastifyReply) => {
    const startTimeMs = Date.now();
    const validation = validateTicketInput(req.body, startTimeMs);

    // Si falta algún campo obligatorio -> Rechazo inmediato en < 200 ms con 0 tokens
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        ticket_id: (req.body as any)?.ticket_id || 'TCK-REJECTED',
        target_tier: 'TIER_1',
        target_status: 'INCOMPLETE_REJECTED_TIER_1',
        priority: 'NONE',
        deflected_in_tier_1: true,
        tokens_consumed: 0,
        llm_token_waste: false,
        validation_errors: validation.errors,
        latency_ms: validation.latencyMs,
        notes: 'Rechazo determinista inmediato en puerta de entrada: campos obligatorios faltantes.'
      });
    }

    // Procesamiento determinista y semántico con el Motor de Reglas
    const result = await rulesEngine.processTicket(validation.data, startTimeMs);

    // Si el ticket escala a Tier 2, encolar en el gestor de colas de prioridad
    if (result.target_tier === 'TIER_2') {
      await queueManager.enqueueTicket(result.ticket_id, result.priority, result);

      // Si es una falla crítica de hardware (P1), bloquear la impresora afectada
      if (result.priority === 'P1_HARDWARE_MAINTENANCE') {
        queueManager.setPrinterStatus('CREALITY_ENDER_5_MAX_01', 'MAINTENANCE_LOCKED');
      }
    }

    return reply.status(200).send({
      success: true,
      ...result
    });
  });

  // 3. Consulta de Cola de Prioridad en Tiempo Real
  app.get('/api/queue', async (_req: FastifyRequest, reply: FastifyReply) => {
    const snapshot = queueManager.getQueueSnapshot();
    return reply.status(200).send({
      queue_length: snapshot.length,
      tickets: snapshot
    });
  });

  // 4. Actualización de Estado de Operador Humano Tier 2
  app.post('/api/operators/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { operator_id: string; status: OperatorState };
    if (!body?.operator_id || !body?.status) {
      return reply.status(400).send({ error: 'operator_id y status son obligatorios' });
    }

    queueManager.setOperatorStatus(body.operator_id, body.status);

    // Si el operador cambia a AVAILABLE, intentar despacho automático del primer ticket en cola
    let dispatchedTicket = null;
    if (body.status === 'AVAILABLE') {
      dispatchedTicket = await queueManager.dispatchNextTicket(body.operator_id);
    }

    return reply.status(200).send({
      operator_id: body.operator_id,
      status: queueManager.getOperatorStatus(body.operator_id),
      dispatched_ticket: dispatchedTicket
    });
  });

  return app;
}

// Arranque directo si se ejecuta como script
if (require.main === module) {
  const server = buildServer();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  server.listen({ port, host }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`[PrintOps BPO] Servidor activo en ${address}`);
  });
}
