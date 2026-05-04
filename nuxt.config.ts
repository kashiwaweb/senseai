// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: false, // CIでの型チェックは後で導入（vue-tsc 必要）
  },

  modules: ['@nuxt/eslint'],
})