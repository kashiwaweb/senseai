import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

// 接続先の決定:
//   TURSO_DATABASE_URL が設定されていれば Turso(libSQL HTTPS) に接続
//   未設定ならローカル SQLite ファイル `local.db` にフォールバック
//
// この分岐により、ローカル開発はオフライン可能・本番は Turso を使う運用ができる。
const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

export const client = createClient(url ? { url, authToken } : { url: 'file:local.db' })

export const db = drizzle(client)
