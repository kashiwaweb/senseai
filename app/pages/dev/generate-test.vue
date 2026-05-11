<script setup lang="ts">
// W1-14: テキスト直接入力で「型」生成を確認する開発用画面。
// 本番 UI (/profiles) は W4-01 / W4-02 で実装する。

definePageMeta({
  layout: false,
})

// 架空のエステサロン接客文字起こし (ダミーデータ)。
// 実音声からの文字起こしが揃うまでの動作確認用。
const DUMMY_CUSTOMER = `スタッフ: いらっしゃいませ、佐藤様。お待ちしておりました。今日は雨の中ありがとうございます、お足元濡れていませんか?

佐藤様: いえ、大丈夫です。すみません、ちょっと遅くなって…

スタッフ: とんでもないです、十分お時間ありますので、ゆっくり深呼吸してくださいね。お荷物とコート、こちらでお預かりしますね。

(中略)

スタッフ: 普段、お肌のお手入れはどんな感じでされていますか?

佐藤様: えーと、化粧水と乳液くらいで、特別なことは…

スタッフ: 朝も夜もですか? お忙しいのに毎日続けてらっしゃるの、すごいですよ。最近、何か気になることはあります? 例えば、夕方になると肌が乾燥するとか、メイクのノリが気になるとか…

佐藤様: あ、それあります。最近頬のあたりがカサつくというか…

スタッフ: それは気になりますよね、わかります。鏡を見るたびに気になっちゃいますよね。実はそれ、季節の変わり目に多い症状で、私もこの時期同じ悩みでした。`

const DUMMY_INSTRUCTION = `今日の接客見てたんだけどね、佐藤様の「最近頬のあたりがカサつく」って言葉、聞いた? あれ、お客様が悩みを最初に開いてくれた瞬間なの。

ああいう時、すぐに「化粧水のオススメは…」って商品の話に行きがちなんだけど、それやっちゃダメ。

まず「それは気になりますよね、わかります」って一回受け止める。お客様が「あ、この人わかってくれる」って思える 3 秒間が、その後の信頼を全部決めるの。

商品の話は、その後で十分。順番を間違えないでね。`

const DUMMY_PHILOSOPHY = `朝のミーティングでお伝えしたいこと、一つだけ。

私たちのサロンに来てくださるお客様の 1 時間は、その方にとって特別な時間なんです。家のことも仕事のことも一旦置いて、自分のためだけに使ってくださっている時間。

だからね、技術が上手いとか、商品の説明がうまいとか、もちろん大事だけど、その前に「この時間を大切にしてくれている」って感じてもらうことが一番大事。

第一声、表情、お辞儀の角度、コートの預かり方、全部その想いの表れなの。技術は教えられるけど、想いは教えられない。だから、想いを「行動」に変えるところを、しっかり丁寧に積み重ねてほしいです。`

const customer = ref(DUMMY_CUSTOMER)
const instruction = ref(DUMMY_INSTRUCTION)
const philosophy = ref(DUMMY_PHILOSOPHY)

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<unknown>(null)

async function generate() {
  loading.value = true
  error.value = null
  result.value = null
  try {
    result.value = await $fetch('/api/profiles/generate', {
      method: 'POST',
      body: {
        customer: customer.value,
        instruction: instruction.value,
        philosophy: philosophy.value,
      },
    })
  } catch (e: unknown) {
    const message =
      e && typeof e === 'object' && 'statusMessage' in e
        ? String((e as { statusMessage: unknown }).statusMessage)
        : e instanceof Error
          ? e.message
          : '不明なエラー'
    error.value = message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-cream-50">
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 class="text-2xl font-bold text-gold-600">W1-14: 型生成テスト</h1>
        <p class="mt-1 text-sm text-ink-500">
          3 種類のテキストを投入して LLM で「型」を生成する E2E 確認画面 (W1 ゴール)。 UI
          は最小版、本番は W4 で実装。
        </p>
      </header>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-ink-700 mb-1">
            customer (顧客接客の書き起こし)
          </label>
          <textarea
            v-model="customer"
            rows="10"
            class="w-full p-2 border border-cream-300 rounded font-mono text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-ink-700 mb-1">
            instruction (スタッフ指導の書き起こし)
          </label>
          <textarea
            v-model="instruction"
            rows="6"
            class="w-full p-2 border border-cream-300 rounded font-mono text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold text-ink-700 mb-1">
            philosophy (心掛け・接客哲学スピーチ)
          </label>
          <textarea
            v-model="philosophy"
            rows="6"
            class="w-full p-2 border border-cream-300 rounded font-mono text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        :disabled="loading"
        class="px-6 py-2 rounded-md bg-gold-500 hover:bg-gold-600 text-white font-semibold transition-colors disabled:opacity-50"
        @click="generate"
      >
        {{ loading ? '分析中... (30〜60 秒)' : '型を生成' }}
      </button>

      <p v-if="error" class="text-sm text-red-700 whitespace-pre-wrap">エラー: {{ error }}</p>

      <pre
        v-if="result"
        class="text-xs bg-white border border-cream-200 p-4 rounded overflow-auto max-h-[600px]"
        >{{ JSON.stringify(result, null, 2) }}</pre
      >
    </div>
  </div>
</template>
