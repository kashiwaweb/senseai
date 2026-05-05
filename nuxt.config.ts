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

  // 環境変数 → サーバーランタイム設定への配線
  // useRuntimeConfig() でアクセス可能。`public` 配下のみクライアントから参照可。
  // 詳細は docs/architecture.md §7 / .env.example を参照。
  runtimeConfig: {
    // 認証
    authPassword: process.env.AUTH_PASSWORD,
    authSessionSecret: process.env.AUTH_SESSION_SECRET,

    // LLM
    llmProvider: process.env.LLM_PROVIDER ?? 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // 文字起こし
    groqApiKey: process.env.GROQ_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,

    // DB (Turso libSQL)
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,

    // ストレージ (Cloudflare R2)
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2Bucket: process.env.R2_BUCKET,

    public: {
      // クライアントに公開する値があればここに（現状なし）
    },
  },
})
