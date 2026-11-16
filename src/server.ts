/**
 * Servidor Fastify Principal - PrintOps BPO
 * Trazabilidad: docs/06-cloud-architecture-ci-cd.md, RF-01 a RF-07, RNF-01 a RNF-05
 */

import * as fs from 'fs';
import * as path from 'path';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { validateTicketInput } from './gateway/schemaValidator';
import { GatewayRateLimiter } from './gateway/rateLimiter';
import { RulesEngine } from './domain/rules/rulesEngine';
import { RedisQueueManager } from './infrastructure/redisQueueManager';
import { PostgresAuditRepository } from './infrastructure/db/postgresAuditRepo';
import { OperatorState, TriageResult } from './domain/types';

export function buildServer(): FastifyInstance {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test'
  });

  app.register(cors, { origin: true });
  app.register(sensible);

  const rulesEngine = new RulesEngine();
  const queueManager = new RedisQueueManager(process.env.REDIS_URL);
  const rateLimiter = new GatewayRateLimiter(120, 60_000);
  const auditRepo = new PostgresAuditRepository(process.env.DATABASE_URL);

  app.addHook('onClose', async () => {
    await auditRepo.close();
  });

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
    const clientIp = req.ip || '127.0.0.1';
    const forceRateLimit = req.headers['x-simulate-rate-limit'] === 'true';

    // 2.1 Rate Limiting en Puerta de Entrada (RNF-03 & KPI-04)
    const rateStatus = rateLimiter.check(clientIp, forceRateLimit);
    if (!rateStatus.allowed) {
      return reply.status(429).send({
        success: false,
        ticket_id: (req.body as any)?.ticket_id || 'TCK-RATELIMITED',
        target_tier: 'TIER_1',
        target_status: 'INCOMPLETE_REJECTED_TIER_1',
        priority: 'NONE',
        deflected_in_tier_1: true,
        tokens_consumed: 0,
        llm_token_waste: false,
        triage_rule_applied: 'RULE_GATEWAY_RATE_LIMIT_BLOCKED',
        latency_ms: Date.now() - startTimeMs,
        notes: 'Solicitud bloqueada por Rate Limiting (RNF-03): 0 tokens consumidos.'
      });
    }

    // 2.2 Validación de Esquema en Puerta de Entrada (< 200 ms, 0 tokens)
    const validation = validateTicketInput(req.body, startTimeMs);

    if (!validation.isValid) {
      const rejectedResult: TriageResult = {
        ticket_id: (req.body as any)?.ticket_id || 'TCK-REJECTED',
        target_tier: 'TIER_1',
        target_status: 'INCOMPLETE_REJECTED_TIER_1',
        priority: 'NONE',
        zone: 'UNKNOWN',
        calculated_cost_cop: null,
        recommended_material: null,
        deflected_in_tier_1: true,
        tokens_consumed: 0,
        llm_token_waste: false,
        triage_rule_applied: 'RULE_GATEWAY_INCOMPLETE_FIELDS_REJECTION',
        validation_errors: validation.errors,
        latency_ms: validation.latencyMs,
        notes: 'Rechazo determinista inmediato en puerta de entrada: campos obligatorios faltantes.'
      };

      await auditRepo.recordTriage((req.body as any) || {}, rejectedResult);

      return reply.status(400).send({
        success: false,
        ...rejectedResult
      });
    }

    // 2.3 Procesamiento determinista y semántico con el Motor de Reglas
    const result = await rulesEngine.processTicket(validation.data, startTimeMs);

    // 2.4 Si el ticket escala a Tier 2, encolar en el gestor de colas de prioridad
    if (result.target_tier === 'TIER_2') {
      await queueManager.enqueueTicket(result.ticket_id, result.priority, result);

      // Si es una falla crítica de hardware (P1), bloquear la impresora afectada
      if (result.priority === 'P1_HARDWARE_MAINTENANCE') {
        queueManager.setPrinterStatus('CREALITY_ENDER_5_MAX_01', 'MAINTENANCE_LOCKED');
      }
    }

    // 2.5 Registrar auditoría relacional en PostgreSQL (RNF-04)
    await auditRepo.recordTriage(validation.data, result);

    return reply.status(200).send({
      success: true,
      ...result
    });
  });

  // 3. Consulta de Cola de Prioridad y Riesgo de SLA en Tiempo Real
  app.get('/api/queue', async (_req: FastifyRequest, reply: FastifyReply) => {
    const snapshot = queueManager.getQueueSnapshot();
    const slaStatus = queueManager.evaluateSlaBreachRisk();
    return reply.status(200).send({
      queue_length: snapshot.length,
      sla_breach_risk: slaStatus.sla_breach_risk,
      sla_reasons: slaStatus.reasons,
      printer_status: queueManager.getPrinterStatus('CREALITY_ENDER_5_MAX_01'),
      tickets: snapshot
    });
  });

  // 4. Consulta de Auditoría Persistente (PostgreSQL RNF-04)
  app.get('/api/audit', async (_req: FastifyRequest, reply: FastifyReply) => {
    const records = await auditRepo.getRecentAudits(50);
    return reply.status(200).send({
      total_records: records.length,
      records
    });
  });

  // 5. Actualización de Estado de Operador Humano Tier 2
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
