import { defineConfig } from 'drizzle-kit'

// drizzle-kit (CLI) の設定。
// `npm run db:generate` / `db:migrate` / `db:studio` 実行時に参照される。
// アプリ実行時の接続は server/db/client.ts が担当（こちらはマイグレーション専用）。
export default defineConfig({
  dialect: 'turso',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
