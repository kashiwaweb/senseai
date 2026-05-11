import { count, desc } from 'drizzle-orm'

import { db } from '~~/server/db/client'
import { diagnosis, session, staff, topProfile } from '~~/server/db/schema'

// ダッシュボード (`/`) のサマリ + 最近のアクティビティを返す。
// screens.md §3.2 の要件:
//   - スタッフ数 / セッション数 / 「型」バージョン / 診断回数
//   - 最近のアクティビティ 10 件

export default defineEventHandler(async () => {
  // 件数集計 (並列実行)
  const [staffRows, sessionRows, diagnosisRows, latestProfileRows] = await Promise.all([
    db.select({ value: count() }).from(staff),
    db.select({ value: count() }).from(session),
    db.select({ value: count() }).from(diagnosis),
    db.select().from(topProfile).orderBy(desc(topProfile.version)).limit(1),
  ])

  // 直近 10 件のアクティビティ (3 テーブルから取って merge)
  const [recentSessions, recentProfiles, recentDiagnoses] = await Promise.all([
    db.select().from(session).orderBy(desc(session.createdAt)).limit(10),
    db.select().from(topProfile).orderBy(desc(topProfile.createdAt)).limit(10),
    db.select().from(diagnosis).orderBy(desc(diagnosis.createdAt)).limit(10),
  ])

  const activities: Array<{
    type: 'session' | 'profile' | 'diagnosis'
    id: string
    title: string
    createdAt: number
  }> = [
    ...recentSessions.map((s) => ({
      type: 'session' as const,
      id: s.id,
      title: `セッション (${s.kind})`,
      createdAt: s.createdAt,
    })),
    ...recentProfiles.map((p) => ({
      type: 'profile' as const,
      id: p.id,
      title: `「型」 v${p.version} 生成`,
      createdAt: p.createdAt,
    })),
    ...recentDiagnoses.map((d) => ({
      type: 'diagnosis' as const,
      id: d.id,
      title: '診断結果',
      createdAt: d.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)

  return {
    staffCount: staffRows[0]?.value ?? 0,
    sessionCount: sessionRows[0]?.value ?? 0,
    diagnosisCount: diagnosisRows[0]?.value ?? 0,
    latestProfileVersion: latestProfileRows[0]?.version ?? null,
    recentActivity: activities,
  }
})
