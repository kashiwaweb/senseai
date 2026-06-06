// Groq Whisper 動作確認スクリプト (W2-03)。
//
// 使い方:
//   tsx --env-file=.env scripts/transcribe-smoke.ts <audioKey>
//
// 例:
//   tsx --env-file=.env scripts/transcribe-smoke.ts uploads/2026-06-03/abc-test.mp3
//
// 事前条件:
//   - 対象 audioKey の音声が R2 にアップロード済みであること
//     (W2-02 の curl PUT で残したファイルでも、別途上げたファイルでもOK)
//
// Nuxt の useRuntimeConfig() は使わず process.env から直接読む簡易版。

import {
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import Groq from 'groq-sdk'

const audioKey = process.argv[2]
if (!audioKey) {
  console.error('Usage: tsx --env-file=.env scripts/transcribe-smoke.ts <audioKey>')
  process.exit(1)
}

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  GROQ_API_KEY,
} = process.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('R2_* 環境変数が不足しています (.env を確認)')
  process.exit(1)
}
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY が未設定です (.env を確認)')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

console.log(`[1/3] R2 から取得: ${audioKey}`)
const downloadUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: R2_BUCKET, Key: audioKey }),
  { expiresIn: 600 },
)
const response = await fetch(downloadUrl)
if (!response.ok) {
  console.error(`R2 取得失敗: ${response.status}`)
  process.exit(1)
}
const blob = await response.blob()
console.log(`     サイズ: ${blob.size} bytes / type: ${blob.type || '(unknown)'}`)

const MAX = 25 * 1024 * 1024
if (blob.size > MAX) {
  console.error(`サイズ超過: ${Math.round(blob.size / 1024 / 1024)}MB > 25MB`)
  process.exit(1)
}

console.log(`[2/3] Groq Whisper で文字起こし中...`)
const filename = audioKey.split('/').pop() ?? 'audio.bin'
const file = new File([blob], filename, { type: blob.type })

const groq = new Groq({ apiKey: GROQ_API_KEY })
const t0 = Date.now()
const result = await groq.audio.transcriptions.create({
  file,
  model: 'whisper-large-v3-turbo',
  response_format: 'verbose_json',
  language: 'ja',
})
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

const raw = result as unknown as {
  text: string
  duration?: number
  language?: string
}

console.log(`[3/3] 結果 (処理時間 ${elapsed}s)`)
console.log(`     duration: ${raw.duration ?? '?'} sec`)
console.log(`     language: ${raw.language ?? '?'}`)
console.log(`     transcript (先頭 500 文字):`)
console.log('-----')
console.log(raw.text.slice(0, 500))
console.log('-----')

console.log(`\n文字起こし成功 🎉 全長 ${raw.text.length} 文字`)
