/**
 * PrintOps BPO - Tipos, Interfaces y Enums del Dominio
 * Trazabilidad: docs/02-business-rules-physics.md, docs/03-bpo-operational-flow.md
 */

export type MaterialType = 'PLA' | 'PETG' | 'TPU';

export type RequestType = 'QUOTATION' | 'TECHNICAL_SUPPORT';

export type DimensionalZone = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type TicketTier = 'TIER_1' | 'TIER_2';

export type TicketStatus =
  | 'NEW_RECEIVED'
  | 'INCOMPLETE_REJECTED_TIER_1'
  | 'EVALUATING_TIER_1'
  | 'RESOLVED_TIER_1'
  | 'RESOLVED_WITH_MATERIAL_SWAP_TIER_1'
  | 'QUEUED_TIER_2'
  | 'ASSIGNED_TIER_2'
  | 'RESOLVED_TIER_2';

export type PriorityLevel =
  | 'NONE'
  | 'P1_HARDWARE_MAINTENANCE'
  | 'P2_BORDERLINE_SLICING'
  | 'P3_CAD_SPLIT_REDESIGN';

export type OperatorState =
  | 'AVAILABLE'
  | 'BUSY_CAD_DESIGN'
  | 'BUSY_MAINTENANCE'
  | 'OFFLINE';

export type PrinterState =
  | 'IDLE_READY'
  | 'PRINTING'
  | 'MAINTENANCE_LOCKED';

export interface DimensionsMM {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface TicketClient {
  type: 'LAB_ACADEMICO' | 'EXTERNO_ABRACADABRA';
  name: string;
}

export interface TicketInput {
  ticket_id?: string;
  client?: TicketClient;
  request_type: RequestType;
  part_name?: string;
  dimensions_mm?: DimensionsMM;
  estimated_weight_g?: number | null;
  estimated_print_hours?: number | null;
  material?: MaterialType | string | null;
  environment_use?: string | null;
  description_or_query?: string | null;
}

export interface PricingBreakdown {
  material_cost_cop: number;
  machine_time_cost_cop: number;
  fixed_setup_cost_cop: number;
  total_cost_cop: number;
  rate_per_gram_cop: number;
  rate_per_hour_cop: number;
}

export interface ExecutiveSummary {
  escalation_reason: string;
  priority: PriorityLevel;
  critical_dimensions?: { x?: number; y?: number; z?: number };
  preliminary_weight_g?: number;
  preliminary_cost_cop?: number;
  suggested_action: string;
}

export interface TriageResult {
  ticket_id: string;
  target_tier: TicketTier;
  target_status: TicketStatus;
  priority: PriorityLevel;
  zone: DimensionalZone;
  calculated_cost_cop: number | null;
  pricing_breakdown?: PricingBreakdown | null;
  recommended_material: MaterialType | null;
  original_material?: MaterialType | string | null;
  deflected_in_tier_1: boolean;
  llm_token_waste: boolean;
  tokens_consumed: number;
  triage_rule_applied: string;
  handshake_summary?: string | null;
  executive_summary?: ExecutiveSummary | null;
  support_guide?: string | null;
  validation_errors?: string[];
  latency_ms?: number;
  notes?: string;
}

export interface MachineProfile {
  id: string;
  name: string;
  max_dimensions_mm: { x: number; y: number; z: number };
  green_zone_limit_mm: number;
  yellow_zone_max_mm: number;
}
