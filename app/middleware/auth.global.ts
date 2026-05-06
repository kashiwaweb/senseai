// 未認証時は /login へリダイレクトするグローバルルートミドルウェア。
// 認証状態は nuxt-auth-utils の useUserSession() composable から取得。
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
