# senseai システム構成書

最終更新: 2026-05-01

## 1. 全体構成

```
[ユーザー (ブラウザ)]
        │ HTTPS
        ▼
┌────────────────────────────────────────┐
│ Nuxt 3 (Vercel Edge)                   │
│  ├─ ページ (Vue 3)                     │
│  └─ サーバーAPI (Nitro)                │
│       │                                │
│       ├─→ [Cloudflare R2]              │ 音声ファイル（音声モード時）
│       ├─→ [Groq Whisper API]           │ 文字起こし（音声モード時・無料枠）
│       ├─→ [Gemini Flash API]           │ AI分析（切替可能）
│       └─→ [Turso (libSQL)]             │ メタデータ・テキスト・JSON
└────────────────────────────────────────┘

入力モードは2つ:
- 音声モード: 音声ファイル → R2 保存 → Groq Whisper → transcript
- テキストモード: ユーザーが書き起こし済みのテキストを直接投入
```

## 2. 技術スタック

| 層             | 採用技術                                 | 選定理由                                     |
| -------------- | ---------------------------------------- | -------------------------------------------- |
| フロント       | **Nuxt 3 (Vue 3)**                       | ユーザーの好み・SSRとAPIを1リポで完結        |
| バックエンド   | **Nuxt サーバールート (Nitro)**          | 別サーバー不要・Vercelデプロイ容易           |
| DB             | **Turso (libSQL)** Free tier             | SQLite互換・サーバーレス・無料枠大きい       |
| 認証           | **nuxt-auth-utils** + 単一共有パスワード | PoC は最小構成                               |
| 音声保存       | **Cloudflare R2** Free tier              | egress無料・10GB無料枠                       |
| 文字起こし     | **Groq Whisper API**（Large-v3-Turbo）   | 無料枠あり・OpenAI Whisper互換・日本語精度高 |
| 文字起こし代替 | **テキスト直接アップロード**             | 音声がない / 自前で起こした文字列を投入      |
| LLM            | **Google Gemini 2.5 Flash** (free)       | 無料枠 1500req/day・日本語OK                 |
| ホスティング   | **Vercel Free**                          | Nuxt公式推奨                                 |
| グラフ         | **Chart.js** (vue-chartjs)               | 軽量・レーダーチャート                       |
| ORM            | **Drizzle ORM**                          | 型安全・libSQL対応                           |
| バリデーション | **Zod**                                  | LLM出力スキーマ検証                          |

### 2.1 「Nuxt 単体 vs Python/FastAPI 分離」の判断

**Nuxt 単体（フロント+API一体）を採用**。Python バックエンドは作らない。

- 重い処理は **すべて外部API呼び出し**（Groq Whisper・Gemini・Claude）。Python の数値ライブラリの強みが活きない
- Anthropic / Google / Groq / OpenAI とも公式 TypeScript SDK を提供しているため API呼び出しに不便なし
- Pandas / Streamlit を使う計画がない（可視化は Chart.js で内製）
- 1リポ・1デプロイの方が個人開発は速い
- 将来 Pandas 級の数値処理や音声前処理が必要になれば、Python マイクロサービスを追加で対応

### 2.2 文字起こし戦略

**2モードを最初から両対応**:

| モード         | 用途                                                                        | 実装                                         |
| -------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| 音声モード     | スマホ等で録音した mp3/m4a/wav をそのまま投入                               | Groq Whisper API（無料枠）で自動文字起こし   |
| テキストモード | 自前で起こした文字列（メモ帳・CLOVA Note・Mac標準ディクテーション等）を投入 | 文字起こしステップをスキップしてそのまま保存 |

**選定理由**:

- Groq Whisper API は OpenAI Whisper API と SDK 互換、Large-v3-Turbo モデルで精度・速度ともに高い
- 無料枠（音声秒数ベース）で PoC の月50セッションは十分カバー可能
- フォールバック先として whisper.cpp ローカル実行も可（要セットアップ）
- テキストモードは実装コスト微小で運用の柔軟性が大きく上がる（Groq 障害時の保険・開発中のサンプル投入も容易）

## 3. LLM の役割と切替方針

LLM は以下の用途で使用:

