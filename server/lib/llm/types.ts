import type { ZodSchema } from 'zod'

// LLM 抽象化レイヤの型定義。
// 各プロバイダー (Gemini / Claude) はこのインターフェースを実装する。
//
// 設計方針 (ai-design.md §1):
//   - LLM 出力は厳密な JSON スキーマで取得（Zod で検証）
//   - スキーマ違反は LLMSchemaError で識別
//   - プロバイダーは内部で 1 度自動リトライ（仕様 §6）
//   - 呼び出し側は `complete<T>()` を呼ぶだけ。SDK の差分は意識しない

export interface LLMProvider {
  complete<T>(opts: LLMCompleteOptions<T>): Promise<LLMResult<T>>
}

export interface LLMCompleteOptions<T> {
  /** システムプロンプト（役割・制約） */
  system: string
  /** ユーザープロンプト（実データ・依頼内容） */
  user: string
  /** 期待する出力スキーマ。Zod で検証され、`T` 型に推論される */
  schema: ZodSchema<T>
}

export interface LLMResult<T> {
  /** Zod 検証を通った型安全なデータ */
  data: T
  /** 実際に使用したモデル ID（DB の llm_model カラムに記録） */
  model: string
  /** LLM の生レスポンス（再生成・デバッグ用） */
  raw: string
}

/**
 * LLM 出力が JSON パースまたは Zod 検証に失敗した時に投げる。
 * 呼び出し側はこのエラーを catch して raw を保存し、再生成 UI を出す。
 */
export class LLMSchemaError extends Error {
  override name = 'LLMSchemaError'
  constructor(
    message: string,
    public raw: string,
    public zodError?: unknown,
  ) {
    super(message)
  }
}
