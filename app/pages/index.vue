<script setup lang="ts">
// W1-10: ダッシュボード (`/`)
// - サマリカード 4 つ (スタッフ数 / セッション数 / 「型」バージョン / 診断回数)
// - 最近のアクティビティ (直近 10 件)
// - CTA ボタン 3 つ (アップロード / 型を見る / 診断結果を見る)

const { data: summary, refresh } = await useFetch('/api/dashboard/summary')

const activityTypeLabel: Record<'session' | 'profile' | 'diagnosis', string> = {
  session: 'セッション',
  profile: '「型」',
  diagnosis: '診断',
}

function formatDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-ink-900">ダッシュボード</h1>
        <p class="mt-1 text-sm text-ink-600">PoC サロンの全体状況</p>
      </div>
      <button
        type="button"
        class="text-sm text-ink-500 hover:text-ink-700 transition-colors"
        @click="refresh()"
      >
        更新
      </button>
    </header>

    <!-- サマリカード -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-lg bg-white border border-cream-200 p-4 shadow-sm">
        <div class="text-xs text-ink-500">スタッフ数</div>
        <div class="mt-1 text-2xl font-bold text-gold-600">
          {{ summary?.staffCount ?? '—' }}
        </div>
      </div>
      <div class="rounded-lg bg-white border border-cream-200 p-4 shadow-sm">
        <div class="text-xs text-ink-500">セッション数</div>
        <div class="mt-1 text-2xl font-bold text-gold-600">
          {{ summary?.sessionCount ?? '—' }}
        </div>
      </div>
      <div class="rounded-lg bg-white border border-cream-200 p-4 shadow-sm">
        <div class="text-xs text-ink-500">「型」バージョン</div>
        <div class="mt-1 text-2xl font-bold text-gold-600">
          {{ summary?.latestProfileVersion ? `v${summary.latestProfileVersion}` : '未生成' }}
        </div>
      </div>
      <div class="rounded-lg bg-white border border-cream-200 p-4 shadow-sm">
        <div class="text-xs text-ink-500">診断回数</div>
        <div class="mt-1 text-2xl font-bold text-gold-600">
          {{ summary?.diagnosisCount ?? '—' }}
        </div>
      </div>
    </section>

    <!-- CTA ボタン -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <NuxtLink
        to="/upload"
        class="rounded-lg bg-gold-500 hover:bg-gold-600 text-white px-6 py-4 font-semibold text-center transition-colors"
      >
        アップロード
      </NuxtLink>
      <NuxtLink
        to="/profiles"
        class="rounded-lg bg-white hover:bg-cream-100 border border-cream-300 text-ink-800 px-6 py-4 font-semibold text-center transition-colors"
      >
        「型」を見る
      </NuxtLink>
      <NuxtLink
        to="/diagnoses"
        class="rounded-lg bg-white hover:bg-cream-100 border border-cream-300 text-ink-800 px-6 py-4 font-semibold text-center transition-colors"
      >
        診断結果を見る
      </NuxtLink>
    </section>

    <!-- 最近のアクティビティ -->
    <section>
      <h2 class="text-lg font-semibold text-ink-900 mb-3">最近のアクティビティ</h2>
      <div class="bg-white rounded-lg border border-cream-200 overflow-hidden">
        <p v-if="!summary?.recentActivity?.length" class="p-4 text-sm text-ink-500 text-center">
          まだアクティビティがありません
        </p>
        <ul v-else class="divide-y divide-cream-200">
          <li
            v-for="item in summary.recentActivity"
            :key="item.id"
            class="p-3 flex justify-between items-center"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="inline-block w-16 text-xs font-semibold px-2 py-0.5 rounded text-center"
                :class="{
                  'bg-cream-200 text-ink-700': item.type === 'session',
                  'bg-gold-100 text-gold-800': item.type === 'profile',
                  'bg-blue-100 text-blue-800': item.type === 'diagnosis',
                }"
              >
                {{ activityTypeLabel[item.type] }}
              </span>
              <span class="text-sm text-ink-900 truncate">{{ item.title }}</span>
            </div>
            <time class="text-xs text-ink-500 flex-shrink-0 ml-3">
              {{ formatDate(item.createdAt) }}
            </time>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
