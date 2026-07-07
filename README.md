# 追客管理 (chaser_management)

見学したが入会に至らなかったお客様のステータス・追い連絡履歴を管理し、経過日数に応じた追客アラート（電話トークマニュアル／メールテンプレート表示、メール自動送信）を出す社内アプリです。

Supabase は `store_sales_manager` と同一プロジェクトを共有しています。認証（Supabase Auth）・`stores`・`user_store_permissions` は共通で、このアプリ用のテーブル（`customers` / `contact_logs` / `follow_up_scheme_steps` / `follow_up_task_completions` / `follow_up_templates` / `store_email_signatures` / `store_email_automation`）のみ追加しています。

## セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. `.env.local` は `store_sales_manager/.env.local` と同じ値（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`）を使用します（既にコピー済み）。

3. DBスキーマ（テーブル・トリガー・RLSポリシー）はリポジトリ内にSQLファイルとして持たず、変更のたびにチャットでSQLを受け取り、Supabase の SQL Editor で実行する運用にしています。追加したテーブルには RLS（Row Level Security）を設定済みで、`user_store_permissions` で許可された店舗のユーザーか管理者（`admin@kklia.com`）以外はSupabaseの匿名キー経由でも読み書きできません。管理者メールアドレスを変更・追加する場合は `lib/permissions.ts` の `ADMIN_EMAILS` と、DB側の `is_chaser_admin()` 関数の両方を更新してください（`stores` / `auth.users` / `user_store_permissions` はこのアプリからは変更しません）。

4. 開発サーバーを起動

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) を開くと `/login` にリダイレクトされます。`store_sales_manager` と同じ Supabase Auth ユーザー（例：管理者は `admin@kklia.com`）でログインできます。ログインするユーザーが一般ユーザーの場合、`user_store_permissions` に許可店舗が登録されている必要があります。

### メール自動送信のセットアップ（本番運用時のみ）

追客メールを毎日決まった時刻に自動送信する機能です。デフォルトでは無効（`store_email_automation.enabled = false`）なので、設定するまでは何も送信されません。

1. `.env.local` の以下を、Xサーバーのメールサーバー設定に合わせて入力してください。

   ```
   SMTP_HOST=（Xサーバーのメールサーバーホスト名。例: sv0000.xserver.jp）
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=hitoriwellness_kuki@kklia.com
   SMTP_PASSWORD=（このメールアドレスのパスワード）
   CRON_SECRET=（推測されにくい任意の文字列。Vercelの環境変数にも同じ値を設定）
   ```

2. Vercel にデプロイし、Vercel の環境変数にも上記と同じ値を設定してください。

3. 店舗ごとに設定した「送信時刻」ちょうどに送信するには、`/api/cron/send-followup-emails` を数分おきに呼び出す必要があります（`lib/emailAutomation.ts` は「設定時刻を過ぎていて本日まだ未送信」であれば送信し、それ以外は何もしないので、頻繁に呼んでも安全・二重送信しません）。Vercel の Cron Job は Hobby（無料）プランだと1日1回しか実行できないため、**無料の外部定期実行サービス**を使って高頻度に呼び出してください。

   例：[cron-job.org](https://cron-job.org)（無料）で以下のように設定
   - URL: `https://<デプロイ先のドメイン>/api/cron/send-followup-emails`
   - 実行間隔: 5〜10分おき
   - リクエストヘッダーに `Authorization: Bearer <CRON_SECRETの値>` を追加

   `vercel.json` の Cron Job（毎日1回・日本時間23:00）はこの外部サービスが止まった場合の**保険用フォールバック**として残しています（削除しても構いません）。

4. `/templates` ページ（管理者のみ編集可）で、店舗ごとに以下を設定します。
   - 自動送信の有効化
   - 送信時刻（日本時間）
   - 送信元メールアドレス（`SMTP_USER` と一致している必要があります）

5. 動作の仕組み：
   - 「メールのみ」のステップは、送信に成功すると自動で対応完了になります。
   - 「電話・メール」両方必要なステップは、メール送信は自動で行われますが対応自体は未完了のまま残ります（電話はスタッフが行い、手動でチェックしてください）。ダッシュボード・顧客詳細に「メール送信済み」と表示されるので、二重送信の心配はありません。
   - メール本文・件名に `{{name}}` と入力しておくと、送信時にお客様名へ自動で置き換わります。署名は `/templates` の「メール署名」で店舗ごとに設定した内容が本文末尾に自動で付加されます。
   - ダッシュボード・顧客詳細の「今すぐ送信」ボタンから、いつでも手動送信もできます。

## 主な機能

- ダッシュボード（`/`）：本日までに対応が必要な追客アラート一覧、ステータス別件数
- 顧客一覧（`/customers`）：ステータス・キーワード絞り込み
- 新規登録（`/customers/new`）
- 顧客詳細（`/customers/[id]`）：基本情報編集、再予約・入会チェック、追い連絡履歴、フォローアップタスク状況
- テンプレート管理（`/templates`）：ステータス・経過日数ごとの電話トークマニュアル・メールテンプレート、署名、メール自動送信設定を編集
- スキーム設定（`/schemes`、管理者のみ）：ステータスごとの追客タイミング・連絡方法（電話／メール）を登録・編集・削除

## 技術構成

- Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- `proxy.ts`（Next.js 16 の Middleware 相当）でセッションリフレッシュと未ログインリダイレクトを行う
- `nodemailer` + Vercel Cron によるメール自動送信（`lib/emailAutomation.ts` / `app/api/cron/send-followup-emails`）
