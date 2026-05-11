import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { topProfileSchema } from '#shared/schemas/topProfile'

import { db } from '~~/server/db/client'
import { salon, session, staff, topProfile } from '~~/server/db/schema'
import { getLLM } from '~~/server/lib/llm'
import { buildPhase1Prompt, type Phase1Session } from '~~/server/lib/prompts/phase1_v1'

// W1-14: テキスト直接入力で「型」を生成する最小 API。
//
// 本実装版は W3-01。本タスクは E2E が通ることの確認用なので:
//   - 1 サロン固定 (seed 済の SALON_ID)
//   - スーパースタッフは無ければ自動作成
//   - 3 種類の kind 入力を Session として INSERT してから生成
//
// W3 で `source_session_ids` 指定方式の本実装に置き換える。

// seed.ts で投入した PoC サロンの固定 ID
const SALON_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_SUPER_STAFF_NAME = 'PoC スーパースタッフ'

const bodySchema = z.object({
  customer: z.string().trim().optional().default(''),
  instruction: z.string().trim().optional().default(''),
  philosophy: z.string().trim().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  // 最低 1 種類は中身が必要
  if (!body.customer && !body.instruction && !body.philosophy) {
    throw createError({
      statusCode: 400,
      statusMessage: 'customer / instruction / philosophy のいずれかにテキストが必要です',
    })
  }

  // 1. Salon の存在確認 (seed されているはずだが防御的に)
  const salonRow = await db.select().from(salon).where(eq(salon.id, SALON_ID)).limit(1)
  if (!salonRow[0]) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Salon が seed されていません。`npm run db:seed` を実行してください',
    })
  }

  // 2. スーパースタッフを取得 (無ければ自動作成)
  const existingStaff = await db
    .select()
    .from(staff)
    .where(and(eq(staff.salonId, SALON_ID), eq(staff.role, 'super')))
    .limit(1)

  let staffId: string
  if (existingStaff[0]) {
    staffId = existingStaff[0].id
  } else {
    staffId = crypto.randomUUID()
    await db.insert(staff).values({
      id: staffId,
      salonId: SALON_ID,
      name: DEFAULT_SUPER_STAFF_NAME,
      role: 'super',
    })
  }

  // 3. テキストモードで Session を INSERT
  const now = Math.floor(Date.now() / 1000)
  const phase1Sessions: Phase1Session[] = []

  for (const kind of ['customer', 'instruction', 'philosophy'] as const) {
    const transcript = body[kind]
    if (!transcript) continue

    const sessionId = crypto.randomUUID()
    await db.insert(session).values({
      id: sessionId,
      staffId,
      kind,
      inputMode: 'text',
      recordedAt: now,
      transcript,
    })
    phase1Sessions.push({ id: sessionId, kind, transcript })
  }

  // 4. プロンプト構築 + LLM 呼び出し
  const prompt = buildPhase1Prompt(phase1Sessions)
  const llmResult = await getLLM().complete({
    system: prompt.system,
    user: prompt.user,
    schema: topProfileSchema,
  })

  // 5. version を採番して TopProfile を保存
  const latestProfile = await db
    .select({ version: topProfile.version })
    .from(topProfile)
    .where(eq(topProfile.salonId, SALON_ID))
    .orderBy(desc(topProfile.version))
    .limit(1)

  const nextVersion = (latestProfile[0]?.version ?? 0) + 1
  const profileId = crypto.randomUUID()

  await db.insert(topProfile).values({
    id: profileId,
    salonId: SALON_ID,
    version: nextVersion,
    sourceSessionIds: phase1Sessions.map((s) => s.id),
    profileJson: llmResult.data,
    llmModel: llmResult.model,
    promptVersion: prompt.version,
  })

  return {
    id: profileId,
    version: nextVersion,
    model: llmResult.model,
    promptVersion: prompt.version,
    sourceSessionIds: phase1Sessions.map((s) => s.id),
    data: llmResult.data,
  }
})
