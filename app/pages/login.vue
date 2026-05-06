<script setup lang="ts">
definePageMeta({
  layout: false,
})

const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

const { fetch: refreshSession } = useUserSession()

async function login() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })
    // クッキーは付いたが、クライアント側の useUserSession キャッシュはまだ未ログイン状態。
    // navigateTo('/') の前にセッションを取り直さないと auth.global ミドルウェアが
    // loggedIn=false と誤判定し、/login に跳ね返されることがある。
    await refreshSession()
    await navigateTo('/')
  } catch {
    // 仕様 (screens.md §3.1): エラー時は「パスワードが違います」のみ表示
    error.value = 'パスワードが違います'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gold-600">senseai</h1>
        <p class="mt-1 text-sm text-ink-500">トップの感覚を、全員の技術に。</p>
      </div>
      <form
        class="rounded-lg bg-white border border-cream-200 p-6 shadow-sm space-y-4"
        @submit.prevent="login"
      >
        <h2 class="text-lg font-semibold text-ink-900">ログイン</h2>
        <div>
          <label for="password" class="block text-sm text-ink-700 mb-1">パスワード</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            :disabled="loading"
            class="w-full rounded-md border border-cream-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>
        <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-md bg-gold-500 hover:bg-gold-600 text-white py-2 font-semibold transition-colors disabled:opacity-50"
        >
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>
      </form>
    </div>
  </div>
</template>
