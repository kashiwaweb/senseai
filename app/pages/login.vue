<script setup lang="ts">
definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gold-600">senseai</h1>
        <p class="mt-1 text-sm text-ink-500">トップの感覚を、全員の技術に。</p>
      </div>
      <div class="rounded-lg bg-white border border-cream-200 p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-ink-900">ログイン</h2>
        <p class="mt-2 text-sm text-ink-600">パスワード入力欄（ダミー / W1-09 で本実装）</p>
        <NuxtLink to="/" class="mt-4 inline-block text-sm text-gold-600 hover:underline">
          ← ダッシュボードへ
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
