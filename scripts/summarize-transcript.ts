// 文字起こしレビュー用マークダウン生成スクリプト。
//
// 使い方:
//   tsx --env-file=.env scripts/summarize-transcript.ts <audioKey>
//
// 例:
//   tsx --env-file=.env scripts/summarize-transcript.ts uploads/2026-06-03/abc-test.mp3
//
// 事前条件:
//   - transcribe-smoke.ts を実行済で、以下があること:
//     - local-data/transcripts/<sanitizedKey>.txt
//     - local-data/transcripts/<sanitizedKey>.segments.json (任意・あればタイムスタンプ付き本文に整形)
//
// 出力:
//   - local-data/summaries/<sanitizedKey>.md
//     サロンへの確認用に「要約 / 章立て / 確認が必要な単語 / タイムスタンプ付き本文」を含む。
//
// Nuxt の useRuntimeConfig() は使わず process.env から直接読む簡易版。

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const audioKey = process.argv[2]
if (!audioKey) {
  console.error('Usage: tsx --env-file=.env scripts/summarize-transcript.ts <audioKey>')
  process.exit(1)
}

const { GEMINI_API_KEY } = process.env
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY が未設定です (.env を確認)')
  process.exit(1)
}

const sanitizedKey = audioKey.replace(/\//g, '_')
const transcriptPath = `local-data/transcripts/${sanitizedKey}.txt`
const segmentsPath = `local-data/transcripts/${sanitizedKey}.segments.json`
const outPath = `local-data/summaries/${sanitizedKey}.md`

// ----------------------------------------------------------------
// 1. 文字起こし読み込み
// ----------------------------------------------------------------

console.log(`[1/4] 文字起こし読み込み: ${transcriptPath}`)
const transcript = await readFile(transcriptPath, 'utf8').catch((e: unknown) => {
  console.error(`読み込み失敗。先に transcribe-smoke.ts を実行してください: ${(e as Error).message}`)
  process.exit(1)
})
console.log(`     ${transcript.length} 文字`)

type WhisperSegment = { id: number; start: number; end: number; text: string }
type SegmentsFile = {
  audioKey: string
  durationSec: number | null
  language: string | null
  model: string
  segments: WhisperSegment[]
}

let segmentsData: SegmentsFile | null = null
try {
  const rawJson = await readFile(segmentsPath, 'utf8')
  segmentsData = JSON.parse(rawJson) as SegmentsFile
  console.log(`     segments: ${segmentsData.segments.length} 個`)
} catch {
  console.log(`     (segments.json なし。タイムスタンプ付き本文はスキップして全文ベタ貼りにします)`)
}

// ----------------------------------------------------------------
// 2. Gemini で要約・章立て・気になる単語を生成
// ----------------------------------------------------------------

const summarySchema = z.object({
  briefSummary: z.string(),
  topics: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(1)
    .max(15),
  suspiciousTerms: z
    .array(
      z.object({
        term: z.string(),
        reason: z.string(),
        suggestedCorrection: z.string().nullable(),
      }),
    )
    .max(10),
})

const system = `あなたは日本語の音声書き起こしをレビューする編集者です。
入力テキストは話者の区別がない自動文字起こしで、口語・冗長な部分や誤認識を含みます。
エステサロンの業務に関連する文脈である可能性が高い点を念頭に置いてください。

以下のルールで分析してください:

1. 全体を 2〜3 文で簡潔に要約する (briefSummary)
2. 内容を「章立て」として 5〜10 個のトピックに分割する (topics)
   - 各トピックは title (15〜30字程度) と description (1〜2 文) を持つ
   - 時系列順
3. 文脈的に不自然に見える単語を 0〜5 個ピックアップする (suspiciousTerms)
   - エステサロン文脈とずれている / 漢字変換が誤っている可能性
   - 想定される正しい表現がわかれば suggestedCorrection に文字列で書く
   - 不明なら suggestedCorrection は null を入れる (フィールド自体を省略しない)
   - 該当が無ければ空配列を返す

出力は JSON のみ。前置き・コードブロック・説明文は禁止。`

console.log(`[2/4] Gemini に要約・章立てを依頼中...`)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
const t0 = Date.now()
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `# 文字起こしテキスト\n\n${transcript}`,
  config: {
    systemInstruction: system,
    responseMimeType: 'application/json',
  },
})
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`     LLM 応答 ${elapsed}s`)

