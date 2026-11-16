/**
 * Catálogo de Diagnóstico y Modo Fallback Determinista
 * Trazabilidad: docs/02-business-rules-physics.md §4, docs/05-kpis-edge-cases.md §2 (Caso Borde 05)
 * 
 * Se activa ante soporte técnico o si la API de IA externa (Gemini) falla o excede 10s.
 * Garantiza respuesta estructurada sin errores 500 y con 0% tiempo de inactividad.
 */

import { PriorityLevel, TicketTier, TicketStatus } from '../domain/types';

export interface DiagnosticOutput {
  targetTier: TicketTier;
  targetStatus: TicketStatus;
  priority: PriorityLevel;
  triageRuleApplied: string;
  supportGuide: string;
  handshakeSummary?: string;
  isHardwareCritical: boolean;
  tokensConsumed: number;
}

export function diagnoseSupportIssueLocally(queryText: string, material?: string | null): DiagnosticOutput {
  const text = (queryText || '').toLowerCase();
  const mat = (material || '').toUpperCase();

  // 1. FALLAS CRÍTICAS DE HARDWARE (P1 - Escalamiento inmediato Tier 2)
  if (
    text.includes('atasco') ||
    text.includes('taponada') ||
    text.includes('clog') ||
    text.includes('clicking') ||
    text.includes('traquea') ||
    text.includes('salta dientes') ||
    text.includes('no extruye nada')
  ) {
    return {
      targetTier: 'TIER_2',
      targetStatus: 'ASSIGNED_TIER_2',
      priority: 'P1_HARDWARE_MAINTENANCE',
      triageRuleApplied: 'RULE_MAINTENANCE_SEVERE_NOZZLE_CLOG',
      supportGuide: 'Reporte de atasco severo en extrusor transferido a soporte de hardware.',
      handshakeSummary: 'Atasco severo en extrusor: motor traquetea y cold pull falló. Desmontar tobera 0.4 mm y verificar garganta bimetálica.',
      isHardwareCritical: true,
      tokensConsumed: 0
    };
  }

  if (
    text.includes('thermal runaway') ||
    text.includes('error térmico') ||
    text.includes('termistor') ||
    text.includes('runaway e1') ||
    text.includes('oscilaciones bruscas')
  ) {
    return {
      targetTier: 'TIER_2',
      targetStatus: 'ASSIGNED_TIER_2',
      priority: 'P1_HARDWARE_MAINTENANCE',
      triageRuleApplied: 'RULE_MAINTENANCE_THERMAL_RUNAWAY',
      supportGuide: 'Alerta térmica de seguridad: máquina bloqueada para revisión.',
      handshakeSummary: 'Thermal Runaway E1 detectado: riesgo eléctrico/incendio. Bloquear máquina y revisar fijación de termistor y cartucho calefactor.',
      isHardwareCritical: true,
      tokensConsumed: 0
    };
  }

  // 2. REDISEÑO CAD (P3 - Escalamiento a Onshape)
  if (
    text.includes('tolerancia') ||
    text.includes('engranajes') ||
    text.includes('satélites') ||
    text.includes('soldados a los ejes') ||
    text.includes('holgura')
  ) {
    return {
      targetTier: 'TIER_2',
      targetStatus: 'QUEUED_TIER_2',
      priority: 'P3_CAD_SPLIT_REDESIGN',
      triageRuleApplied: 'RULE_CAD_REDESIGN_TOLERANCE_FIT',
      supportGuide: 'Tolerancia de ensamble insuficiente en modelo original.',
      handshakeSummary: 'Tolerancia de 0.05 mm inviable para FDM estándar: derivar a Onshape para ajustar offset radial a 0.25 mm entre dientes y eje.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  if (
    text.includes('bisagra') ||
    text.includes('print-in-place') ||
    text.includes('fusionó') ||
    text.includes('pasador central')
  ) {
    return {
      targetTier: 'TIER_2',
      targetStatus: 'QUEUED_TIER_2',
      priority: 'P3_CAD_SPLIT_REDESIGN',
      triageRuleApplied: 'RULE_CAD_REDESIGN_PRINT_IN_PLACE',
      supportGuide: 'Fusión de superficies en modelo articulado print-in-place.',
      handshakeSummary: 'Bisagra print-in-place fusionada: rediseñar separación de caras en Onshape aumentando holgura a 0.4 mm y ángulo cónico de 45°.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // 3. FALLOS ESTÁNDAR DE SOPORTE TÉCNICO (Tier 1 - Resuelto automáticamente)
  // Stringing en PETG
  if (text.includes('hilo') || text.includes('stringing') || text.includes('telaraña') || text.includes('pelos')) {
    if (mat === 'TPU' || text.includes('tpu') || text.includes('oruga')) {
      return {
        targetTier: 'TIER_1',
        targetStatus: 'RESOLVED_TIER_1',
        priority: 'NONE',
        triageRuleApplied: 'RULE_SUPPORT_TPU_STRINGING_RETRACTION',
        supportGuide:
          'Protocolo para encordado en TPU: Habilitar retracción directa a 0.8 mm a 25 mm/s, velocidad de desplazamiento a 150 mm/s, secado en horno deshidratador a 50 °C por 6 horas y reducir temperatura a 220 °C.',
        isHardwareCritical: false,
        tokensConsumed: 0
      };
    }
    return {
      targetTier: 'TIER_1',
      targetStatus: 'RESOLVED_TIER_1',
      priority: 'NONE',
      triageRuleApplied: 'RULE_SUPPORT_STRINGING_PETG',
      supportGuide:
        'Protocolo de corrección para encordado (stringing): 1) Secar filamento por 4h a 65 °C, 2) Bajar temperatura de boquilla de 5 a 10 °C (ej. de 245 °C a 235 °C en PETG), 3) Configurar distancia de retracción entre 1.0 y 2.0 mm a 40 mm/s en OrcaSlicer/Creality Print.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // Warping / Despegue de cama
  if (text.includes('warping') || text.includes('despega') || text.includes('levantaron') || text.includes('primera capa')) {
    return {
      targetTier: 'TIER_1',
      targetStatus: 'RESOLVED_TIER_1',
      priority: 'NONE',
      triageRuleApplied: 'RULE_SUPPORT_WARPING_FIRST_LAYER',
      supportGuide:
        'Protocolo de adherencia en primera capa: 1) Limpiar superficie PEI con alcohol isopropílico al 99% o agua tibia con jabón neutro desengrasante, 2) Ajustar Z-offset bajando la boquilla entre -0.025 mm y -0.050 mm para mejorar el aplastamiento, 3) Activar Brim exterior de 6 mm y verificar temperatura de cama a 60 °C (PLA) o 75-80 °C (PETG).',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // Humedad en filamento
  if (text.includes('chasquido') || text.includes('popping') || text.includes('burbuja') || text.includes('humedad') || text.includes('microporo') || text.includes('rugoso')) {
    return {
      targetTier: 'TIER_1',
      targetStatus: 'RESOLVED_TIER_1',
      priority: 'NONE',
      triageRuleApplied: 'RULE_SUPPORT_WET_FILAMENT_POPPING',
      supportGuide:
        'Diagnóstico: El filamento absorbió humedad del ambiente. Los chasquidos corresponden a microexplosiones de vapor de agua en el hotend. Solución: Secar el carrete en deshidratador o secadora de filamento a 45 °C (PLA) o 65 °C (PETG) por 4 a 6 horas antes de reiniciar la impresión.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // Sobre-adhesión en PEI con PETG
  if (text.includes('pegada') || text.includes('desgarra') || text.includes('tirar de ella') || text.includes('romper el recubrimiento')) {
    return {
      targetTier: 'TIER_1',
      targetStatus: 'RESOLVED_TIER_1',
      priority: 'NONE',
      triageRuleApplied: 'RULE_SUPPORT_PETG_PEI_OVERADHESION',
      supportGuide:
        'Protocolo para evitar desgarro de lámina PEI con PETG: 1) Nunca jalar la pieza en caliente ni forzar con espátula metálica, 2) Verter unas gotas de alcohol isopropílico en el perímetro o colocar la placa 10 minutos en congelador para contracción térmica, 3) A futuro aplicar una capa delgada de pegamento en barra o Windex como agente separador desmoldante.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // Subextrusión por temperatura/velocidad
  if (text.includes('subextrusión') || text.includes('separan fácilmente') || text.includes('capas débiles') || text.includes('150 mm/s')) {
    return {
      targetTier: 'TIER_1',
      targetStatus: 'RESOLVED_TIER_1',
      priority: 'NONE',
      triageRuleApplied: 'RULE_SUPPORT_UNDEREXTRUSION_SPEED_TEMP',
      supportGuide:
        'Protocolo de subextrusión volumétrica: La velocidad de impresión supera la capacidad de fusión del hotend. Solución: Aumentar la temperatura de impresión a 210-215 °C o reducir la velocidad de paredes externas a 60-80 mm/s para garantizar adhesión interlaminar.',
      isHardwareCritical: false,
      tokensConsumed: 0
    };
  }

  // Diagnóstico genérico Tier 1
  return {
    targetTier: 'TIER_1',
    targetStatus: 'RESOLVED_TIER_1',
    priority: 'NONE',
    triageRuleApplied: 'RULE_SUPPORT_GENERIC_ASSISTANCE',
    supportGuide:
      'Recomendación estándar: Verificar calibración de Z-offset, nivelación de cama automática y perfil de temperatura según ficha técnica del fabricante.',
    isHardwareCritical: false,
    tokensConsumed: 0
  };
}
