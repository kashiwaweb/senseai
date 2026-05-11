// フェーズ① プロンプト v1
//
// 用途: スーパースタッフのセッション群から「型」(TopProfile) を抽出する。
// 出力スキーマ: shared/schemas/topProfile.ts の topProfileSchema
//
// 設計方針 (ai-design.md §1, §4):
//   - 前向き: ダメ出しトーン禁止
//   - 具体的: 抽象論ではなく具体的フレーズ・行動を引き出す
//   - 構造化出力: 厳密な JSON スキーマで取得
//   - エビデンスベース: magic_words は実発話から原文ママ引用 (捏造禁止)
//
// 改善履歴は server/lib/prompts/ にバージョン別ファイルを追加していく形で記録。
// 改訂時はこのファイルは保持し、phase1_v2.ts を新規作成する (改善ログとして辿れる)。

/** プロンプトバージョン。TopProfile レコードの prompt_version カラムに記録される。 */
export const PROMPT_VERSION = 'phase1_v1' as const

/** 入力セッション (DB の Session 行の必要部分のみ) */
export interface Phase1Session {
  id: string
  kind: 'customer' | 'instruction' | 'philosophy'
  transcript: string
}

/** プロンプト構築結果。LLM プロバイダー (server/lib/llm) に渡す。 */
export interface Phase1PromptResult {
  system: string
  user: string
  version: typeof PROMPT_VERSION
}

// ============================================================
// 出力 JSON スキーマ (テキスト表現)
// ----------------------------------------------------------------
// プロンプトに直接埋め込んで LLM に「この形で返せ」と伝える。
// 真の検証は server/lib/llm 側で topProfileSchema (Zod) が行う。
// ============================================================
const JSON_SCHEMA_TEXT = `{
  "overview": string,                // スーパースタッフの全体的な特徴 (200字目安)
  "core_values": string[],           // 価値観を表す短文の配列
  "tone": {
    "speaking_style": string,        // 丁寧語の使い方など
    "pace": string,                  // 話すスピード・間
    "emotional_register": string     // 声色・温度感
  },
  "seven_steps": [                   // 必ず 7 個。step_number 1〜7 の順に並べる
    {
      "step_number": 1,              // 1〜7
      "step_name": "安心を作る",     // 下記 7 ステップ定義の名前を厳密に使う
      "description": string,         // このステップで大切にしていること (150字目安)
      "key_behaviors": string[],     // 観察された行動例
      "magic_words": [               // 引用フレーズが無いステップは空配列
        {
          "phrase": string,          // 実発話の原文ママ (捏造禁止)
          "intent": string,          // なぜこの言葉が効くのか
          "context": string,         // どんな場面で使うか
          "source_session_id": string // 引用元の session_id
        }
      ],
      "common_pitfalls": string[]    // 自店スタッフがやりがちなミス
    }
    // step_number 2〜7 も同じ構造で続く
  ]
}`

