import { z } from 'zod'

import { stepNumberSchema } from './common'

// ai-design.md §4.3 の TopProfile JSON スキーマ。
// LLM (Gemini/Claude) が「型」抽出時に返す JSON の形を定義する。
//
// 用途:
//   - topProfileSchema : ランタイム検証 (server/lib/llm 経由)
//   - TopProfileData   : クライアント・サーバー双方の型推論
//   - 個別 part の型 (MagicWord 等) は表示コンポーネントで利用

const magicWordSchema = z.object({
  /** 実際にトップが使ったフレーズ（捏造禁止、実セッションからの引用） */
  phrase: z.string(),
  /** なぜこの言葉が効くのか */
  intent: z.string(),
  /** どんな場面で使うか */
  context: z.string(),
  /** 引用元の Session ID */
  source_session_id: z.string(),
})

const topProfileStepSchema = z.object({
  step_number: stepNumberSchema,
  step_name: z.string(),
  /** このステップでスーパースタッフが大切にしていること（150 字目安） */
  description: z.string(),
  /** 観察された行動例 */
  key_behaviors: z.array(z.string()),
  magic_words: z.array(magicWordSchema),
  /** やりがちなミス（自店スタッフ向け注意点） */
  common_pitfalls: z.array(z.string()),
})

const toneSchema = z.object({
  speaking_style: z.string(),
  pace: z.string(),
  emotional_register: z.string(),
})

export const topProfileSchema = z.object({
  /** スーパースタッフの全体的な特徴（200 字目安） */
  overview: z.string(),
  /** 価値観を表す短文の配列 */
  core_values: z.array(z.string()),
  tone: toneSchema,
  /** 7 ステップ。順序・数は厳格（仕様で 7 固定） */
  seven_steps: z.array(topProfileStepSchema).length(7),
})

export type TopProfileData = z.infer<typeof topProfileSchema>
export type TopProfileStep = z.infer<typeof topProfileStepSchema>
export type MagicWord = z.infer<typeof magicWordSchema>
export type TopProfileTone = z.infer<typeof toneSchema>
