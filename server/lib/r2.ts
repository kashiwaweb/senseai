import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 (S3互換) ラッパ。
// 音声ファイルは Vercel サーバーレス関数を経由せず、ブラウザから R2 へ直接 PUT する方針。
// (architecture.md §2 / W2-02 の署名付き URL 方式)
//
// 提供する関数:
//   - createPresignedUploadUrl   : ブラウザ → R2 への直接 PUT 用
//   - createPresignedDownloadUrl : 音声再生 / Whisper への入力取得用
//   - deleteObject               : セッション削除時のクリーンアップ用

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client

  const config = useRuntimeConfig()
  if (!config.r2AccountId || !config.r2AccessKeyId || !config.r2SecretAccessKey) {
    throw new Error('R2 認証情報 (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) が未設定です')
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
    forcePathStyle: true,
  })
  return _client
}

function getBucket(): string {
  const { r2Bucket } = useRuntimeConfig()
  if (!r2Bucket) throw new Error('R2_BUCKET が未設定です')
  return r2Bucket
}

// アップロード用の署名付き URL を発行する。
// デフォルト有効期限 10 分: 漏洩リスクを抑えるため短めに設定。
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSec = 600,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresInSec })
}

// ダウンロード用の署名付き URL を発行する。
// デフォルト有効期限 1 時間: 音声再生中に切れないように長めに設定。
export async function createPresignedDownloadUrl(
  key: string,
  expiresInSec = 3600,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  })
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresInSec })
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  )
}
