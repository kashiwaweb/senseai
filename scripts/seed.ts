// PoC 用の単一 Salon を DB に投入する。
//
// 実行:
//   npm run db:seed         （ローカル local.db に対して実行）
//   tsx --env-file=.env scripts/seed.ts  （.env 経由で Turso 等に投入する場合）
//
// 単一 Salon を固定 ID で持つことで、後続のスタッフ作成時に salon_id を一意に決められる。
// 同名の Salon が既に存在する場合は何もしない（冪等）。

import { eq } from 'drizzle-orm'

import { client, db } from '../server/db/client'
import { salon } from '../server/db/schema'

const SALON_ID = '00000000-0000-0000-0000-000000000001'
const SALON_NAME = process.env.SALON_NAME || 'PoC サロン'

const existing = await db.select().from(salon).where(eq(salon.id, SALON_ID))

if (existing.length > 0) {
  console.log(`✓ Salon は既に存在します: ${existing[0]!.name} (${SALON_ID})`)
} else {
  await db.insert(salon).values({ id: SALON_ID, name: SALON_NAME })
  console.log(`✓ Salon を投入しました: ${SALON_NAME} (${SALON_ID})`)
}

await client.close()
