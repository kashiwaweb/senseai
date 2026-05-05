import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// architecture.md §5 のデータモデルを Drizzle で表現。
//
// 規約:
// - id は TEXT (UUID v4)。生成は app コードで crypto.randomUUID() を使う。
// - 日時は INTEGER（UNIX 秒）。created_at は SQLite の unixepoch() で DB 側 default を持たせる。
// - JSON 値は TEXT 型 + Drizzle の `mode: 'json'` で自動シリアライズ。
// - FK は onDelete: 'cascade' で関連レコードを連鎖削除（PoC の簡潔さ優先）。

// ============================================================
// Salon: 店舗
// ============================================================
export const salon = sqliteTable('salon', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
})

// ============================================================
// Staff: スタッフ（スーパー or 一般）
// ============================================================
export const staff = sqliteTable(
  'staff',
  {
    id: text('id').primaryKey(),
    salonId: text('salon_id')
      .notNull()
      .references(() => salon.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role', { enum: ['super', 'trainee'] }).notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('staff_salon_id_idx').on(table.salonId)],
)

// ============================================================
// Session: 1 回分の音声/テキスト入力
// ============================================================
export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    staffId: text('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    // 'customer'    : 顧客接客
    // 'instruction' : スタッフへの指導音声
    // 'philosophy'  : 心掛け/接客哲学のスピーチ
    kind: text('kind', { enum: ['customer', 'instruction', 'philosophy'] }).notNull(),
    // 'audio' : 音声ファイル（R2）+ Whisper 文字起こし
    // 'text'  : ユーザーが書き起こし済みのテキストを直接投入
    inputMode: text('input_mode', { enum: ['audio', 'text'] }).notNull(),
    recordedAt: integer('recorded_at').notNull(),
    // 音声モード時のみ: R2 のオブジェクトキー
    audioKey: text('audio_key'),
    transcript: text('transcript').notNull(),
    // 音声モード時のみ: 録音長
    durationSec: integer('duration_sec'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('session_staff_id_idx').on(table.staffId)],
)

// ============================================================
// TopProfile: スーパースタッフの「型」
// ============================================================
export const topProfile = sqliteTable(
  'top_profile',
  {
    id: text('id').primaryKey(),
    salonId: text('salon_id')
      .notNull()
      .references(() => salon.id, { onDelete: 'cascade' }),
    // バージョン管理: 同一 salon 内で再生成のたびに +1
    version: integer('version').notNull(),
    // 元になった Session ID 群（JSON 配列で保存）
    sourceSessionIds: text('source_session_ids', { mode: 'json' }).$type<string[]>().notNull(),
    // 「型」本体 JSON（ai-design.md §4.3 のスキーマ）
    // 厳密な型は shared/schemas/topProfile.ts (W1-12) で Zod 定義
    profileJson: text('profile_json', { mode: 'json' }).$type<unknown>().notNull(),
    llmModel: text('llm_model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('top_profile_salon_id_idx').on(table.salonId)],
)

// ============================================================
// Diagnosis: 一般スタッフの診断結果
// ============================================================
export const diagnosis = sqliteTable(
  'diagnosis',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => session.id, { onDelete: 'cascade' }),
    topProfileId: text('top_profile_id')
      .notNull()
      .references(() => topProfile.id, { onDelete: 'cascade' }),
    // 診断結果 JSON（ai-design.md §5.3 のスキーマ）
    // 厳密な型は shared/schemas/diagnosis.ts (W1-12) で Zod 定義
    resultJson: text('result_json', { mode: 'json' }).$type<unknown>().notNull(),
    llmModel: text('llm_model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('diagnosis_session_id_idx').on(table.sessionId)],
)

// ============================================================
// 型エイリアス（クエリ結果・挿入時に使用）
// ============================================================
export type Salon = typeof salon.$inferSelect
export type NewSalon = typeof salon.$inferInsert
export type Staff = typeof staff.$inferSelect
export type NewStaff = typeof staff.$inferInsert
export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert
export type TopProfile = typeof topProfile.$inferSelect
export type NewTopProfile = typeof topProfile.$inferInsert
export type Diagnosis = typeof diagnosis.$inferSelect
export type NewDiagnosis = typeof diagnosis.$inferInsert
