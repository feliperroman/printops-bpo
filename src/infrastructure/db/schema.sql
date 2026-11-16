-- =============================================================================
-- PrintOps BPO - Esquema Relacional de Auditoría y Trazabilidad de SLAs
-- Trazabilidad: RNF-04, docs/06-cloud-architecture-ci-cd.md
-- =============================================================================

CREATE TABLE IF NOT EXISTS tickets_audit (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL,
    request_type VARCHAR(32) NOT NULL,
    client_type VARCHAR(64),
    client_name VARCHAR(128),
    part_name VARCHAR(255),
    dim_x NUMERIC(10, 2),
    dim_y NUMERIC(10, 2),
    dim_z NUMERIC(10, 2),
    requested_material VARCHAR(32),
    recommended_material VARCHAR(32),
    target_tier VARCHAR(16) NOT NULL,
    target_status VARCHAR(64) NOT NULL,
    priority VARCHAR(64) NOT NULL,
    dimensional_zone VARCHAR(32) NOT NULL,
    calculated_cost_cop NUMERIC(12, 2),
    deflected_in_tier_1 BOOLEAN NOT NULL DEFAULT FALSE,
    tokens_consumed INTEGER NOT NULL DEFAULT 0,
    llm_token_waste BOOLEAN NOT NULL DEFAULT FALSE,
    triage_rule_applied VARCHAR(128) NOT NULL,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    handshake_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_audit_ticket_id ON tickets_audit(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_audit_status ON tickets_audit(target_status);
CREATE INDEX IF NOT EXISTS idx_tickets_audit_priority ON tickets_audit(priority);
