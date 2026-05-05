// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@nuxt/fonts'],

  typescript: {
    strict: true,
    typeCheck: false, // CIでの型チェックは後で導入（vue-tsc 必要）
  },

  eslint: {
    config: {
      stylistic: false, // 整形は Prettier に任せ、ESLint は品質チェックのみに専念
    },
  },
})
