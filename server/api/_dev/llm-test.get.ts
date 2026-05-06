import { z } from 'zod'

import { getLLM } from '~~/server/lib/llm'

// W1-11 動作確認用エンドポイント。
// LLM 抽象化レイヤが正しく接続できているかを最小プロンプトで確認するためのもの。
// 本番リリース時には削除する想定（_dev プレフィックスで内部用と明示）。
//
// 認証ミドルウェア (server/middleware/auth.ts) で保護されているため、
// /login でログイン済みのブラウザから http://localhost:3000/api/_dev/llm-test にアクセスして使う。

const testSchema = z.object({
  greeting: z.string(),
  language: z.string(),
})

export default defineEventHandler(async () => {
  const llm = getLLM()

  return await llm.complete({
    system: 'You are a JSON-only responder. Output exactly the requested structure, no extra text.',
    user: '日本語で短い挨拶を返してください。次の形式の JSON のみ: { "greeting": "...", "language": "ja" }',
    schema: testSchema,
  })
})
