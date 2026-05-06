// API ルートを認証必須にするサーバーミドルウェア。
// 例外: 認証関連エンドポイント / ページレンダリング。
export default defineEventHandler(async (event) => {
  const path = event.path

  // ページレンダリング・静的アセットはスルー（クライアント側ミドルウェアで担当）
  if (!path.startsWith('/api/')) return

  // 認証関連エンドポイントはスルー
  // - /api/auth/login, /api/auth/logout : 自前実装
  // - /api/_auth/session : nuxt-auth-utils 内蔵（クライアントのセッション同期用）
  if (path.startsWith('/api/auth/') || path.startsWith('/api/_auth/')) return

  await requireUserSession(event)
})
