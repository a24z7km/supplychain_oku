<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5dce9e33-d1c0-412f-b266-6f9d491c6da3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

このリポジトリは GitHub Pages（`https://a24z7km.github.io/supplychain_oku/`）へ
`gh-pages` を使って公開できるように設定済みです。リポジトリを clone した人は、
以下の手順で誰でも同じようにデプロイできます。

**前提:**
- Node.js がインストールされていること
- このリポジトリへの push 権限があること（`gh-pages` ブランチへ push するため）

**手順:**

1. 最新のコードを取得します:
   ```bash
   git clone https://github.com/a24z7km/supplychain_oku.git
   cd supplychain_oku
   # すでに clone 済みの場合は
   git pull origin main
   ```
2. 依存パッケージをインストールします（`gh-pages` を含む）:
   ```bash
   npm install
   ```
3. ビルドしてデプロイします:
   ```bash
   npm run deploy
   ```
   `predeploy` が自動で `npm run build` を実行し、生成された `dist/` を
   `gh-pages` ブランチへ公開します。ターミナルに `Published` と表示されれば成功です。
   （初回は GitHub の認証トークンを求められる場合があります）

4. 数分後、以下の URL でアプリが表示されます:

   👉 https://a24z7km.github.io/supplychain_oku/

**初回のみ: GitHub 側の設定**

一度だけ、リポジトリの **Settings → Pages** で以下を設定してください:
- **Source**: `Deploy from a branch`
- **Branch**: `gh-pages` / `(root)`

### 設定の仕組み（参考）

- `package.json`
  - `"homepage"`: 公開先の URL
  - `"predeploy"` / `"deploy"`: ビルドして `gh-pages -d dist` で公開するスクリプト
  - `gh-pages`: デプロイ用の devDependency
- `vite.config.ts`
  - `base: './'`: `/supplychain_oku/` のサブディレクトリでもアセットを
    正しく読み込めるようにする相対パス設定
