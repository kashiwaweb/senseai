import Anthropic from '@anthropic-ai/sdk'

import { LLMSchemaError, type LLMCompleteOptions, type LLMProvider, type LLMResult } from './types'

// Claude Haiku 4.5 プロバイダー (フォールバック)。
// JSON 専用モードは持たないため、システムプロンプトで JSON のみ出力を厳命。
export class ClaudeProvider implements LLMProvider {
  private readonly model = 'claude-haiku-4-5'

  async complete<T>(opts: LLMCompleteOptions<T>): Promise<LLMResult<T>> {
    try {
      return await this.callOnce(opts)
    } catch (e) {
      if (!(e instanceof LLMSchemaError)) throw e
      console.warn('[claude] schema violation, retrying once')
      return await this.callOnce(opts)
    }
  }

  private async callOnce<T>(opts: LLMCompleteOptions<T>): Promise<LLMResult<T>> {
    const config = useRuntimeConfig()
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY が未設定です')
    }

    const client = new Anthropic({ apiKey: config.anthropicApiKey })

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 8192,
      // JSON のみ出力を強制するための補強。Anthropic SDK は専用 JSON モード非対応。
      system: `${opts.system}\n\n出力は必ず JSON のみ。説明文・コードフェンス・前置き・後書きは禁止。`,
      messages: [{ role: 'user', content: opts.user }],
    })

    // content は複数ブロックになり得るので、テキストブロックを連結する。
    let text = ''
    for (const block of message.content) {
      if (block.type === 'text') text += block.text
    }

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
