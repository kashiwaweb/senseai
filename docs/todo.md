# senseai ToDo リスト

最終更新: 2026-05-03
出典: `requirements.md` / `architecture.md` / `ai-design.md` / `screens.md`（仕様書を正とする）

仕様書の 8 週間ロードマップに沿って、画面・API・横断課題に分解した実装タスク一覧。
着手時はチェックボックスを更新し、随時改定する。

---

## Month 1: スーパースタッフのAI（型を作る）

### W1: プロジェクト初期化／プロンプト設計実験

ゴール: Nuxt 骨組み + 手動テキスト入力で AI が 7 ステップ分析する最小動作（W1-14 で達成）。

- [x] **W1-01: Nuxt 3 プロジェクト初期化（TypeScript）**

  `npx nuxi init` で Nuxt 3 プロジェクト作成。TypeScript strict 設定、ESLint/Prettier、Node バージョン固定（package.json `engines`）。`/` `/login` のダミーページが起動するところまで。

- [x] **W1-02: Tailwind CSS 導入 + デザイントークン整備**

  Tailwind 導入、Noto Sans JP 読み込み、ベージュ／淡いゴールド基調のカラーパレットを `tailwind.config.ts` に定義。共通レイアウト（ヘッダー・サイドナビ）のスケルトン作成。

- [x] **W1-03: ディレクトリ構成・コーディング規約決定**

  `pages/` `components/` `composables/` `server/api/` `server/lib/` `server/lib/prompts/` `server/db/` `shared/schemas/` などの構成を確定。命名規則・import エイリアス（`~/`, `#shared`）を README に明記。

