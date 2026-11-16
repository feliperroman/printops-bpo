/**
 * Perfiles de Máquina Configurables y Clasificación Dimensional
 * Trazabilidad: D-004, docs/02-business-rules-physics.md §2
 */

import { MachineProfile, DimensionalZone } from '../types';

export const MACHINE_PROFILE_ENDER_5_MAX: MachineProfile = {
  id: 'PROFILE_A_ENDER_5_MAX',
  name: 'Creality Ender 5 Max (Gran Formato)',
  max_dimensions_mm: { x: 400, y: 400, z: 400 },
  green_zone_limit_mm: 380, // Margen de seguridad 20mm para skirt/brim
  yellow_zone_max_mm: 400   // Borde crítico: requiere validación de orientación
};

export const MACHINE_PROFILE_STANDARD_LAB: MachineProfile = {
  id: 'PROFILE_B_STANDARD_LAB',
  name: 'Formato Estándar de Laboratorio Universitario',
  max_dimensions_mm: { x: 250, y: 220, z: 250 },
  green_zone_limit_mm: 235,
  yellow_zone_max_mm: 250
};

export function classifyDimensionalZone(
  profile: MachineProfile,
  dimensions: { x: number; y: number; z: number }
): { zone: DimensionalZone; maxAxis: 'x' | 'y' | 'z'; maxVal: number } {
  const { x, y, z } = dimensions;
  const axes = [
    { axis: 'x' as const, val: x },
    { axis: 'y' as const, val: y },
    { axis: 'z' as const, val: z }
  ];

  axes.sort((a, b) => b.val - a.val);
  const max = axes[0];

  // Si cualquier eje supera el límite absoluto de la máquina -> Zona Roja
  if (
    x > profile.max_dimensions_mm.x ||
    y > profile.max_dimensions_mm.y ||
    z > profile.max_dimensions_mm.z
  ) {
    return { zone: 'RED', maxAxis: max.axis, maxVal: max.val };
  }

  // Si algún eje está en el rango de borde crítico (381mm a 400mm en Perfil A) -> Zona Amarilla
  if (
    x > profile.green_zone_limit_mm ||
    y > profile.green_zone_limit_mm ||
    z > profile.green_zone_limit_mm
  ) {
    return { zone: 'YELLOW', maxAxis: max.axis, maxVal: max.val };
  }

  // Todas las dimensiones caben holgadamente dentro del margen de seguridad -> Zona Verde
  return { zone: 'GREEN', maxAxis: max.axis, maxVal: max.val };
}
