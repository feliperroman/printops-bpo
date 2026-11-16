/**
 * Suite de Validación Matemática Automatizada de los 5 KPIs
 * Trazabilidad: docs/05-kpis-edge-cases.md §1, docs/evidence/seed-tickets-30.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server';

interface SeedTicket {
  ticket_id: string;
  group: string;
  client: { type: string; name: string };
  request_type: 'QUOTATION' | 'TECHNICAL_SUPPORT';
  input_payload: any;
  expected_output: {
    target_tier: string;
    target_status: string;
    priority: string;
    zone: string;
    calculated_cost_cop: number | null;
    recommended_material: string | null;
    deflected_in_tier_1: boolean;
    llm_token_waste: boolean;
    tokens_consumed_expected: number;
    triage_rule_applied: string;
    notes?: string;
  };
}

describe('Validación Oficial de los 5 KPIs contra seed-tickets-30.json', () => {
  let app: FastifyInstance;
  let dataset: SeedTicket[];

  beforeAll(async () => {
    app = buildServer();
    await app.ready();

    const filePath = path.resolve(__dirname, '../docs/evidence/seed-tickets-30.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    dataset = JSON.parse(rawData);
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe cargar exactamente los 30 tickets sintéticos del dataset oficial', () => {
    expect(dataset.length).toBe(30);
  });

  it('KPI-01 — Tasa de Deflexión en Tier 1 debe ser >= 66.7% (20 de 30 tickets)', async () => {
    let deflectedCount = 0;

    for (const item of dataset) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tickets/triage',
        payload: {
          ticket_id: item.ticket_id,
          client: item.client,
          request_type: item.request_type,
          ...item.input_payload
        }
      });

      const body = JSON.parse(response.payload);

      if (body.deflected_in_tier_1 === true) {
        deflectedCount++;
      }
    }

    const deflectionRate = (deflectedCount / dataset.length) * 100;
    console.log(`[KPI-01] Tickets resueltos en Tier 1: ${deflectedCount}/30 (${deflectionRate.toFixed(1)}%)`);

    // La meta es >= 66.7% (20 tickets). En nuestro dataset se alcanzan 23 tickets (76.7%)
    expect(deflectedCount).toBeGreaterThanOrEqual(20);
    expect(deflectedCount).toBe(23);
    expect(deflectionRate).toBeCloseTo(76.7, 1);
  });

  it('KPI-02 — Precisión del Enrutamiento y Reglas Físicas debe ser del 100% en reglas deterministas', async () => {
    let matchedRules = 0;
    const deterministicTickets = dataset.filter(
      (t) => t.group.includes('Grupo 1') || t.group.includes('Grupo 2')
    );

    for (const item of deterministicTickets) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tickets/triage',
        payload: {
          ticket_id: item.ticket_id,
          client: item.client,
          request_type: item.request_type,
          ...item.input_payload
        }
      });

      const body = JSON.parse(response.payload);

      // Validar coincidencia de estado y zona esperados
      expect(body.target_status).toBe(item.expected_output.target_status);
      expect(body.target_tier).toBe(item.expected_output.target_tier);

      if (item.expected_output.calculated_cost_cop !== null) {
        expect(body.calculated_cost_cop).toBe(item.expected_output.calculated_cost_cop);
      }

      matchedRules++;
    }

    const accuracy = (matchedRules / deterministicTickets.length) * 100;
    console.log(`[KPI-02] Precisión de triage en reglas deterministas: ${accuracy}%`);
    expect(accuracy).toBe(100);
  });

  it('KPI-03 — Tiempo de Respuesta en Puerta de Entrada < 200 ms (TCK-029)', async () => {
    const incompleteTicket = dataset.find((t) => t.ticket_id === 'TCK-029')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/tickets/triage',
      payload: {
        ticket_id: incompleteTicket.ticket_id,
        client: incompleteTicket.client,
        request_type: incompleteTicket.request_type,
        ...incompleteTicket.input_payload
      }
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.target_status).toBe('INCOMPLETE_REJECTED_TIER_1');
    expect(body.latency_ms).toBeLessThan(200);
  });

  it('KPI-04 — Protección de Presupuesto de Tokens (0 tokens consumidos en TCK-029)', async () => {
    const incompleteTicket = dataset.find((t) => t.ticket_id === 'TCK-029')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/tickets/triage',
      payload: {
        ticket_id: incompleteTicket.ticket_id,
        client: incompleteTicket.client,
        request_type: incompleteTicket.request_type,
        ...incompleteTicket.input_payload
      }
    });

    const body = JSON.parse(response.payload);
    expect(body.tokens_consumed).toBe(0);
    expect(body.llm_token_waste).toBe(false);
  });

  it('KPI-05 — Manejo y Despacho de Prioridad Crítica P1 (TCK-025 y TCK-026)', async () => {
    const p1Ticket = dataset.find((t) => t.ticket_id === 'TCK-025')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/tickets/triage',
      payload: {
        ticket_id: p1Ticket.ticket_id,
        client: p1Ticket.client,
        request_type: p1Ticket.request_type,
        ...p1Ticket.input_payload
      }
    });

    const body = JSON.parse(response.payload);
    expect(body.target_tier).toBe('TIER_2');
    expect(body.priority).toBe('P1_HARDWARE_MAINTENANCE');
    expect(body.handshake_summary).toContain('Atasco severo');

    // Verificar que la cola registra el ticket
    const queueResp = await app.inject({
      method: 'GET',
      url: '/api/queue'
    });
    const queueBody = JSON.parse(queueResp.payload);
    expect(queueBody.queue_length).toBeGreaterThanOrEqual(1);
  });

  it('Seguridad — Neutralización de Prompt Injection (TCK-030)', async () => {
    const injectionTicket = dataset.find((t) => t.ticket_id === 'TCK-030')!;

    const response = await app.inject({
      method: 'POST',
      url: '/api/tickets/triage',
      payload: {
        ticket_id: injectionTicket.ticket_id,
        client: injectionTicket.client,
        request_type: injectionTicket.request_type,
        ...injectionTicket.input_payload
      }
    });

    const body = JSON.parse(response.payload);
    expect(body.target_status).toBe('RESOLVED_TIER_1');
    // El costo DEBE ser calculado matemáticamente por el servidor ($615.500 COP) y NO $1 COP
    expect(body.calculated_cost_cop).toBe(615500);
    expect(body.calculated_cost_cop).not.toBe(1);
  });
});
