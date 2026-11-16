/**
 * Matriz de Compatibilidad Física de Materiales (PLA, PETG, TPU)
 * Trazabilidad: docs/02-business-rules-physics.md §3, RF-03
 */

import { MaterialType } from '../types';

export interface MaterialValidationResult {
  isCompatible: boolean;
  recommendedMaterial: MaterialType;
  requiresMaterialSwap: boolean;
  triageRuleApplied: string;
  reason?: string;
  escalateToTier2?: boolean;
}

export function evaluateMaterialCompatibility(
  materialRequested: MaterialType | string,
  environmentUse: string | null | undefined,
  dimensions?: { x?: number | null; y?: number | null; z?: number | null }
): MaterialValidationResult {
  const normMaterial = String(materialRequested || '').toUpperCase().trim();
  const env = String(environmentUse || '').toLowerCase().trim();

  // 1. REGLAS PARA PLA
  if (normMaterial === 'PLA') {
    // Detección de incompatibilidad térmica: exterior, sol, vehículo o calor
    const isOutdoorOrHeat =
      env.includes('exterior') ||
      env.includes('sol') ||
      env.includes('agua') ||
      env.includes('patio') ||
      env.includes('auto') ||
      env.includes('vehículo') ||
      env.includes('parabrisas') ||
      env.includes('invernadero');

    if (isOutdoorOrHeat) {
      return {
        isCompatible: false,
        recommendedMaterial: 'PETG',
        requiresMaterialSwap: true,
        triageRuleApplied: 'RULE_PHYSICS_THERMAL_BLOCK_PLA_SWAP_PETG',
        reason:
          'El PLA presenta temperatura de transición vítrea a 55-60 °C y se deforma ante radiación solar directa o intemperie. Se sustituye automáticamente por PETG (inerte al agua y estable hasta 80 °C).'
      };
    }

    return {
      isCompatible: true,
      recommendedMaterial: 'PLA',
      requiresMaterialSwap: false,
      triageRuleApplied: 'RULE_GREEN_ZONE_PLA_INTERIOR'
    };
  }

  // 2. REGLAS PARA PETG
  if (normMaterial === 'PETG') {
    let rule = 'RULE_GREEN_ZONE_PETG_MECHANICAL';
    if (env.includes('agua') || env.includes('acuario') || env.includes('humedad')) {
      rule = 'RULE_GREEN_ZONE_PETG_AQUARIUM';
    } else if (env.includes('térmico') || env.includes('calor') || env.includes('hotend')) {
      rule = 'RULE_GREEN_ZONE_PETG_THERMAL';
    }

    return {
      isCompatible: true,
      recommendedMaterial: 'PETG',
      requiresMaterialSwap: false,
      triageRuleApplied: rule
    };
  }

  // 3. REGLAS PARA TPU
  if (normMaterial === 'TPU') {
    // Si se pide para soporte estructural rígido -> advertencia física
    if (env.includes('esfuerzo mecánico') || env.includes('soporte de carga') || env.includes('rígido')) {
      return {
        isCompatible: false,
        recommendedMaterial: 'PETG',
        requiresMaterialSwap: true,
        triageRuleApplied: 'RULE_PHYSICS_TPU_STRUCTURAL_BLOCK_SWAP_PETG',
        reason: 'El TPU 95A es elastómero flexible y no resiste cargas estructurales sin pandeo. Se sugiere PETG.'
      };
    }

    // Si la pieza en TPU supera 200 mm de altura -> riesgo de pandeo y atasco en extrusor
    const zHeight = dimensions?.z || 0;
    if (zHeight > 200) {
      return {
        isCompatible: true,
        recommendedMaterial: 'TPU',
        requiresMaterialSwap: false,
        triageRuleApplied: 'RULE_TPU_HEIGHT_EXCEEDED_TIER_2',
        escalateToTier2: true,
        reason: 'Piezas flexibles en TPU de más de 200 mm requieren validación humana de soportes y retracción en Tier 2.'
      };
    }

    return {
      isCompatible: true,
      recommendedMaterial: 'TPU',
      requiresMaterialSwap: false,
      triageRuleApplied: 'RULE_GREEN_ZONE_TPU_FLEXIBLE'
    };
  }

  // Por defecto si no coincide
  return {
    isCompatible: true,
    recommendedMaterial: 'PLA',
    requiresMaterialSwap: false,
    triageRuleApplied: 'RULE_DEFAULT_PLA'
  };
}
