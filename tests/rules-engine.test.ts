import { describe, it, expect } from 'vitest';
import { calculatePrintCost, TARIFF_RATES_COP } from '../src/domain/rules/pricingEngine';
import {
  MACHINE_PROFILE_ENDER_5_MAX,
  classifyDimensionalZone
} from '../src/domain/rules/machineProfiles';
import { evaluateMaterialCompatibility } from '../src/domain/rules/materialCompatibility';
import { validateTicketInput } from '../src/gateway/schemaValidator';
import { RedisQueueManager } from '../src/infrastructure/redisQueueManager';

describe('1. Pricing Engine Determinista', () => {
  it('debe calcular correctamente la cotización para PLA (180g, 4.5h) según fórmula', () => {
    const result = calculatePrintCost('PLA', 180, 4.5);
    // (180 * 250) + (4.5 * 3000) + 9000 = 45000 + 13500 + 9000 = 67500 COP
    expect(result.material_cost_cop).toBe(45000);
    expect(result.machine_time_cost_cop).toBe(13500);
    expect(result.fixed_setup_cost_cop).toBe(9000);
    expect(result.total_cost_cop).toBe(67500);
  });

  it('debe calcular correctamente para PETG (240g, 6h)', () => {
    const result = calculatePrintCost('PETG', 240, 6);
    // (240 * 280) + (6 * 3000) + 9000 = 67200 + 18000 + 9000 = 94200 COP
    expect(result.total_cost_cop).toBe(94200);
  });

  it('debe ser resistente a inyecciones de valores negativos o absurdos', () => {
    const result = calculatePrintCost('PLA', -50, -2);
    expect(result.total_cost_cop).toBe(9000); // Solo costo fijo de alistamiento
  });
});

describe('2. Clasificación Dimensional de Máquina', () => {
  it('debe clasificar piezas <= 380 mm en Zona Verde', () => {
    const zone = classifyDimensionalZone(MACHINE_PROFILE_ENDER_5_MAX, { x: 150, y: 150, z: 140 });
    expect(zone.zone).toBe('GREEN');
  });

  it('debe clasificar piezas entre 381 mm y 400 mm en Zona Amarilla', () => {
    const zone = classifyDimensionalZone(MACHINE_PROFILE_ENDER_5_MAX, { x: 390, y: 180, z: 15 });
    expect(zone.zone).toBe('YELLOW');
    expect(zone.maxVal).toBe(390);
  });

  it('debe clasificar piezas > 400 mm en Zona Roja', () => {
    const zone = classifyDimensionalZone(MACHINE_PROFILE_ENDER_5_MAX, { x: 220, y: 220, z: 460 });
    expect(zone.zone).toBe('RED');
    expect(zone.maxVal).toBe(460);
  });
});

describe('3. Matriz de Compatibilidad de Materiales & Swap Térmico', () => {
  it('debe detectar incompatibilidad térmica de PLA en exterior y recomendar PETG', () => {
    const evalResult = evaluateMaterialCompatibility('PLA', 'Exterior / Sol / Agua');
    expect(evalResult.isCompatible).toBe(false);
    expect(evalResult.requiresMaterialSwap).toBe(true);
    expect(evalResult.recommendedMaterial).toBe('PETG');
    expect(evalResult.triageRuleApplied).toBe('RULE_PHYSICS_THERMAL_BLOCK_PLA_SWAP_PETG');
  });

  it('debe aceptar PLA en interior decorativo', () => {
    const evalResult = evaluateMaterialCompatibility('PLA', 'Decorativo interior');
    expect(evalResult.isCompatible).toBe(true);
    expect(evalResult.requiresMaterialSwap).toBe(false);
    expect(evalResult.recommendedMaterial).toBe('PLA');
  });

  it('debe sugerir PETG si se pide TPU para soporte estructural rígido', () => {
    const evalResult = evaluateMaterialCompatibility('TPU', 'Esfuerzo mecánico / Soporte de carga');
    expect(evalResult.isCompatible).toBe(false);
    expect(evalResult.recommendedMaterial).toBe('PETG');
  });
});

describe('4. Validador de Entrada (Zod Gateway)', () => {
  it('debe rechazar solicitudes con campos faltantes en < 200 ms', () => {
    const start = Date.now();
    const result = validateTicketInput({
      request_type: 'QUOTATION',
      part_name: 'Pieza Incompleta',
      dimensions_mm: { x: 100, y: 100, z: null },
      material: 'PLA',
      environment_use: null
    }, start);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.latencyMs).toBeLessThan(200);
    }
  });
});

describe('5. Colas de Prioridad Atómicas BPO', () => {
  it('debe ordenar estrictamente P1 > P2 > P3 en despacho', async () => {
    const q = new RedisQueueManager();
    q.clear();

    await q.enqueueTicket('TCK-P3-1', 'P3_CAD_SPLIT_REDESIGN');
    await q.enqueueTicket('TCK-P2-1', 'P2_BORDERLINE_SLICING');
    await q.enqueueTicket('TCK-P1-CRITICAL', 'P1_HARDWARE_MAINTENANCE');

    expect(q.getQueueLength()).toBe(3);

    // El primer despacho DEBE ser el ticket P1 crítico
    const firstDispatched = await q.dispatchNextTicket('OP-HUMAN-01');
    expect(firstDispatched?.ticketId).toBe('TCK-P1-CRITICAL');

    // El segundo DEBE ser P2
    const secondDispatched = await q.dispatchNextTicket('OP-HUMAN-02');
    expect(secondDispatched?.ticketId).toBe('TCK-P2-1');

    // El tercero DEBE ser P3
    const thirdDispatched = await q.dispatchNextTicket('OP-HUMAN-03');
    expect(thirdDispatched?.ticketId).toBe('TCK-P3-1');

    expect(q.getQueueLength()).toBe(0);
  });
});
