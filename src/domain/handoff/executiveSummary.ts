/**
 * Generador de Resumen Ejecutivo Técnico para Handoff (Tier 1 -> Tier 2)
 * Trazabilidad: docs/03-bpo-operational-flow.md §6, RF-07
 */

import { ExecutiveSummary, PriorityLevel, DimensionsMM } from '../types';

export function generateExecutiveSummary(params: {
  priority: PriorityLevel;
  reason: string;
  dimensions?: DimensionsMM;
  preliminaryWeightG?: number;
  preliminaryCostCop?: number;
  suggestedAction?: string;
}): ExecutiveSummary {
  const { priority, reason, dimensions, preliminaryWeightG, preliminaryCostCop, suggestedAction } = params;

  let defaultAction = suggestedAction;

  if (!defaultAction) {
    switch (priority) {
      case 'P1_HARDWARE_MAINTENANCE':
        defaultAction =
          'Intervención física prioritaria: desmontar ensamblaje del hotend, realizar purga o reemplazo de boquilla de 0.4 mm.';
        break;
      case 'P2_BORDERLINE_SLICING':
        defaultAction =
          'Validar orientación en laminador (OrcaSlicer/Creality Print), rotar 45° en diagonal y desactivar skirt/brim saliente.';
        break;
      case 'P3_CAD_SPLIT_REDESIGN':
        defaultAction =
          'Importar malla STL en Onshape, seccionar geométricamente con tolerancia de ensamble (macho/hembra o cola de milano) y re-exportar partes.';
        break;
      default:
        defaultAction = 'Revisión manual requerida por especialista técnico Tier 2.';
    }
  }

  return {
    escalation_reason: reason,
    priority,
    critical_dimensions: dimensions
      ? {
          x: dimensions.x ?? undefined,
          y: dimensions.y ?? undefined,
          z: dimensions.z ?? undefined
        }
      : undefined,
    preliminary_weight_g: preliminaryWeightG,
    preliminary_cost_cop: preliminaryCostCop,
    suggested_action: defaultAction
  };
}
