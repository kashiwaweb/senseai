import { z } from 'zod'

// フェーズ① (TopProfile) と② (Diagnosis) で共通の小さなプリミティブ。
// 個別ファイルに重複させるとブレるので、ここに集約。

/** 7 ステップ (ai-design.md §3) のステップ番号 1〜7 */
export const stepNumberSchema = z.number().int().min(1).max(7)
