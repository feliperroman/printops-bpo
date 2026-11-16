/**
 * Motor Central de Reglas Físicas y Triage Operativo BPO
 * Trazabilidad: docs/02-business-rules-physics.md, docs/03-bpo-operational-flow.md, RF-02, RF-03, RF-04, RF-05
 */

import {
  TicketInput,
  TriageResult,
  MachineProfile
} from '../types';
import { MACHINE_PROFILE_ENDER_5_MAX, classifyDimensionalZone } from './machineProfiles';
import { evaluateMaterialCompatibility } from './materialCompatibility';
import { calculatePrintCost } from './pricingEngine';
import { generateExecutiveSummary } from '../handoff/executiveSummary';
import { GeminiTriageAgent } from '../../ai/geminiTriageAgent';

export class RulesEngine {
  private machineProfile: MachineProfile;
  private aiAgent: GeminiTriageAgent;

  constructor(profile?: MachineProfile, aiAgent?: GeminiTriageAgent) {
    this.machineProfile = profile || MACHINE_PROFILE_ENDER_5_MAX;
    this.aiAgent = aiAgent || new GeminiTriageAgent();
  }

  setMachineProfile(profile: MachineProfile) {
    this.machineProfile = profile;
  }

  async processTicket(ticket: TicketInput, startTimeMs: number = Date.now()): Promise<TriageResult> {
    const ticketId = ticket.ticket_id || `TCK-${Math.floor(1000 + Math.random() * 9000)}`;

    // =========================================================================
    // 1. FLUJO DE COTIZACIÓN DE PIEZA (QUOTATION)
    // =========================================================================
    if (ticket.request_type === 'QUOTATION') {
      const dims = ticket.dimensions_mm!;
      const dimZone = classifyDimensionalZone(this.machineProfile, {
        x: dims.x!,
        y: dims.y!,
        z: dims.z!
      });

      const weight = ticket.estimated_weight_g ?? 150;
      const hours = ticket.estimated_print_hours ?? 4.0;
      const requestedMat = ticket.material || 'PLA';

      // CASO ZONA ROJA: Supera el volumen máximo absoluto (> 400 mm)
      if (dimZone.zone === 'RED') {
        const pricing = calculatePrintCost(requestedMat, weight, hours);
        const handoffReason = `Eje ${dimZone.maxAxis.toUpperCase()} (${dimZone.maxVal} mm) excede límite de ${this.machineProfile.max_dimensions_mm.x} mm. Escalar a Onshape para plano de corte a ${Math.round(dimZone.maxVal / 2)} mm con conectores macho/hembra.`;
        const execSummary = generateExecutiveSummary({
          priority: 'P3_CAD_SPLIT_REDESIGN',
          reason: handoffReason,
          dimensions: dims,
          preliminaryWeightG: weight,
          preliminaryCostCop: pricing.total_cost_cop,
          suggestedAction: `Importar STL a Onshape, aplicar corte en eje ${dimZone.maxAxis.toUpperCase()} a ${Math.round(dimZone.maxVal / 2)} mm y modelar encastres.`
        });

        return {
          ticket_id: ticketId,
          target_tier: 'TIER_2',
          target_status: 'QUEUED_TIER_2',
          priority: 'P3_CAD_SPLIT_REDESIGN',
          zone: 'RED',
          calculated_cost_cop: pricing.total_cost_cop,
          pricing_breakdown: pricing,
          recommended_material: requestedMat as any,
          original_material: requestedMat,
          deflected_in_tier_1: false,
          llm_token_waste: false,
          tokens_consumed: 0,
          triage_rule_applied: 'RULE_DIMENSIONS_RED_ZONE_OVER_400',
          handshake_summary: handoffReason,
          executive_summary: execSummary,
          latency_ms: Date.now() - startTimeMs,
          notes: 'Excede volumen máximo de máquina. Tier 1 precalcula costo base y escala a Tier 2 CAD.'
        };
      }

      // CASO ZONA AMARILLA: Borde crítico (381 mm a 400 mm)
      if (dimZone.zone === 'YELLOW') {
        const pricing = calculatePrintCost(requestedMat, weight, hours);
        const handoffReason = `Eje ${dimZone.maxAxis.toUpperCase()} (${dimZone.maxVal} mm) en Zona Amarilla: validar rotación diagonal en OrcaSlicer/Creality Print sin skirt.`;
        const execSummary = generateExecutiveSummary({
          priority: 'P2_BORDERLINE_SLICING',
          reason: handoffReason,
          dimensions: dims,
          preliminaryWeightG: weight,
          preliminaryCostCop: pricing.total_cost_cop,
          suggestedAction: 'Validar rotación diagonal a 45° en laminador sin falda ni brim exterior.'
        });

        return {
          ticket_id: ticketId,
          target_tier: 'TIER_2',
          target_status: 'QUEUED_TIER_2',
          priority: 'P2_BORDERLINE_SLICING',
          zone: 'YELLOW',
          calculated_cost_cop: pricing.total_cost_cop,
          pricing_breakdown: pricing,
          recommended_material: requestedMat as any,
          original_material: requestedMat,
          deflected_in_tier_1: false,
          llm_token_waste: false,
          tokens_consumed: 0,
          triage_rule_applied: 'RULE_DIMENSIONS_YELLOW_ZONE_381_400',
          handshake_summary: handoffReason,
          executive_summary: execSummary,
          latency_ms: Date.now() - startTimeMs,
          notes: 'Requiere validación de brim/skirt por operador Tier 2.'
        };
      }

      // CASO ZONA VERDE: Cabe holgadamente (<= 380 mm)
      const matEval = evaluateMaterialCompatibility(requestedMat, ticket.environment_use, dims);

      // Si requiere Swap de Material por física térmica (ej. PLA para sol -> PETG)
      if (matEval.requiresMaterialSwap) {
        const pricing = calculatePrintCost(matEval.recommendedMaterial, weight, hours);
        return {
          ticket_id: ticketId,
          target_tier: 'TIER_1',
          target_status: 'RESOLVED_WITH_MATERIAL_SWAP_TIER_1',
          priority: 'NONE',
          zone: 'GREEN',
          calculated_cost_cop: pricing.total_cost_cop,
          pricing_breakdown: pricing,
          recommended_material: matEval.recommendedMaterial,
          original_material: requestedMat,
          deflected_in_tier_1: true,
          llm_token_waste: false,
          tokens_consumed: 0,
          triage_rule_applied: matEval.triageRuleApplied,
          notes: matEval.reason,
          latency_ms: Date.now() - startTimeMs
        };
      }

      // Cotización estándar aprobada en Tier 1
      const pricing = calculatePrintCost(requestedMat, weight, hours);
      return {
        ticket_id: ticketId,
        target_tier: 'TIER_1',
        target_status: 'RESOLVED_TIER_1',
        priority: 'NONE',
        zone: 'GREEN',
        calculated_cost_cop: pricing.total_cost_cop,
        pricing_breakdown: pricing,
        recommended_material: requestedMat as any,
        original_material: requestedMat,
        deflected_in_tier_1: true,
        llm_token_waste: false,
        tokens_consumed: 0,
        triage_rule_applied: matEval.triageRuleApplied,
        latency_ms: Date.now() - startTimeMs,
        notes: `Aprobado automáticamente en Tier 1. Tarifa: $${pricing.rate_per_gram_cop}/g.`
      };
    }

    // =========================================================================
    // 2. FLUJO DE SOPORTE TÉCNICO Y DIAGNÓSTICO (TECHNICAL_SUPPORT)
    // =========================================================================
    const query = ticket.description_or_query || ticket.part_name || '';
    const diag = await this.aiAgent.analyzeSupportQuery(query, ticket.material);

    let execSummary: any = null;
    if (diag.targetTier === 'TIER_2') {
      execSummary = generateExecutiveSummary({
        priority: diag.priority,
        reason: diag.handshakeSummary || 'Fallo técnico escalado a especialista humano',
        dimensions: ticket.dimensions_mm || undefined,
        suggestedAction: diag.supportGuide
      });
    }

    return {
      ticket_id: ticketId,
      target_tier: diag.targetTier,
      target_status: diag.targetStatus,
      priority: diag.priority,
      zone: 'GREEN',
      calculated_cost_cop: null,
      recommended_material: (ticket.material as any) || 'PLA',
      deflected_in_tier_1: diag.targetTier === 'TIER_1',
      llm_token_waste: false,
      tokens_consumed: diag.tokensConsumed,
      triage_rule_applied: diag.triageRuleApplied,
      handshake_summary: diag.handshakeSummary,
      support_guide: diag.supportGuide,
      executive_summary: execSummary,
      latency_ms: Date.now() - startTimeMs,
      notes: diag.isHardwareCritical ? 'Prioridad P1 Crítica: Bloqueo de máquina' : undefined
    };
  }
}
