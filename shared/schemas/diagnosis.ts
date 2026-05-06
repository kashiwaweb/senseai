import { z } from 'zod'

import { stepNumberSchema } from './common'

// ai-design.md §5.3 の Diagnosis JSON スキーマ。
// LLM が一般スタッフの診断時に返す JSON の形を定義する。

/** スコア 1〜5 (ai-design.md §5.4) */
export const scoreSchema = z.number().int().min(1).max(5)

/**
 * スコアラベル (ai-design.md §5.4)。
 *   5: お手本           - トップに近いレベル
 *   4: 得意             - 強みとして伸ばす
 *   3: 標準             - できている
 *   2: これから伸ばす   - 次の練習テーマ
 *   1: 次の一歩         - 取り組むと大きく成長
 *
 * 否定語（「未習得」「できていない」等）は使わない方針。
 */
export const scoreLabelSchema = z.enum(['お手本', '得意', '標準', 'これから伸ばす', '次の一歩'])

const strengthSchema = z.object({
  /** 良かった点の説明 */
  observation: z.string(),
  /** 実際の発話の原文引用 */
  quote: z.string(),
})

const growthAreaSchema = z.object({
  /** 伸ばせる点の説明（前向きな表現） */
  observation: z.string(),
  /** 次にやってみるとよいこと */
  suggestion: z.string(),
})

const improvementExampleSchema = z.object({
  /** あなた（trainee）が言った言葉 */
  your_words: z.string(),
  /** トップならこう言う（TopProfile の magic_words から優先引用） */
  top_would_say: z.string(),
  /** 理由 */
  why: z.string(),
})

const diagnosisStepSchema = z.object({
  step_number: stepNumberSchema,
  step_name: z.string(),
  score: scoreSchema,
  score_label: scoreLabelSchema,
  strengths: z.array(strengthSchema),
  growth_areas: z.array(growthAreaSchema),
  improvement_examples: z.array(improvementExampleSchema),
})

export const diagnosisSchema = z.object({
  /** 全体評価（前向きな 150 字目安） */
  overall_summary: z.string(),
  /** 個別の励ましメッセージ（80 字目安）。結びとして必須 */
  encouragement_message: z.string(),
  /** 7 ステップの平均スコア。1〜5 の範囲、小数可 */
  average_score: z.number().min(1).max(5),
  /** 7 ステップ。順序・数は厳格 */
  seven_steps: z.array(diagnosisStepSchema).length(7),
})

export type DiagnosisData = z.infer<typeof diagnosisSchema>
export type DiagnosisStep = z.infer<typeof diagnosisStepSchema>
export type ScoreLabel = z.infer<typeof scoreLabelSchema>
export type Strength = z.infer<typeof strengthSchema>
export type GrowthArea = z.infer<typeof growthAreaSchema>
export type ImprovementExample = z.infer<typeof improvementExampleSchema>
