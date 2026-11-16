/**
 * Agente IA Tier 1 - Integración con Google Gemini & Circuit Breaker
 * Trazabilidad: docs/05-kpis-edge-cases.md §2 (Caso Borde 05), RNF-01
 * 
 * SLA de Latencia: < 15 segundos.
 * Si la API de Gemini falla o excede 10 segundos [H], conmuta a fallback determinista.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { diagnoseSupportIssueLocally, DiagnosticOutput } from './deterministicFallback';

export interface GeminiAgentConfig {
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
}

export class GeminiTriageAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;
  private timeoutMs: number;

  constructor(config?: GeminiAgentConfig) {
    const key = config?.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = config?.modelName || 'gemini-1.5-flash';
    this.timeoutMs = config?.timeoutMs || 10000; // 10s SLA fallback

    if (key && key !== 'mock-dev-key') {
      try {
        this.genAI = new GoogleGenerativeAI(key);
      } catch (err) {
        console.warn('[GeminiTriageAgent] Falló inicialización de SDK, usando fallback:', err);
        this.genAI = null;
      }
    }
  }

  async analyzeSupportQuery(queryText: string, material?: string | null): Promise<DiagnosticOutput> {
    // Si no hay API key o cliente configurado, usar fallback determinista local de inmediato
    if (!this.genAI) {
      const localResult = diagnoseSupportIssueLocally(queryText, material);
      return {
        ...localResult,
        tokensConsumed: 0
      };
    }

    try {
      // Envolver llamada en un timeout estricto de 10s (Circuit Breaker)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED_10S')), this.timeoutMs)
      );

      const aiPromise = (async () => {
        const model = this.genAI!.getGenerativeModel({ model: this.modelName });
        const prompt = `Actúa como especialista técnico Tier 1 de PrintOps BPO (impresión 3D FDM).
Analiza la siguiente consulta de soporte y responde en texto conciso con diagnóstico y solución paso a paso.
Material: ${material || 'No especificado'}
Consulta: "${queryText}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const usage = response.usageMetadata;

        const baseLocal = diagnoseSupportIssueLocally(queryText, material);

        return {
          ...baseLocal,
          supportGuide: text || baseLocal.supportGuide,
          tokensConsumed: usage?.totalTokenCount || 120
        };
      })();

      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      console.warn('[GeminiTriageAgent] Excepción en llamada a IA. Activando Fallback Determinista:', error);
      const fallbackResult = diagnoseSupportIssueLocally(queryText, material);
      return {
        ...fallbackResult,
        triageRuleApplied: `${fallbackResult.triageRuleApplied}_AI_FALLBACK`,
        tokensConsumed: 0
      };
    }
  }
}