const text = response.text ?? ''
let parsed: unknown
try {
  parsed = JSON.parse(text)
} catch {
  console.error('Gemini レスポンスが JSON ではありません:')
  console.error(text.slice(0, 500))
  process.exit(1)
}

const result = summarySchema.safeParse(parsed)
if (!result.success) {
  console.error('Gemini レスポンスがスキーマに合いません:')
  console.error(result.error.message)
  console.error('---raw---')
  console.error(text.slice(0, 1000))
  process.exit(1)
}
const summary = result.data
console.log(
  `     ✓ topics: ${summary.topics.length} / suspicious: ${summary.suspiciousTerms.length}`,
)

// ----------------------------------------------------------------
// 3. マークダウン生成
// ----------------------------------------------------------------

console.log(`[3/4] マークダウン生成`)
const md = renderMarkdown(audioKey, transcript, segmentsData, summary)

// ----------------------------------------------------------------
// 4. 保存
// ----------------------------------------------------------------

console.log(`[4/4] 保存: ${outPath}`)
await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, md, 'utf8')

console.log(`\n✓ レビュー用マークダウンを保存しました`)
console.log(`  ${outPath}`)

// ================================================================
// ヘルパー
// ================================================================

function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

// Whisper の segments を読みやすい段落に集約する。
// - 累計文字数が 200 字を超えたら区切る
// - 直前 segment と 2 秒以上の沈黙があれば区切る
function groupSegments(segments: WhisperSegment[]): { start: number; text: string }[] {
  const paragraphs: { start: number; text: string }[] = []
  let current: { start: number; text: string } | null = null
  let prevEnd = 0

  for (const seg of segments) {
    const segText = seg.text.trim()
    if (!segText) continue

    const gap = seg.start - prevEnd
    const shouldBreak = current && (current.text.length > 200 || gap > 2)

    if (!current || shouldBreak) {
      if (current) paragraphs.push(current)
      current = { start: seg.start, text: segText }
    } else {
      current.text += segText
    }
    prevEnd = seg.end
  }
  if (current) paragraphs.push(current)
  return paragraphs
}

function escapeMdTableCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function renderMarkdown(
  audioKey: string,
  transcript: string,
  segmentsData: SegmentsFile | null,
  summary: z.infer<typeof summarySchema>,
): string {
  const lines: string[] = []

  const fileLabel = audioKey.split('/').pop() ?? audioKey
  lines.push(`# 文字起こしレビュー: ${fileLabel}`)
  lines.push('')
  lines.push('## 録音情報')
  lines.push(`- audioKey: \`${audioKey}\``)
  if (segmentsData) {
    if (segmentsData.durationSec != null) {
      lines.push(
        `- 長さ: ${formatTimestamp(segmentsData.durationSec)} (${segmentsData.durationSec} 秒)`,
      )
    }
    lines.push(`- 検出言語: ${segmentsData.language ?? '?'}`)
    lines.push(`- モデル: ${segmentsData.model}`)
  }
  lines.push(`- 文字数: ${transcript.length.toLocaleString()} 字`)
  lines.push('')

  lines.push('## 要約')
  lines.push(summary.briefSummary)
  lines.push('')

  lines.push('## 章立て')
  summary.topics.forEach((t, i) => {
    lines.push(`${i + 1}. **${t.title}**: ${t.description}`)
  })
  lines.push('')

  if (summary.suspiciousTerms.length > 0) {
    lines.push('## 確認が必要な単語')
    lines.push('| 単語 | 理由 | 想定される正しい表現 |')
    lines.push('| --- | --- | --- |')
    for (const t of summary.suspiciousTerms) {
      lines.push(
        `| ${escapeMdTableCell(t.term)} | ${escapeMdTableCell(t.reason)} | ${
          t.suggestedCorrection ? escapeMdTableCell(t.suggestedCorrection) : '-'
        } |`,
      )
    }
    lines.push('')
  }

  if (segmentsData && segmentsData.segments.length > 0) {
    lines.push('## タイムスタンプ付き本文')
    const paragraphs = groupSegments(segmentsData.segments)
    for (const p of paragraphs) {
      lines.push(`**[${formatTimestamp(p.start)}]** ${p.text}`)
      lines.push('')
    }
  } else {
    lines.push('## 本文')
    lines.push(transcript)
    lines.push('')
  }

  return lines.join('\n')
}
