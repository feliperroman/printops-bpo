/**
 * Repositorio de Auditoría Persistente en PostgreSQL
 * Trazabilidad: RNF-04 (Trazabilidad y Auditoría de Tickets, Cotizaciones, SLAs y Tokens)
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { TicketInput, TriageResult } from '../../domain/types';

export interface AuditRecord {
  ticket_id: string;
  request_type: string;
  target_tier: string;
  target_status: string;
  priority: string;
  dimensional_zone: string;
  calculated_cost_cop: number | null;
  recommended_material: string | null;
  deflected_in_tier_1: boolean;
  tokens_consumed: number;
  llm_token_waste: boolean;
  triage_rule_applied: string;
  latency_ms: number;
  created_at: string;
}

export class PostgresAuditRepository {
  private pool: Pool | null = null;
  private initialized = false;
  private inMemoryAudit: AuditRecord[] = [];

  constructor(databaseUrl?: string) {
    const url = databaseUrl || process.env.DATABASE_URL;
    if (url && !url.includes('mock:mock@mock')) {
      try {
        this.pool = new Pool({
          connectionString: url,
          connectionTimeoutMillis: 1500,
          max: 5
        });
        this.pool.on('error', () => {
          this.pool = null;
        });
      } catch {
        this.pool = null;
      }
    }
  }

  private async ensureSchema(): Promise<boolean> {
    if (!this.pool) return false;
    if (this.initialized) return true;

    try {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      const sql = fs.existsSync(schemaPath)
        ? fs.readFileSync(schemaPath, 'utf-8')
        : `CREATE TABLE IF NOT EXISTS tickets_audit (
            id SERIAL PRIMARY KEY,
            ticket_id VARCHAR(64) NOT NULL,
            request_type VARCHAR(32) NOT NULL,
            target_tier VARCHAR(16) NOT NULL,
            target_status VARCHAR(64) NOT NULL,
            priority VARCHAR(64) NOT NULL,
            dimensional_zone VARCHAR(32) NOT NULL,
            calculated_cost_cop NUMERIC(12, 2),
            recommended_material VARCHAR(32),
            deflected_in_tier_1 BOOLEAN NOT NULL DEFAULT FALSE,
            tokens_consumed INTEGER NOT NULL DEFAULT 0,
            llm_token_waste BOOLEAN NOT NULL DEFAULT FALSE,
            triage_rule_applied VARCHAR(128) NOT NULL,
            latency_ms INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );`;

      await this.pool.query(sql);
      this.initialized = true;
      return true;
    } catch {
      this.pool = null;
      return false;
    }
  }

  async recordTriage(input: Partial<TicketInput>, result: TriageResult): Promise<AuditRecord> {
    const record: AuditRecord = {
      ticket_id: result.ticket_id,
      request_type: input.request_type || 'QUOTATION',
      target_tier: result.target_tier,
      target_status: result.target_status,
      priority: result.priority,
      dimensional_zone: result.zone,
      calculated_cost_cop: result.calculated_cost_cop,
      recommended_material: result.recommended_material,
      deflected_in_tier_1: result.deflected_in_tier_1,
      tokens_consumed: result.tokens_consumed,
      llm_token_waste: result.llm_token_waste,
      triage_rule_applied: result.triage_rule_applied,
      latency_ms: result.latency_ms ?? 0,
      created_at: new Date().toISOString()
    };

    this.inMemoryAudit.push(record);

    const dbReady = await this.ensureSchema();
    if (dbReady && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO tickets_audit (
            ticket_id, request_type, target_tier, target_status, priority,
            dimensional_zone, calculated_cost_cop, recommended_material,
            deflected_in_tier_1, tokens_consumed, llm_token_waste,
            triage_rule_applied, latency_ms
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            record.ticket_id,
            record.request_type,
            record.target_tier,
            record.target_status,
            record.priority,
            record.dimensional_zone,
            record.calculated_cost_cop,
            record.recommended_material,
            record.deflected_in_tier_1,
            record.tokens_consumed,
            record.llm_token_waste,
            record.triage_rule_applied,
            record.latency_ms
          ]
        );
      } catch {
        // Fallback silencioso a memoria si la consulta falla
      }
    }

    return record;
  }

  async getRecentAudits(limit = 50): Promise<AuditRecord[]> {
    const dbReady = await this.ensureSchema();
    if (dbReady && this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT ticket_id, request_type, target_tier, target_status, priority,
                  dimensional_zone, calculated_cost_cop, recommended_material,
                  deflected_in_tier_1, tokens_consumed, llm_token_waste,
                  triage_rule_applied, latency_ms, created_at
           FROM tickets_audit
           ORDER BY id DESC
           LIMIT $1`,
          [limit]
        );
        return res.rows.map((r) => ({
          ...r,
          calculated_cost_cop: r.calculated_cost_cop !== null ? Number(r.calculated_cost_cop) : null
        }));
      } catch {
        // Fallback a memoria
      }
    }
    return this.inMemoryAudit.slice(-limit).reverse();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.pool = null;
    }
  }
}
