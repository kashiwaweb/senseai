import { ClaudeProvider } from './claude'
import { GeminiProvider } from './gemini'
import type { LLMProvider } from './types'

// LLM プロバイダーのファクトリ。
// LLM_PROVIDER 環境変数で切り替え（'gemini' / 'claude'）。デフォルトは 'gemini'。
//
// 切替判断基準は ai-design.md §2:
//   - 出力フォーマット崩れが頻発 → Claude
//   - フィードバック文のトーンが冷たい → Claude
//   - エステ業界のニュアンスが合わない → Claude
export function getLLM(): LLMProvider {
  const { llmProvider } = useRuntimeConfig()
  if (llmProvider === 'claude') return new ClaudeProvider()
  return new GeminiProvider()
}

export * from './types'
