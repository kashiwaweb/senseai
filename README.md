# senseai

> トップの"感覚"を、全員の"技術"にする。

トップスタッフの「接客のSense（感覚）」を AI で言語化・体系化し、サロン全員が再現可能な「技術」に変換する PoC アプリ。

詳細仕様は [`docs/`](./docs/) を参照:

- [`requirements.md`](./docs/requirements.md) - 要件定義
- [`architecture.md`](./docs/architecture.md) - システム構成
- [`ai-design.md`](./docs/ai-design.md) - AI 設計
- [`screens.md`](./docs/screens.md) - 画面設計
- [`todo.md`](./docs/todo.md) - 実装 ToDo

---

## 開発環境

### 前提

- Node.js **>= 22 LTS**（`package.json` の `engines` で固定）
- npm **>= 10**

### セットアップ

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

http://localhost:3000 で起動。

### スクリプト一覧

| コマンド               | 用途                             |
| ---------------------- | -------------------------------- |
| `npm run dev`          | 開発サーバー起動                 |
| `npm run build`        | 本番ビルド                       |
| `npm run preview`      | ビルド成果物のローカルプレビュー |
| `npm run lint`         | ESLint 静的解析                  |
| `npm run lint:fix`     | ESLint 自動修正                  |
| `npm run format`       | Prettier で整形                  |
| `npm run format:check` | Prettier 整形チェックのみ        |

---

## ディレクトリ構成

```
senseai/
├── app/                      # Nuxt 4 クライアントコード（srcDir）
│   ├── components/           # Vue コンポーネント（自動 import）
│   ├── composables/          # Composable（`useXxx`、自動 import）
│   ├── layouts/              # Nuxt レイアウト
│   ├── middleware/           # クライアント側ルートミドルウェア
│   ├── pages/                # ファイルベースルーティング
│   └── app.vue               # ルートコンポーネント
├── assets/
│   └── css/                  # Tailwind エントリ等のグローバル CSS
├── server/                   # Nitro サーバー
│   ├── api/                  # API エンドポイント
│   ├── db/                   # Drizzle スキーマ・接続
│   ├── lib/                  # サーバー専用ユーティリティ
│   │   └── prompts/          # LLM プロンプト（バージョン別）
│   ├── middleware/           # サーバーミドルウェア（認証等）
│   └── utils/                # サーバー側汎用ユーティリティ
├── shared/                   # クライアント・サーバー両方から使う共有コード
│   ├── schemas/              # Zod スキーマ
│   └── utils/                # 共通ユーティリティ
├── public/                   # 静的ファイル（favicon 等）
├── docs/                     # 仕様書・設計ドキュメント
├── scripts/                  # CLI スクリプト（seed 等）
├── nuxt.config.ts            # Nuxt 設定
├── tailwind.config.ts        # Tailwind 設定
├── eslint.config.mjs         # ESLint 設定（@nuxt/eslint 自動生成）
└── .prettierrc               # Prettier 設定
```

---

## Import エイリアス

Nuxt 4 のデフォルト + 慣習で、以下のエイリアスを使う。

| エイリアス         | 解決先             | 用途                                              |
| ------------------ | ------------------ | ------------------------------------------------- |
| `~/` または `@/`   | `app/`             | クライアントコードの import                       |
| `~~/` または `@@/` | プロジェクトルート | ルート直下のファイル参照                          |
| `#shared/*`        | `shared/*`         | クライアント・サーバー双方から共通コードを import |
| `#imports`         | Nuxt 自動 import   | 通常は明示不要（ref/computed 等は自動）           |

例:

```ts
// クライアントから（app/ 配下）
import StaffCard from '~/components/StaffCard.vue'

// クライアント・サーバー両方から
import { topProfileSchema } from '#shared/schemas/topProfile'

// サーバーから（server/ 配下）
import { db } from '~~/server/db/client'
```

---

## 命名規則

| カテゴリ             | 規則                           | 例                                      |
| -------------------- | ------------------------------ | --------------------------------------- |
| Vue コンポーネント   | PascalCase                     | `StaffCard.vue`, `RadarChart.vue`       |
| Composable           | `useXxx`（camelCase）          | `useAuth.ts`, `useSessions.ts`          |
| ページ               | kebab-case + 動的 `[id]`       | `staff/[id].vue`, `diagnoses/index.vue` |
| API ルート           | kebab-case + 動詞接尾辞        | `sessions.get.ts`, `auth/login.post.ts` |
| DB テーブル          | snake_case                     | `top_profile`, `staff`                  |
| Drizzle スキーマ変数 | camelCase（テーブル名 → 変数） | `staff`, `topProfiles`                  |
| Zod スキーマ         | camelCase + `Schema` 接尾辞    | `topProfileSchema`, `diagnosisSchema`   |
| プロンプトファイル   | `phaseN_vM.ts`                 | `phase1_v1.ts`, `phase2_v1.ts`          |
| 環境変数             | UPPER_SNAKE_CASE               | `GROQ_API_KEY`, `LLM_PROVIDER`          |

### コミットメッセージ

特に厳格な規約は設けないが、**命令形・1 行サマリ + 必要なら本文**を基本とする。日本語/英語どちらでも可。例:

```
ESLint を Nuxt モジュール経由で追加
TypeScript strict 化
W1-02: Tailwind CSS 導入
```

---

## 環境変数

`.env` をルート直下に置く。テンプレートは `.env.example`（W1-04 で作成）参照。

主な変数（詳細は `docs/architecture.md §7`）:

- 認証: `AUTH_PASSWORD`, `AUTH_SESSION_SECRET`
- LLM: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_PROVIDER`
- 文字起こし: `GROQ_API_KEY`
- DB: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- ストレージ: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

---

## デプロイ

Vercel に push で自動デプロイ予定（W8-01 で設定）。詳細は `docs/architecture.md §8`。

---

## ライセンス

PoC のため非公開（Private repository）。
