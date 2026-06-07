import Groq from 'groq-sdk'

import { createPresignedDownloadUrl } from './r2'

// W2-03: Groq Whisper (Large-v3-Turbo) で音声を文字起こしする。
//
// 戦略 (architecture.md §2.2):
//   - Groq の無料枠 (OpenAI Whisper 互換 API) を利用
//   - 25MB / 30 分前後を上限とし、超過時は明示的にエラー (チャンク分割は将来)
//   - 障害時のフォールバックはテキストモードへの誘導 (UI 側で案内)

export type TranscribeResult = {
  transcript: string
  durationSec: number | null
  language: string | null
  model: string
}

const MODEL = 'whisper-large-v3-turbo'
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // Groq Whisper 制約

// Whisper 日本語モデルは無音 / 不明瞭な区間で YouTube 由来の定型句を
// 幻聴することが知られている (冒頭・末尾とも)。これらを除去する。
// 完全一致でなく、繰り返しや句読点も吸収するため正規表現を使う。
const WHISPER_HALLUCINATIONS = [
  'ご視聴ありがとうございました',
  'ご覧いただきありがとうございました',
  'チャンネル登録お願いします',
  'ご視聴いただきありがとうございました',
  'お待ちください',
]
const HALLUCINATION_RE = new RegExp(
  `(${WHISPER_HALLUCINATIONS.join('|')})[\\s。、,.!?]*`,
  'g',
)

function stripWhisperHallucination(text: string): string {
  // 冒頭・末尾に集中して出現するため、まず全体から除去 → 前後 trim。
  // 文中の同フレーズも除去するが、実発話で同文言が出る確率は極めて低いので問題なし。
  return text.replace(HALLUCINATION_RE, '').trim()
}

export async function transcribeAudioFromR2(audioKey: string): Promise<TranscribeResult> {
  const { groqApiKey } = useRuntimeConfig()
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY が未設定です')
  }

  // 1. R2 から音声を取得
  const downloadUrl = await createPresignedDownloadUrl(audioKey, 600)
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`R2 から音声を取得できませんでした: ${response.status}`)
  }
  const blob = await response.blob()

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `音声ファイルが大きすぎます (${Math.round(blob.size / 1024 / 1024)}MB)。25MB 以下にしてください。`,
    })
  }

  // 2. Groq に投げる
  // ファイル名は Groq 側のログ用。拡張子から MIME を推定するので
  // R2 のキー末尾をそのまま使う。
  const filename = audioKey.split('/').pop() ?? 'audio.bin'
  const file = new File([blob], filename, { type: blob.type })

  const groq = new Groq({ apiKey: groqApiKey })
  const result = await groq.audio.transcriptions.create({
    file,
    model: MODEL,
    response_format: 'verbose_json', // duration / language も取得
    language: 'ja', // 日本語固定 (requirements.md §7 言語仕様)
  })

  // verbose_json なら duration / language が含まれる。
  // groq-sdk の型はバージョンで揺れるので unknown 経由で取り出す。
  const raw = result as unknown as {
    text: string
    duration?: number
    language?: string
  }

  return {
    transcript: stripWhisperHallucination(raw.text ?? ''),
    durationSec: typeof raw.duration === 'number' ? Math.round(raw.duration) : null,
    language: raw.language ?? null,
    model: MODEL,
  }
}
