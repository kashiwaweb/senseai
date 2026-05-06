// 共有パスワード認証 (PoC)。
// AUTH_PASSWORD と一致したらセッションを発行する。
// セッション実体は暗号化クッキー（nuxt-auth-utils が AUTH_SESSION_SECRET で AES 暗号化）。
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<{ password?: string }>(event)

  if (!config.authPassword) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AUTH_PASSWORD が未設定です',
    })
  }

  if (typeof body?.password !== 'string' || body.password.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'パスワードが必要です' })
  }

  if (body.password !== config.authPassword) {
    // 共有パスワード方式なので識別情報なし。簡素なメッセージのみ。
    throw createError({ statusCode: 401, statusMessage: 'パスワードが違います' })
  }

  await setUserSession(event, {
    user: { role: 'salon' as const },
  })

  return { ok: true }
})
