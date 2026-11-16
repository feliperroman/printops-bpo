/**
 * Validador Estricto de Esquema en Puerta de Entrada (Zod)
 * Trazabilidad: D-009, RF-01, RNF-01, docs/02-business-rules-physics.md §1
 * 
 * Regla de Puerta de Entrada:
 * Detiene solicitudes incompletas o malformadas en < 200 ms con estado INCOMPLETE_REJECTED_TIER_1.
 * Garantiza Zero-Waste Token Ratio (0 tokens de IA consumidos).
 */

import { z } from 'zod';
import { TicketInput } from '../domain/types';

export const DimensionsSchema = z.object({
  x: z.number({ required_error: "Dimensión X es obligatoria y debe ser numérica" })
    .min(1, "Dimensión X debe ser mayor a 1 mm")
    .max(2000, "Dimensión X no puede superar 2000 mm"),
  y: z.number({ required_error: "Dimensión Y es obligatoria y debe ser numérica" })
    .min(1, "Dimensión Y debe ser mayor a 1 mm")
    .max(2000, "Dimensión Y no puede superar 2000 mm"),
  z: z.number({ required_error: "Dimensión Z es obligatoria y debe ser numérica" })
    .min(1, "Dimensión Z debe ser mayor a 1 mm")
    .max(2000, "Dimensión Z no puede superar 2000 mm")
});

export const TicketInputSchema = z.object({
  ticket_id: z.string().optional(),
  client: z.object({
    type: z.enum(['LAB_ACADEMICO', 'EXTERNO_ABRACADABRA']),
    name: z.string()
  }).optional(),
  request_type: z.enum(['QUOTATION', 'TECHNICAL_SUPPORT'], {
    required_error: "El tipo de solicitud ('QUOTATION' o 'TECHNICAL_SUPPORT') es obligatorio"
  }),
  part_name: z.string().optional(),
  dimensions_mm: DimensionsSchema.optional().nullable(),
  estimated_weight_g: z.number().nonnegative().optional().nullable(),
  estimated_print_hours: z.number().nonnegative().optional().nullable(),
  material: z.string({ required_error: "El material solicitado es obligatorio" })
    .min(2, "Debe especificar un material válido (ej. PLA, PETG, TPU)")
    .nullable()
    .optional(),
  environment_use: z.string({ required_error: "El entorno y uso esperado es obligatorio" })
    .min(3, "Debe describir el entorno y uso esperado de la pieza")
    .nullable()
    .optional(),
  description_or_query: z.string().optional().nullable()
});

export interface ValidationSuccess {
  isValid: true;
  data: TicketInput;
}

export interface ValidationFailure {
  isValid: false;
  errors: string[];
  latencyMs: number;
}

export function validateTicketInput(payload: unknown, startTimeMs: number = Date.now()): ValidationSuccess | ValidationFailure {
  const result = TicketInputSchema.safeParse(payload);
  const latencyMs = Date.now() - startTimeMs;

  if (!result.success) {
    const errorMessages = result.error.errors.map(
      (err) => `${err.path.join('.') || 'root'}: ${err.message}`
    );
    return {
      isValid: false,
      errors: errorMessages,
      latencyMs
    };
  }

  const data = result.data as TicketInput;

  // Validación de negocio adicional para cotizaciones:
  // Dimensiones completas (X, Y, Z) y entorno de uso son estrictamente obligatorios
  if (data.request_type === 'QUOTATION') {
    const missing: string[] = [];
    if (!data.dimensions_mm || data.dimensions_mm.x == null || data.dimensions_mm.y == null || data.dimensions_mm.z == null) {
      missing.push('dimensions_mm (X, Y y Z son obligatorios para cotizar)');
    }
    if (!data.environment_use || data.environment_use.trim().length === 0) {
      missing.push('environment_use (entorno de uso requerido para validar física de material)');
    }
    if (!data.material || data.material.trim().length === 0) {
      missing.push('material (polímero requerido: PLA, PETG o TPU)');
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        errors: missing.map((f) => `Campo obligatorio faltante o nulo: ${f}`),
        latencyMs: Date.now() - startTimeMs
      };
    }
  }

  return {
    isValid: true,
    data
  };
}
