# Clerk Webhook設定ガイド

このガイドでは、ClerkのWebhookを設定してSupabaseと連動させる方法を説明します。

## 1. Supabase Service Role Keyの取得

1. [Supabaseダッシュボード](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. 左サイドバー → `Settings` → `API`
4. `service_role` キーをコピー（⚠️ このキーは秘密にしてください）

## 2. Clerk Webhookの設定

### 2.1 Webhookエンドポイントの作成

1. [Clerk Dashboard](https://dashboard.clerk.com)にアクセス
2. プロジェクトを選択
3. 左サイドバー → `Webhooks`
4. `Add Endpoint`ボタンをクリック

### 2.2 エンドポイントの設定

- **Endpoint URL**: 
  - 開発環境: `https://your-domain.ngrok.io/api/webhooks/clerk`（ngrokなどのトンネルサービスを使用）
  - 本番環境: `https://yourdomain.com/api/webhooks/clerk`

- **Subscribe to events**（以下のイベントを選択）:
  - ✅ `user.deleted` - ユーザー削除時
  - ✅ `user.updated` - ユーザー情報更新時（メールアドレス変更を含む）

### 2.3 Webhook Secretの取得

1. エンドポイントを作成後、`Signing Secret`が表示されます
2. このシークレット（`whsec_...`で始まる文字列）をコピー

## 3. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Clerk Webhook Secret（Clerkダッシュボードから取得）
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Supabase Service Role Key（Supabaseダッシュボードから取得）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```

⚠️ **重要**: `.env.local`をGitにコミットしないでください！

## 4. 開発環境でのテスト（ngrokを使用）

開発環境でWebhookをテストするには、ローカルサーバーを外部に公開する必要があります。

### 4.1 ngrokのインストール

```bash
# Homebrewでインストール（macOS）
brew install ngrok

# または公式サイトからダウンロード
# https://ngrok.com/download
```

### 4.2 ngrokの起動

```bash
# 別のターミナルウィンドウで実行
ngrok http 3000
```

### 4.3 Forwarding URLをコピー

ngrokが表示する`Forwarding`のURLをコピーし、ClerkのWebhook設定に使用：

```
Forwarding: https://abcd-1234.ngrok.io -> http://localhost:3000
```

Clerk Webhookエンドポイント: `https://abcd-1234.ngrok.io/api/webhooks/clerk`

## 5. 動作確認

### 5.1 メールアドレス変更のテスト

1. Clerkのユーザープロファイルページでメールアドレスを変更
2. Webhookが発火し、Supabaseの`profiles`テーブルが更新されることを確認

### 5.2 アカウント削除のテスト

1. Clerkのダッシュボードまたはアプリからユーザーを削除
2. Webhookが発火し、Supabaseの以下が削除されることを確認：
   - `memos`テーブルの該当ユーザーのデータ
   - `profiles`テーブルの該当ユーザーのデータ

### 5.3 ログの確認

開発サーバーのコンソールログを確認：

```bash
npm run dev
```

Webhookが正常に動作すると、以下のようなログが表示されます：

```
User updated: user_xxxxx, new email: newemail@example.com
Successfully updated email for user: user_xxxxx
```

または

```
User deleted: user_xxxxx
Successfully deleted data for user: user_xxxxx
```

## 6. トラブルシューティング

### Webhook検証エラー

```
Error: Webhook verification failed
```

**原因**: `CLERK_WEBHOOK_SECRET`が正しく設定されていない

**解決策**: 
- `.env.local`のシークレットが正しいか確認
- サーバーを再起動

### Supabase更新エラー

```
Error deleting profile: {...}
```

**原因**: `SUPABASE_SERVICE_ROLE_KEY`が正しく設定されていない、またはRLSポリシーの問題

**解決策**:
- Service Role Keyを再確認
- Supabaseのテーブル権限を確認

### ngrokのタイムアウト

無料版のngrokは8時間でセッションが切れます。再起動すると新しいURLが生成されるため、ClerkのWebhook設定を更新する必要があります。

## 7. 本番環境へのデプロイ

本番環境では、ngrokは不要です：

1. Vercel/Netlifyなどにデプロイ
2. 本番環境のドメインURLをClerkのWebhook設定に登録
   - 例: `https://yourdomain.com/api/webhooks/clerk`
3. 本番環境の環境変数に`CLERK_WEBHOOK_SECRET`と`SUPABASE_SERVICE_ROLE_KEY`を設定

## 参考リンク

- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
- [Supabase Service Role](https://supabase.com/docs/guides/api#the-service_role-key)
- [ngrok Documentation](https://ngrok.com/docs)