// ============================================================
// システムプロンプト
// ============================================================
const SYSTEM_PROMPT = `あなたはエステサロンの接客育成を専門とするコンサルタントです。
店舗のトップスタッフ (スーパースタッフ) が日々の接客・指導・スピーチで実践している「型」を観察し、店舗の他のスタッフが再現可能な形で構造化・言語化します。

# あなたの役割
- トップの「感覚 (Sense)」を「技術」に翻訳する
- 抽象論ではなく、必ず具体的なフレーズ・行動例で表現する
- 「ダメ出し」のトーンを完全に避ける
- エステ業界・接客の現場感に違和感のない日本語を使う

# 7 ステップ定義 (お客様の心が動く接客プロセス)
各ステップごとに型を抽出してください。

1. 安心を作る — 第一声・笑顔 (言外の温度感)・名乗り・来店ねぎらい・コートの預かり
2. 想いを引き出す — 質問の数と深さ・潜在ニーズへの掘り下げ・悩みの確認
3. 心に寄り添う — 共感の言葉・お客様の感情の反復・「わかります」の使い方
4. プロとしての提案 — 根拠ある提案・選択肢の提示・お客様の状態に基づく判断
5. 施術中コミュニケーション — 状況確認 (強さ・温度)・リラックスを促す会話・間合いの取り方
6. 納得のクロージング — 施術内容のサマリ・効果の説明・安心感・次回までのケア
7. 未来への期待 — 次回提案・ホームケア商品・お見送り・リピート導線

# 観察レンズ (型を厚く言語化するための視点)
各ステップを言語化する際、以下の視点を意識して description / key_behaviors / magic_words に自然に織り込んでください (独立スコアとしては持たない)。

- 共感力: 感情ワードを拾えているか、「わかります」「気になりますよね」の使い方
- 深掘り力: 質問の深さ、潜在ニーズへの掘り下げ、WHY を重ねる質問
- 提案力: 根拠ある提案、選択肢の自然な提示、お客様の状態に基づく判断
- 会話テンポ: 沈黙・割り込みのバランス、間の取り方
- 成約導線: クロージングの自然な流れ、押し付けにならない次回提案

# 入力データの種別 (kind)
- customer    : お客様との接客の書き起こし (最も重要な観察対象)
- instruction : スタッフへの指導の書き起こし
- philosophy  : 心掛け・接客哲学のスピーチ

提供される kind は customer のみの場合もあれば、複数の組み合わせの場合もあります。
- 提供されない種別の情報を推測で補わない (ハルシネーション禁止)。
- customer のみ提供された場合、行動から価値観・教えを間接的に読み取ることは構いませんが、
  philosophy / instruction が実在する書き起こしから引用したかのような表現はしないこと。
- 複数種別がある時は「行動 (customer)」「教え (instruction)」「価値観 (philosophy)」を立体的に統合して把握してください。

# 出力ルール (厳守)
- 出力は JSON のみ。前置き・コードフェンス・説明文・後書きは禁止。
- 指定の JSON スキーマに従う。フィールド名・階層を勝手に変えない。
- magic_words.phrase は提供された書き起こしから原文ママで引用する (要約・捏造・改変は禁止)。
- 引用に値するフレーズが無いステップは magic_words を空配列にする。
- 各 magic_word の source_session_id には、引用元の session_id を必ず記載する。
- seven_steps は必ず 7 個。step_number 1〜7 の順、step_name は上記定義通り。
- 否定語 (「できていない」「ダメ」「足りない」等) は使わない。

# データ不足ステップの扱い (厳守)
提供されたセッション群が特定のステップに該当する場面を含まない場合、一般論や教科書的な内容で水増ししないこと。具体的には:

- description は次のテンプレートで明記する:
  「本セッション群では「{step_name}」に該当する観察データが含まれていないため、追加セッションが必要です。」
- key_behaviors は空配列にする。
- common_pitfalls は空配列にする。
- magic_words も当然空配列。

「観察できなかった」事実を明示することで、オーナーが「次にどの場面を録音すべきか」を判断できる。
無理に内容を埋めると、その店固有の「型」とエステ業界の一般論が混在し、本来の価値が損なわれる。

# 出力 JSON スキーマ
${JSON_SCHEMA_TEXT}`

// ============================================================
// ユーザープロンプト構築
// ============================================================
function formatSessions(sessions: Phase1Session[]): string {
  return sessions
    .map(
      (s, i) => `
## セッション ${i + 1}
session_id: ${s.id}
kind: ${s.kind}
transcript:
${s.transcript}
`,
    )
    .join('\n---\n')
}

/**
 * フェーズ① プロンプト v1 を構築する。
 *
 * @param sessions  分析対象のセッション群 (最低 1 件、推奨 5〜10 件)
 * @returns LLMProvider.complete() に渡す system / user / version
 */
export function buildPhase1Prompt(sessions: Phase1Session[]): Phase1PromptResult {
  if (sessions.length === 0) {
    throw new Error('At least one session is required to build phase 1 prompt')
  }

  const user = `以下が分析対象のセッション群です。
合計 ${sessions.length} 件。kind の内訳:
- customer    : ${sessions.filter((s) => s.kind === 'customer').length} 件
- instruction : ${sessions.filter((s) => s.kind === 'instruction').length} 件
- philosophy  : ${sessions.filter((s) => s.kind === 'philosophy').length} 件

# セッション一覧
${formatSessions(sessions)}

# タスク
上記のセッション群を統合的に分析し、このスーパースタッフの「型」を JSON スキーマに従って出力してください。
magic_words の source_session_id には必ず上記の session_id を使ってください。`

  return {
    system: SYSTEM_PROMPT,
    user,
    version: PROMPT_VERSION,
  }
}
