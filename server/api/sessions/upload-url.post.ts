import { z } from 'zod'

import { createPresignedUploadUrl } from '~~/server/lib/r2'

// W2-02: ブラウザが R2 に直接 PUT するための署名付き URL を発行する。
//
// 流れ:
//   1. クライアントが filename / contentType / fileSizeBytes を申告
//   2. サーバが拡張子・MIME・サイズ上限を検証
//   3. uploads/{YYYY-MM-DD}/{uuid}-{sanitizedFilename} 形式のキーを採番
//   4. 署名付き PUT URL (10 分有効) を返却
//
// サイズ・拡張子の最終的なチェックは W2-04 の保存 API (転送後) でも行う。
// 本 API でのバリデーションはあくまで「悪意のないユーザーの誤操作を早期に弾く」目的。

const ALLOWED_EXTENSIONS = ['mp3', 'm4a', 'wav'] as const
const ALLOWED_CONTENT_TYPES = [
  'audio/mpeg', // mp3
  'audio/mp4', // m4a
  'audio/x-m4a', // m4a (Safari 等が送ってくる代替)
  'audio/wav',
  'audio/x-wav',
] as const
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100MB (screens.md §3.5)
const UPLOAD_URL_EXPIRES_SEC = 600 // 10 分

const bodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
})

// パストラバーサル防止 + R2 キーで安全に使える文字に限定。
// 日本語ファイル名も R2 自体は受け入れるが、署名や URL エンコードの取り回しが
// 面倒なので英数 + 基本記号のみに統一する。それ以外は '_' に置換。
function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? name
  return base.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getExtension(filename: string): string | null {
  const idx = filename.lastIndexOf('.')
  if (idx < 0) return null
  return filename.slice(idx + 1).toLowerCase()
}

function todayPrefix(): string {
  // YYYY-MM-DD (UTC ベース。PoC では JST との 9h ずれは許容)
  return new Date().toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const sanitized = sanitizeFilename(body.filename)
  const ext = getExtension(sanitized)
  if (!ext || !(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw createError({
      statusCode: 400,
      statusMessage: `拡張子は ${ALLOWED_EXTENSIONS.join(' / ')} のいずれかにしてください`,
    })
  }

  const audioKey = `uploads/${todayPrefix()}/${crypto.randomUUID()}-${sanitized}`
  const uploadUrl = await createPresignedUploadUrl(
    audioKey,
    body.contentType,
    UPLOAD_URL_EXPIRES_SEC,
  )
  const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_URL_EXPIRES_SEC

  return { uploadUrl, audioKey, expiresAt }
})
