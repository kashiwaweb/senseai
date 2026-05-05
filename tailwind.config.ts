import type { Config } from 'tailwindcss'

export default {
  // content は @nuxtjs/tailwindcss が Nuxt の各ディレクトリを自動登録するため、ここでは空で OK
  content: [],
  theme: {
    extend: {
      colors: {
        // ベージュ系（背景・優しい区切り）
        cream: {
          50: '#FDFAF4',
          100: '#FAF4E8',
          200: '#F5EBD6',
          300: '#EDDDB6',
          400: '#E0C68C',
        },
        // 淡いゴールド系（ブランド色・CTA・アクセント）
        gold: {
          50: '#FCF8EA',
          100: '#F7ECC2',
          200: '#EFD896',
          300: '#E4C064',
          400: '#D4A93C', // 主役のブランド色
          500: '#B8902C',
          600: '#93701F',
          700: '#705515',
          800: '#4F3B0E',
          900: '#332608',
        },
        // 暖色系のグレー（本文・補助テキスト）
        ink: {
          50: '#FAF8F5',
          100: '#EFEBE3',
          200: '#D9D2C2',
          300: '#C0B6A0',
          400: '#A39780',
          500: '#867962',
          600: '#6B5F4D',
          700: '#544A3C',
          800: '#3D352B',
          900: '#2A241D', // 本文の標準色
        },
      },
      fontFamily: {
        // Tailwind の `font-sans` のデフォルトを Noto Sans JP に差し替え
        // @nuxt/fonts がこの設定を検知して自動で配信
        sans: ['"Noto Sans JP"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
