import { GoogleGenAI } from '@google/genai'

import { LLMSchemaError, type LLMCompleteOptions, type LLMProvider, type LLMResult } from './types'

// Gemini 2.5 Flash プロバイダー (第一候補・無料枠 1500req/day)。
// JSON モード (responseMimeType) で構造化出力を強制する。
export class GeminiProvider implements LLMProvider {
  private readonly model = 'gemini-2.5-flash'

  async complete<T>(opts: LLMCompleteOptions<T>): Promise<LLMResult<T>> {
    try {
      return await this.callOnce(opts)
    } catch (e) {
      // スキーマ違反のみ自動リトライ（ai-design.md §6）。
      // ネットワークエラー等はそのまま伝播。
      if (!(e instanceof LLMSchemaError)) throw e
      console.warn('[gemini] schema violation, retrying once')
      return await this.callOnce(opts)
    }
  }

  private async callOnce<T>(opts: LLMCompleteOptions<T>): Promise<LLMResult<T>> {
    const config = useRuntimeConfig()
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY が未設定です')
    }

    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey })

    const response = await ai.models.generateContent({
      model: this.model,
      contents: opts.user,
      config: {
        systemInstruction: opts.system,
        responseMimeType: 'application/json',
      },
    })

    const text = response.text ?? ''

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new LLMSchemaError('JSON parse failed', text)
    }

    const result = opts.schema.safeParse(parsed)
    if (!result.success) {
      throw new LLMSchemaError(
        `Schema validation failed: ${result.error.message}`,
        text,
        result.error,
      )
    }

    return { data: result.data, model: this.model, raw: text }
  }
}