- [x] **W1-04: 環境変数テンプレート（.env.example）作成**

  architecture.md §7 の全環境変数を `.env.example` に列挙：`AUTH_PASSWORD` / `AUTH_SESSION_SECRET` / `GROQ_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `LLM_PROVIDER` / `TURSO_*` / `R2_*`。`runtimeConfig` への配線も含む。

- [x] **W1-05: Turso (libSQL) + Drizzle ORM セットアップ**

  Turso 無料枠で DB を作成、`@libsql/client` + `drizzle-orm` を導入。ローカルは SQLite ファイル、本番は Turso URL に切替できる接続レイヤを `server/db/client.ts` に実装。

- [ ] **W1-06: データモデルのスキーマ定義（5テーブル）**

  architecture.md §5 に従い Drizzle で Salon / Staff / Session / TopProfile / Diagnosis を定義。FK・インデックス（staff.salon_id、session.staff_id、diagnosis.session_id）も設定。`drizzle-kit generate` でマイグレーション生成。

- [ ] **W1-07: マイグレーション実行・初期データ投入スクリプト**

  マイグレーション実行コマンドを `package.json` script 化。PoC 用の単一 Salon と最低限の seed（管理用 Salon レコード）を投入する `scripts/seed.ts` を作成。

- [ ] **W1-08: 共有パスワード認証（nuxt-auth-utils）実装**

  `nuxt-auth-utils` を導入し、`POST /api/auth/login`（AUTH_PASSWORD と一致でセッション発行）/ `POST /api/auth/logout` を実装。サーバーミドルウェアで `/login` 以外は未認証アクセスを弾く。

- [ ] **W1-09: ログイン画面 `/login` 実装**

  screens.md §3.1 の通り、パスワード入力 1 個 + ログインボタン。失敗時は「パスワードが違います」のみ。成功で `/` へリダイレクト。

- [ ] **W1-10: ダッシュボード骨格 `/` 実装**

  サマリカード4つ（スタッフ数 / セッション数 / 「型」バージョン / 診断回数）と CTA ボタン3つを配置。データはまずダミーで OK、API は後続タスクで配線。

- [ ] **W1-11: LLM プロバイダー抽象化レイヤ実装**

  `server/lib/llm.ts` に `LLMProvider` interface を定義し、Gemini 2.5 Flash 実装と Claude（Haiku/Sonnet）実装を作成。`LLM_PROVIDER` 環境変数で切替。`complete({system, user, schema})` が Zod 検証付きで JSON を返す。

- [ ] **W1-12: TopProfile / Diagnosis の Zod スキーマ定義**

  ai-design.md §4.3 / §5.3 のスキーマを `shared/schemas/topProfile.ts` / `diagnosis.ts` に Zod で実装。LLM 出力検証と TS 型推論の両方に使用。

- [ ] **W1-13: フェーズ①プロンプト v1 + バージョン管理機構**

  `server/lib/prompts/phase1_v1.ts` にプロンプト本体・バージョン文字列・JSON Schema 注入処理を実装。プロンプト出力時に `prompt_version` を返し、TopProfile レコードに記録できるようにする。

- [ ] **W1-14: 手動テキスト投入で 7 ステップ分析が動く最小 E2E**

  テキスト直接入力を受け取り、フェーズ①プロンプトで Gemini を叩いて TopProfile JSON を返す `POST /api/profiles/generate` の最小版。UI からは「型を生成」ボタンで叩ければ OK。**W1 のゴール**。

### W2: 音声アップロード→Whisper文字起こし

ゴール: mp3/m4a をアップして自動で会話テキスト化。

- [ ] **W2-01: Cloudflare R2 セットアップ + S3 互換 SDK 統合**

  R2 バケット作成、`R2_*` 環境変数を設定。`@aws-sdk/client-s3` で署名付き URL 生成・PUT/GET 用のラッパを `server/lib/r2.ts` に実装。

- [ ] **W2-02: 音声アップロード API（署名付き URL 方式）**

  `POST /api/sessions/upload-url`（署名付き URL を返す）+ ブラウザから R2 へ直接 PUT する方式を採用し Vercel の body サイズ制限を回避。完了通知で `audio_key` を確定。

- [ ] **W2-03: Groq Whisper（Large-v3-Turbo）統合**

  `server/lib/transcribe.ts` に Groq SDK ラッパを実装。R2 から音声を取得して Whisper に渡し、`transcript` と `duration_sec` を返す。25MB / 30 分制約はバリデーションでエラーを返す（チャンク分割は将来）。

- [ ] **W2-04: セッション保存 API `POST /api/sessions/upload`**

  音声モード（audio_key 受け取り→Groq Whisper→DB保存）／テキストモード（transcript を直接受け取り保存）の 2 モード対応。`kind` バリデーション（super のみ instruction/philosophy 可）も含む。

- [ ] **W2-05: `/upload` 画面（音声/テキスト 2 モード切替）**

  スタッフ選択プルダウン、種別ラジオ、入力モードタブ（音声 / テキスト）。音声側は drag&drop + 進捗バー + 文字起こし完了プレビュー（編集可）。テキスト側はテキストエリア + 録音日/時間任意入力。

- [ ] **W2-06: スタッフ管理 API（一覧・追加・編集）**

  `GET /api/staff` `POST /api/staff` `PATCH /api/staff/:id` を実装。role は `super` / `trainee` のみ。Zod でバリデーション。

- [ ] **W2-07: `/staff` 一覧 + 追加モーダル**

  テーブル（名前 / 役割バッジ super=金 trainee=青 / セッション数 / 最終診断日）+「+ スタッフ追加」モーダル（名前・役割選択）。

- [ ] **W2-08: `/staff/:id` 詳細**

  プロフィール編集 + セッション一覧 + (trainee の場合) 診断履歴ミニチャート（Chart.js は W7 で導入なので W2 段階ではプレースホルダで可）。

- [ ] **W2-09: `/sessions` 一覧（フィルタ付）**

  フィルタ（スタッフ / 種別 / 期間）+ テーブル（録音日 / スタッフ / 種別 / 長さ / 文字起こし冒頭 / 詳細・削除）。`GET /api/sessions` クエリパラメータも実装。

- [ ] **W2-10: `/sessions/:id` 詳細**

  音声プレイヤー（R2 署名付き URL）+ 文字起こし全文（編集モード切替）+ trainee なら「診断する」ボタン（W6 で配線）。`GET /api/sessions/:id` も実装。

### W3: 複数セッションから「型」抽出ロジック

ゴール: 5〜10 セッションを統合し型 JSON を生成。

- [ ] **W3-01: 「型」生成 API の本実装（複数セッション統合）**

  `POST /api/profiles/generate` に元セッション ID 群を渡し、customer / instruction / philosophy をタグ付きで結合してプロンプトに投入。version は salon 内で +1。`source_session_ids` `llm_model` `prompt_version` を保存。

- [ ] **W3-02: スキーマ違反時の自動リトライ + raw 保存**

  Zod 検証 NG → 1 度自動リトライ → それでも NG なら raw を別カラム/ファイルに保存し、UI に「再生成」ボタンを出す。ai-design.md §6 のフォールバック表に準拠。

- [ ] **W3-03: LLM タイムアウト・長時間処理のハンドリング**

  30 秒タイムアウトで UI に「分析中…」継続表示、生成ジョブ状態を DB に持たせるか同期 30〜60 秒受容で割り切るか方針決定の上で実装。Vercel の関数タイムアウト（無料枠 10 秒/Pro 60 秒）を踏まえ Edge ではなく Node ランタイムで動かす。

- [ ] **W3-04: プロンプト改善ループの運用ルール整備**

  `server/lib/prompts/` にバージョン別ファイルを残す運用、TopProfile レコードに `prompt_version` を必ず保存、改善履歴を `docs/prompt-changelog.md` に追記する流儀を定める。

### W4: スーパースタッフ「型」表示UI / PoC現場で初テスト

ゴール: 公開・サロン側のフィードバック収集。

- [ ] **W4-01: `/profiles` 一覧（バージョンカード）**

  v1, v2... のカード一覧（生成日 / 元セッション数 / モデル名 / 詳細ボタン）+「+ 新規生成」モーダル（元にするセッション複数選択 → 生成）。`GET /api/profiles` `GET /api/profiles/latest` を配線。

- [ ] **W4-02: `/profiles/:id` 詳細（7ステップアコーディオン）**

  ヘッダー（バージョン・生成日・元セッション一覧・モデル・プロンプトバージョン）/ overview・core_values・tone / 7 ステップアコーディオン（description / key_behaviors / magic_words テーブル / common_pitfalls）/ 再生成ボタン。

- [ ] **W4-03: PoC 現場テスト準備（実音声 5〜10 セッション投入）**

  スーパースタッフの実音声を最低 5 件投入し、型を生成。オーナーレビュー用の閲覧手順書をかんたんに用意。フィードバック記録用に `docs/poc-feedback.md` を新設。

- [ ] **W4-04: 1ヶ月目フィードバック反映 → プロンプト v2**

  オーナー所感を踏まえプロンプトを v2 に改訂。トーンが冷たい等あれば Claude Haiku 4.5 への切替を検討（ai-design.md §2 の切替判断基準に従う）。

---

## Month 2: 一般スタッフ診断

### W5: 一般スタッフ用アップロード画面・複数スタッフ管理

- [ ] **W5-01: 一般スタッフ管理の UI 拡充**

  `/staff` で trainee 行に「診断履歴」リンク、`/upload` のスタッフ選択で trainee と super の表示を区別、`/upload` で trainee 選択時は kind=customer のみに自動制約。

- [ ] **W5-02: 複数スタッフ・大量セッションの UX 整備**

  セッション一覧のページネーション・並び替え。スタッフ詳細での録音履歴の見やすさ調整。アップロード後 `/sessions/:id` への遷移と「診断する」CTA 強調。

### W6: 比較ロジック（型 vs 一般スタッフ会話）

- [ ] **W6-01: フェーズ②プロンプト v1 + Zod 検証**

  `server/lib/prompts/phase2_v1.ts` を作成。役割「若手スタッフを優しく導く先輩トレーナー」、否定語禁止ルール、`top_would_say` は最新 TopProfile の magic_words から優先引用、結びは励まし、を厳守させる。Zod スキーマで検証。

- [ ] **W6-02: 診断生成 API `POST /api/diagnoses/generate`**

  入力: trainee の session_id。最新 TopProfile を取得し、フェーズ②プロンプトで Gemini を叩いて Diagnosis JSON を生成・保存。失敗時は W3-02 のリトライ機構を共通化して使用。

- [ ] **W6-03: スコア基準の整合性検証**

  サンプル trainee セッションで生成し、score 1〜5 のラベル運用（ai-design.md §5.4）が破綻していないか確認。1〜2 が「未習得」表現になっていないかを Zod 後処理で軽くチェックする補助関数を入れる検討。

### W7: 診断結果UI

- [ ] **W7-01: Chart.js / vue-chartjs 導入とレーダーチャート**

  `vue-chartjs` を導入し、7 軸レーダーチャート（軸=ステップ名、値=スコア 1〜5）コンポーネントを作成。アクセシビリティ用に値テーブルも併記。

- [ ] **W7-02: `/diagnoses` 一覧**

  フィルタ（スタッフ / 期間）+ テーブル（診断日 / スタッフ / セッション / 平均スコア / 詳細）。

- [ ] **W7-03: `/diagnoses/:id` 詳細**

  overall_summary + encouragement_message（大きめ）+ レーダーチャート + ステップカード並び（スコアバッジ・strengths・growth_areas・improvement_examples）+ 印刷可能ビュー（@media print 整形）。

- [ ] **W7-04: `/sessions/:id` から「診断する」ボタン配線**

  trainee の session 詳細から `POST /api/diagnoses/generate` を叩き、完了後 `/diagnoses/:id` へ自動遷移。生成中ローディング UI を出す。

### W8: PoC サロンで本番運用テスト・調整・公開

- [ ] **W8-01: Vercel デプロイ + 環境変数登録**

  GitHub 連携、Production 環境変数（Turso / R2 / Groq / Gemini / 認証）登録、Preview 環境はオプション。Node ランタイム指定の確認、関数タイムアウト設定。

- [ ] **W8-02: 本番 Turso DB 移行と動作確認**

  本番 Turso にマイグレーション適用、Salon 1 件 seed、ログイン〜アップロード〜型生成〜診断までスモークテスト。

- [ ] **W8-03: PoC 本番運用テスト・調整**

  サロンで実運用、KPI（オーナー評価・スタッフ評価）を `docs/poc-feedback.md` に集約。プロンプト微調整・UI 微調整を反映して公開バージョン確定。

---

## 横断（週またぎで継続）

- [ ] **横断-01: `/settings` 画面**

  店舗名表示・編集 / LLM プロバイダー切替（gemini / claude）/ パスワード変更（AUTH_PASSWORD は env なので PoC では UI から「変更案内」のみで可）/ データエクスポート（将来）。screens.md §3.12 準拠。

- [ ] **横断-02: 固有名詞マスキング（W2 以降）**

  文字起こし後に正規表現＋LLM で 顧客名・電話番号・住所を `[氏名]` 等にマスク。LLM へはマスク後テキストのみ送信。実装は W2 後半〜W3 にかけて。

- [ ] **横断-03: エラーハンドリングとユーザー通知**

  音声短すぎ・空文字起こし時の診断スキップ・音声品質確認誘導 / magic_words 0 件時の警告 / Groq 障害時のテキストモード案内 を統一的にトースト通知できる仕組みを作る。

- [ ] **横断-04: HTTPS 強制・最低限のセキュリティ設定**

  Vercel 側で HTTPS 強制、CSP/Referrer-Policy/X-Content-Type-Options のヘッダ設定、認証 Cookie の SameSite=Lax / HttpOnly / Secure 確認、R2 は署名付き URL のみで配信。

- [ ] **横断-05: README とランブック整備**

  セットアップ・起動・本番デプロイ手順、環境変数表、よくあるトラブル（Groq 無料枠超過時の対応 = テキストモード案内 / whisper.cpp フォールバック）を README にまとめる。

- [ ] **横断-06: 仕様の未決事項のオーナー確認**

  ai-design.md §10 のオープンクエスチョン（型生成の最低セッション数 / 過去診断との成長比較 / 話者分離の要否 / 1セッション最大文字数）をオーナーに確認し、決まったら ai-design.md に反映。

---

## 進め方メモ

- **着手順**: W1-01 → W1-04 → W1-05〜07（DB） → W1-08〜10（認証・骨格） → W1-11〜14（LLM 最小 E2E）。Tailwind/共通レイアウト（W1-02〜03）は並行で。
- **W1 ゴールの最短化**: W1-14 を早く通したい場合、DB は Salon/Session のみ最小定義で先送り → 「型生成」レスポンスを画面に即表示 → その後で永続化、の順でも可。
- **プロンプト改善ループ**: W1 でも「v1」を切ること。版管理しないと W4 の改善が記録できなくなる。
- **オーナー確認事項**（着手前に潰したい）:
  - 型生成の最低セッション数（3? 5? 10?）
  - スコア基準の解釈
  - 話者分離の要否（顧客発話とスタッフ発話の区別）
  - 1 セッション最大文字数の運用ルール
