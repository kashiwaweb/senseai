// R2 動作確認スクリプト (W2-01 の合格判定)。
//
// 使い方:
//   tsx --env-file=.env scripts/r2-smoke.ts <path/to/audio-file>
//
// 流れ:
//   1. 署名付き PUT URL を発行 → ローカルファイルを PUT
//   2. 署名付き GET URL を発行 → ダウンロードして size 一致を確認
//   3. deleteObject で削除
//
// Nuxt の useRuntimeConfig() は使わず process.env から直接読む簡易版。

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: tsx --env-file=.env scripts/r2-smoke.ts <path/to/audio-file>')
  process.exit(1)
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('R2_* 環境変数が不足しています (.env を確認)')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

const key = `smoke/${Date.now()}-${basename(filePath)}`

function detectContentType(p: string): string {
  if (p.endsWith('.mp3')) return 'audio/mpeg'
  if (p.endsWith('.m4a')) return 'audio/mp4'
  if (p.endsWith('.wav')) return 'audio/wav'
  return 'application/octet-stream'
}
const contentType = detectContentType(filePath)

console.log(`[1/4] ローカルファイル読み込み: ${filePath}`)
const fileBuffer = await readFile(filePath)
console.log(`     サイズ: ${fileBuffer.length} bytes / Content-Type: ${contentType}`)

console.log(`[2/4] PUT 署名付き URL 発行 → アップロード (key=${key})`)
const putUrl = await getSignedUrl(
  client,
  new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
  { expiresIn: 600 },
)
const putRes = await fetch(putUrl, {
  method: 'PUT',
  body: fileBuffer,
  headers: { 'Content-Type': contentType },
})
if (!putRes.ok) {
  console.error(`PUT 失敗: ${putRes.status} ${await putRes.text()}`)
  process.exit(1)
}
console.log(`     ✓ アップロード成功`)

console.log(`[3/4] GET 署名付き URL 発行 → ダウンロード`)
const getUrl = await getSignedUrl(
  client,
  new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  { expiresIn: 600 },
)
const getRes = await fetch(getUrl)
if (!getRes.ok) {
  console.error(`GET 失敗: ${getRes.status}`)
  process.exit(1)
}
const downloaded = Buffer.from(await getRes.arrayBuffer())
console.log(`     サイズ: ${downloaded.length} bytes`)
if (downloaded.length !== fileBuffer.length) {
  console.error('サイズが一致しません')
  process.exit(1)
}
console.log(`     ✓ サイズ一致`)

console.log(`[4/4] 削除`)
await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
console.log(`     ✓ 削除完了`)

console.log('\nR2 スモークテスト成功 🎉')
