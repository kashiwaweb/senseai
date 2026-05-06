// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier が void 要素を自己閉じ形式 (<input />) に整形するため、
    // ESLint 側のこのルールは Prettier と競合する。整形は Prettier 任せの方針なので無効化。
    'vue/html-self-closing': 'off',
  },
})
