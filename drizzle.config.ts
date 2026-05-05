import { defineConfig } from 'drizzle-kit'

// drizzle-kit (CLI) の設定。
// `npm run db:generate` / `db:migrate` / `db:studio` 実行時に参照される。
// アプリ実行時の接続は server/db/client.ts が担当（こちらはマイグレーション専用）。
//
// 接続先は server/db/client.ts と同じロジック:
//   TURSO_DATABASE_URL が空文字 or 未定義 → ローカル SQLite
//   それ以外 → Turso (libSQL HTTPS)
//
// dialect は drizzle-kit の制約で local / Turso で切り替える必要がある:
//   'sqlite' : ローカル SQLite ファイル（better-sqlite3 ベース）
//   'turso'  : libSQL HTTPS / WebSocket
const tursoUrl = process.env.TURSO_DATABASE_URL || ''
const tursoToken = process.env.TURSO_AUTH_TOKEN || ''

export default defineConfig(
  tursoUrl
    ? {
        dialect: 'turso',
        schema: './server/db/schema.ts',
        out: './server/db/migrations',
        dbCredentials: { url: tursoUrl, authToken: tursoToken },
      }
    : {
        dialect: 'sqlite',
        schema: './server/db/schema.ts',
        out: './server/db/migrations',
        dbCredentials: { url: 'file:local.db' },
      },
)
