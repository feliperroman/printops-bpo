/**
 * Guardia de Rate Limiting en Puerta de Entrada
 * Trazabilidad: RNF-03 (Protección de Presupuesto y Cuota del Modelo de IA), KPI-04 (Zero-Waste Token Ratio)
 *
 * Bloquea ráfagas de tráfico o clientes abusivos en < 5 ms devolviendo HTTP 429
 * con 0 llamadas y 0 tokens consumidos de la API de Gemini.
 */

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export class GatewayRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private hits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(maxRequests = 120, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(clientKey: string, forceBlock = false): RateLimitStatus {
    const now = Date.now();

    if (forceBlock) {
      return { allowed: false, remaining: 0, resetInMs: this.windowMs };
    }

    const record = this.hits.get(clientKey);
    if (!record || now >= record.resetAt) {
      this.hits.set(clientKey, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInMs: this.windowMs
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, record.resetAt - now)
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetInMs: Math.max(0, record.resetAt - now)
    };
  }

  reset(): void {
    this.hits.clear();
  }
}
