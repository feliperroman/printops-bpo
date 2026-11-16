/**
 * Motor de Cotización Base Determinista
 * Trazabilidad: docs/02-business-rules-physics.md §5, docs/05-kpis-edge-cases.md §2 (Caso Borde 04)
 * 
 * Fórmula:
 * Costo Total = (Gramos × Tarifa Material [H]) + (Horas × $3.000 COP [H]) + $9.000 COP de Alistamiento [H]
 * 
 * Seguridad:
 * Aislamiento estricto de la lógica de negocio.
 * Este motor NO procesa lenguaje natural ni admite sobreescrituras arbitrarias.
 * Neutraliza completamente ataques de Prompt Injection como TCK-030.
 */

import { MaterialType, PricingBreakdown } from '../types';

export const TARIFF_RATES_COP = {
  PLA_PER_GRAM: 250,
  PETG_PER_GRAM: 280,
  TPU_PER_GRAM: 320,
  MACHINE_PER_HOUR: 3000,
  FIXED_SETUP: 9000
} as const;

export function getRatePerGram(material: MaterialType | string): number {
  const norm = material.toUpperCase().trim();
  switch (norm) {
    case 'PETG':
      return TARIFF_RATES_COP.PETG_PER_GRAM;
    case 'TPU':
      return TARIFF_RATES_COP.TPU_PER_GRAM;
    case 'PLA':
    default:
      return TARIFF_RATES_COP.PLA_PER_GRAM;
  }
}

export function calculatePrintCost(
  material: MaterialType | string,
  weightG: number,
  printHours: number
): PricingBreakdown {
  // Asegurar valores válidos no negativos
  const safeWeight = Math.max(0, Number(weightG) || 0);
  const safeHours = Math.max(0, Number(printHours) || 0);

  const ratePerGram = getRatePerGram(material);
  const ratePerHour = TARIFF_RATES_COP.MACHINE_PER_HOUR;
  const fixedSetup = TARIFF_RATES_COP.FIXED_SETUP;

  const materialCost = Math.round(safeWeight * ratePerGram);
  const machineCost = Math.round(safeHours * ratePerHour);
  const totalCost = materialCost + machineCost + fixedSetup;

  return {
    material_cost_cop: materialCost,
    machine_time_cost_cop: machineCost,
    fixed_setup_cost_cop: fixedSetup,
    total_cost_cop: totalCost,
    rate_per_gram_cop: ratePerGram,
    rate_per_hour_cop: ratePerHour
  };
}