1. **フェーズ①**: 会話/指導/スピーチ群から「型」JSON を生成
2. **フェーズ②**: 「型」と一般スタッフ会話を比較し診断JSON生成
3. **フェーズ②**: 前向きフィードバックの自然文生成

| 優先度          | モデル            | 用途                       |
| --------------- | ----------------- | -------------------------- |
| 第一候補        | Gemini 2.5 Flash  | PoC全般・無料枠で十分      |
| フォールバック1 | Claude Haiku 4.5  | トーン制御を強化したいとき |
| フォールバック2 | Claude Sonnet 4.6 | 最終品質が必要なとき       |

`server/lib/llm.ts` にプロバイダー抽象化レイヤを実装し、環境変数で切替可能にする。

```ts
// 例: server/lib/llm.ts
interface LLMProvider {
  complete(opts: { system: string; user: string; schema: ZodSchema }): Promise<unknown>
}
```

## 4. コスト試算

**前提**: PoC・月50セッション・1セッション平均30分

| 項目             | 単価                     | 月額試算  |
| ---------------- | ------------------------ | --------- |
| Groq Whisper API | 無料枠内（開発者枠）     | ¥0        |
| Gemini Flash     | 無料枠内（1500req/day）  | ¥0        |
| Vercel           | 無料枠内                 | ¥0        |
| Turso            | 無料枠内（500 DB / 9GB） | ¥0        |
| Cloudflare R2    | 無料枠内（10GB保存）     | ¥0        |
| **合計**         |                          | **¥0/月** |

**完全無料で PoC 運用可能**。Groq の無料枠を超えた場合のフォールバック:

1. テキストモードに切替（手動文字起こし）
2. whisper.cpp ローカル実行
3. 有料プラン（Groq 従量課金 or OpenAI Whisper API $0.006/min）

## 5. データモデル

### Salon

| カラム     | 型          | 説明   |
| ---------- | ----------- | ------ |
| id         | TEXT (uuid) | PK     |
| name       | TEXT        | 店舗名 |
| created_at | INTEGER     | UNIX秒 |

### Staff

| カラム     | 型          | 説明                |
| ---------- | ----------- | ------------------- |
| id         | TEXT (uuid) | PK                  |
| salon_id   | TEXT FK     |                     |
| name       | TEXT        | スタッフ名          |
| role       | TEXT        | 'super' / 'trainee' |
| created_at | INTEGER     |                     |

### Session

| カラム       | 型           | 説明                                                                      |
| ------------ | ------------ | ------------------------------------------------------------------------- |
| id           | TEXT (uuid)  | PK                                                                        |
| staff_id     | TEXT FK      |                                                                           |
| kind         | TEXT         | 'customer' / 'instruction' / 'philosophy'                                 |
| input_mode   | TEXT         | 'audio' / 'text'                                                          |
| recorded_at  | INTEGER      |                                                                           |
| audio_key    | TEXT NULL    | R2 オブジェクトキー（音声モード時のみ）                                   |
| transcript   | TEXT         | 文字起こし結果（音声モードは Groq Whisper、テキストモードはユーザー入力） |
| duration_sec | INTEGER NULL | 音声モード時のみ                                                          |
| created_at   | INTEGER      |                                                                           |

### TopProfile

| カラム             | 型              | 説明                                      |
| ------------------ | --------------- | ----------------------------------------- |
| id                 | TEXT (uuid)     | PK                                        |
| salon_id           | TEXT FK         |                                           |
| version            | INTEGER         | バージョン管理（再生成のたびに +1）       |
| source_session_ids | TEXT (JSON配列) | 元になった Session ID 群                  |
| profile_json       | TEXT (JSON)     | 「型」本体（ai-design.md のスキーマ準拠） |
| llm_model          | TEXT            | 生成に使ったモデル名                      |
| prompt_version     | TEXT            | 使用プロンプトのバージョン                |
| created_at         | INTEGER         |                                           |

### Diagnosis

