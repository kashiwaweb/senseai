<script setup lang="ts">
const navItems = [
  { to: '/', label: 'ダッシュボード', exact: true },
  { to: '/staff', label: 'スタッフ' },
  { to: '/upload', label: 'アップロード' },
  { to: '/sessions', label: 'セッション' },
  { to: '/profiles', label: '「型」' },
  { to: '/diagnoses', label: '診断結果' },
  { to: '/settings', label: '設定' },
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header
      class="bg-white/80 backdrop-blur border-b border-cream-200 px-6 py-4 flex items-center justify-between"
    >
      <NuxtLink to="/" class="flex items-baseline gap-3">
        <span class="text-xl font-bold text-gold-600">senseai</span>
        <span class="text-xs text-ink-500 hidden sm:inline"> トップの感覚を、全員の技術に。 </span>
      </NuxtLink>
      <div class="text-sm text-ink-500">
        <!-- W1-08 でログアウトボタン -->
      </div>
    </header>

    <div class="flex flex-1">
      <nav class="w-56 bg-cream-100/50 border-r border-cream-200 p-4 hidden md:block">
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="block px-3 py-2 rounded-md text-ink-700 hover:bg-cream-200 hover:text-ink-900 transition-colors"
              :active-class="item.exact ? '' : 'bg-gold-100 text-gold-800 font-semibold'"
              :exact-active-class="item.exact ? 'bg-gold-100 text-gold-800 font-semibold' : ''"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <main class="flex-1 p-6 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