| カラム         | 型          | 説明                                    |
| -------------- | ----------- | --------------------------------------- |
| id             | TEXT (uuid) | PK                                      |
| session_id     | TEXT FK     | 一般スタッフのセッション                |
| top_profile_id | TEXT FK     | 比較対象の「型」                        |
| result_json    | TEXT (JSON) | 診断結果（ai-design.md のスキーマ準拠） |
| llm_model      | TEXT        |                                         |
| prompt_version | TEXT        |                                         |
| created_at     | INTEGER     |                                         |

## 6. APIエンドポイント（草案）

| Method | Path                      | 用途                                                                  |
| ------ | ------------------------- | --------------------------------------------------------------------- |
| POST   | `/api/auth/login`         | 共有パスワードでログイン                                              |
| POST   | `/api/auth/logout`        |                                                                       |
| GET    | `/api/staff`              | スタッフ一覧                                                          |
| POST   | `/api/staff`              | スタッフ追加                                                          |
| PATCH  | `/api/staff/:id`          | スタッフ編集                                                          |
| POST   | `/api/sessions/upload`    | 音声/テキストの2モード対応。音声時は Groq Whisper で文字起こし→DB保存 |
| GET    | `/api/sessions`           | セッション一覧                                                        |
| GET    | `/api/sessions/:id`       | セッション詳細                                                        |
| POST   | `/api/profiles/generate`  | 指定セッション群から「型」生成                                        |
| GET    | `/api/profiles`           | 「型」一覧                                                            |
| GET    | `/api/profiles/latest`    | 最新の「型」取得                                                      |
| POST   | `/api/diagnoses/generate` | 指定セッションを診断                                                  |
| GET    | `/api/diagnoses/:id`      | 診断結果取得                                                          |

## 7. 環境変数

| 変数                                                                        | 用途                                 |
| --------------------------------------------------------------------------- | ------------------------------------ |
| `AUTH_PASSWORD`                                                             | 共有パスワード                       |
| `AUTH_SESSION_SECRET`                                                       | セッション暗号化キー                 |
| `GROQ_API_KEY`                                                              | Groq Whisper API                     |
| `GEMINI_API_KEY`                                                            | Gemini Flash                         |
| `ANTHROPIC_API_KEY`                                                         | LLM フォールバック時                 |
| `OPENAI_API_KEY`                                                            | Whisper API フォールバック時（任意） |
| `LLM_PROVIDER`                                                              | `gemini` / `claude`                  |
| `TURSO_DATABASE_URL`                                                        | DB接続                               |
| `TURSO_AUTH_TOKEN`                                                          | DB認証                               |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | R2接続                               |

## 8. デプロイ

- GitHubリポジトリ → Vercel 連携 → push で自動デプロイ
- 本番URL: `senseai-xxx.vercel.app`（独自ドメインは将来）
- ステージング環境は当面なし（PoCのため）

## 9. セキュリティ・プライバシー方針（PoC）

- 認証: 単一共有パスワード（PoC期）
- 顧客名・電話番号などは文字起こし時に正規表現＋LLMで `[氏名]` のように匿名化マスクを適用（将来）
- HTTPS強制
- 音声ファイルは署名付きURLでサーブ
- データ保存期間: PoC期間中は無期限・本番では削除ポリシー定義
- バックアップ: PoC期は不要、本番化時に検討

## 10. 今後の検討事項（保留）

- 音声長さの上限（Whisperの制約: 25MB / 30分前後）→ チャンク分割が必要なら別途設計
- 複数音声を1セッションに統合する仕組み
- 同意取得フロー（顧客側）
- スタッフごとログイン

## 11. 設計判断の記録（PoCスコープ）

PoC期間中は以下を採用しない。

| 却下した選択肢                               | 理由                                                                                        | 再考の条件                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Python/FastAPI バックエンド分離              | 重い処理は外部API呼び出しのみで TS SDK で十分。1リポ・1デプロイの方が個人開発は速い（§2.1） | Pandas級の数値処理や音声前処理が必要になったとき                                                      |
| ベクトルDB（Pinecone / Weaviate / pgvector） | PoC では「型」JSONは最新1件のみ参照。過去診断の意味検索需要も未確認。SQL検索で十分          | 「過去の似たケースを検索」などセマンティック検索需要が出たとき。その時は Turso のベクトル拡張で対応可 |
