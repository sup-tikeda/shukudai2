# バイクショップ店舗管理

TanStack Start + Vite / ark-ui / Tailwind CSS + Tailwind Variants / zod / better-auth / drizzle-orm /
PostgreSQL / Vitest 構成の、バイクショップ（二輪整備・販売店）向け受付管理アプリです。
FileMaker製の同名アプリ（`バイクショップ店舗管理.fmp12`）のDDR（設計情報）解析結果をもとに、
テーブル構成・画面構成を移植しています。ログイン・認証の仕組みは以前の練習課題
（社内備品貸出管理）からそのまま引き継いでいます。

**現在の構成**：アプリは **Cloudflare Workers**、DBは **Neon（PostgreSQL）** で動いており、
接続は **Hyperdrive** を経由します（PCの電源に関係なく常時稼働）。
公開URL：https://shukudai2.t-ikeda-09f.workers.dev

## 2つの構成パターン

このリポジトリは、**2通りの動かし方**を維持しています。開発の途中で試した他の構成
（Railway、ローカルアプリ + Neon の組み合わせなど）は経緯として文書に残すだけで、
実際に使えるようにしているのは以下の2つです。

| | **パターンA：ローカル + Cloudflare Tunnel** | **パターンB：Cloudflare + Hyperdrive + Neon**（現行） |
| --- | --- | --- |
| アプリの実行場所 | このPC（Docker：app + nginx） | Cloudflare Workers |
| DB | このPCのPostgreSQL（Docker） | Neon（Hyperdrive経由） |
| 外部公開 | Cloudflare Tunnel（`*.trycloudflare.com`） | Workers のURL |
| PCを止めると | **止まる** | 影響なし（24時間稼働） |
| メール送信 | **使える**（docker-mailserver。社内限定） | 使えない（Workersの制約） |
| Basic認証 | nginx（`auth_basic`） | アプリ自身（`src/server.ts`） |
| ビルド | `pnpm build:node` → `dist/server/server.js` | `pnpm build` → `dist/server/index.js` |
| 起動・反映 | `docker compose up -d --build` | `pnpm cf:deploy` |

ビルド対象は環境変数 `BUILD_TARGET` で切り替わります（未指定なら `cloudflare`）。
`vite.config.ts` が Cloudflare 用プラグインの有無を切り替えるため、**同じソースのまま
どちらの構成でもビルドできます**。

**現在の運用はパターンB**（公開URL：https://shukudai2.t-ikeda-09f.workers.dev ）。
パターンA用のコンテナは停止しています（起動したままだと Cloudflare Tunnel の旧URLが
生き続け、同じデータへの入り口が二重にできてしまうため）。
唯一 **pgAdmin だけは起動したまま**にしており、Neonの中身をブラウザで確認するのに使います
（http://localhost:5051 ）。

```bash
docker compose up -d pgadmin   # DBを見たい時だけ起動する
docker compose stop            # 使い終わったら停止
```

**パターンAへ戻す場合**は、`.env` の `DATABASE_URL` をローカルPostgreSQL向けに戻したうえで
以下を実行します（DBの中身はNeon側とは別物になる点に注意）。

```bash
docker compose --profile rollback up -d postgres  # ローカルDBを起動
pnpm build:node                                    # Node向けにビルド
docker compose up -d --build                       # app + nginx + cloudflared + mailserver
```

## 現在のスコープ

- ログイン（アカウント名／パスワード。自己登録は不可で、初期アカウントはCLIで発行）
- ログイン後のダッシュボード（`/`）から各画面へ遷移
- 顧客管理（`/customers`、`/customers/$id`）：顧客の登録・編集・削除、保有車両の一覧
- 車両管理（`/vehicles`、`/vehicles/$id`）：車両（バイク）の登録・編集・削除、関連する案件の一覧
- 案件管理（`/cases`、`/cases/$id`）：整備・修理などの作業案件の登録・編集・削除、関連する見積・請求の一覧
- 見積・請求管理（`/quotes`、`/quotes/$id`）：見積書・請求書の作成、明細項目の追加・編集・削除と自動集計
  （数量・税抜合計・消費税額・税込合計はすべて明細から都度計算し、保存はしない）
  - 明細項目ごとに消費税率を持てる（軽減税率・非課税品目が混在しても正しく計算される）
  - 見積書から請求書へのワンクリック変換（元の見積書は証跡として残す）
  - 発行日（作成日）を後から編集可能。社内メモ（帳票に印字されない）を通信欄とは別に持てる
- 見積書・請求書のPDF出力（`/quotes/$id/print`）：会社設定を差し込んだ帳票を表示し、
  ブラウザの印刷機能でPDFとして保存（「見積書・請求書のPDF出力」参照）
- 設定（`/master`。ナビ右側に表示。admin権限のみ）
  - 会社設定：見積・請求書に印字する自社情報と既定の消費税率（全体で1レコードのみ）
  - 社員マスタ：ログインアカウント（名前・アカウント名・権限・パスワード）に加え、
    ふりがな・生年月日（年齢は自動計算）・入社日・退職日・役職・保有資格・住所・連絡先・備考を管理。
    ここに登録した在職中の社員が、案件の担当者として選べる（「社員マスタと担当者」参照）
- ダッシュボード（`/`）：件数タイル4枚（顧客・車両・対応中の案件・車検切れ間近）＋
  売上の推移グラフ（直近6か月）＋案件ステータスのドーナツグラフ＋車検期限アラートを
  1画面に収めて表示（「ダッシュボードの構成」参照）
- 問い合わせフォーム → 担当者へメール通知（`/contact`。DBには保存しません）
- 店舗紹介ページ（`/lp`）：架空の店舗「バイクショップイケダ」のランディングページ
  （「店舗紹介ページ（LP）について」参照）

各一覧画面には、キーワードでの絞り込みと並べ替えを用意しています（件数が多くない業務のため、
サーバーへ問い合わせ直さず画面側で処理しています）。また、顧客詳細・車両詳細・案件詳細からは
「＋」ボタンでその相手をあらかじめ選んだ状態の作成フォームを開けます。

顧客 → 車両 → 案件 → 見積・請求 → 明細項目、の順に親子関係を持つ構成です（削除すると
関連する子レコードも連鎖して削除されます）。データはPostgreSQLに保存されるため、
ログインできる人全員が同じ内容を見ます（会社設定のみadmin限定）。

## 実行環境

このプロジェクトは **WSL2（Ubuntu）の中**で動かします。置き場所は次のとおりです。

| | 場所 |
| --- | --- |
| WSL から見たパス | `/home/tikeda/projects/shukudai2` |
| Windows から見たパス | `\\wsl.localhost\Ubuntu\home\tikeda\projects\shukudai2` |

VS Code は左下の緑のボタンから **「WSL に接続」** して開いてください。Windows 側の
`C:\...` に置いたまま WSL から操作すると極端に遅くなるため、作業は WSL 側に統一します。

ブラウザは Windows 側の Chrome や Edge をそのまま使えます（`http://localhost:5273` など）。

## 必要なもの

- WSL2（Ubuntu）と、WSL 統合を有効にした Docker Desktop
- Node.js 24 以上（`process.loadEnvFile` を使用しています）。`nvm install 24` で導入します
- pnpm（`corepack enable` で有効化）

新しいターミナルで `node` が見つからない場合は、`nvm use 24` を実行してください。

## セットアップ

```bash
pnpm install
cp .env.example .env          # DATABASE_URL に Neon（クラウドのPostgreSQL）の接続文字列を設定するなど、値を自分の環境に合わせて編集する
pnpm db:migrate               # テーブルを作成
pnpm db:seed                  # 動作確認用のダミーデータ3件を投入（任意）
```

ローカルにPostgreSQLを別途起動する必要はない（DBはNeonを使う。ロールバック用のローカルpostgresを
使う場合は `docker compose --profile rollback up -d postgres` で起動できる）。

ログイン用のアカウントを発行します（自己登録は無効のため必須）。
パスワードは引数に書くとシェル履歴に残るため、`--password` を省略して対話入力にしてください。

```bash
pnpm user:create --email admin@example.com --name "管理者"
```

2人目以降は `--role user` を付けます。発行後に開発サーバーを起動します。

```bash
pnpm dev                      # http://localhost:5273
```

## Docker でアプリまで動かす

```bash
docker compose up -d --build  # app + nginx + mailserver + pgadmin + cloudflared（DBはNeon）
```

`http://localhost:8080`（`.env` の `NGINX_PORT` で変更可）で開きます。
アプリコンテナ自体はホストへ直接公開せず、**nginx経由でのみ**アクセスする構成です
（直接ポートを公開すると、`BETTER_AUTH_URL` とHostヘッダがずれてCSRF検証に失敗するため）。
初回はマイグレーションとアカウント発行をコンテナ側で実行してください。

```bash
docker compose exec app pnpm db:migrate
docker compose exec app pnpm user:create --email admin@example.com --name "管理者"
```

docker-mailserverは**最低1つメールアカウントを作成しないと起動が完了しません**
（作成しないまま放置すると、約2分でDovecotの起動待ちを諦めてコンテナが不健全になります）。
実際にログインするわけではなく、送信リレーを動かすための儀式的な1件で構いません。

```bash
docker compose exec mailserver setup email add no-reply@shukudai2.local "任意のパスワード"
```

停止は `docker compose down`、**DBの中身ごと消す場合のみ** `docker compose down -v` です。

nginxは`.env`の`BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD`が未設定だと起動に失敗します
（インターネット公開する構成のため、入り口でBasic認証を必須にしている）。
`.env.example`をコピーしただけの状態では既定値`change-me`のままなので、
外部に公開する前に必ず推測されにくい値に変更してください。

## Cloudflare Tunnelで一時的に外部公開する

`cloudflared`サービスがCloudflareの**Quick Tunnel**（アカウント登録不要）を使い、
`https://xxxx.trycloudflare.com`のようなURLでインターネット経由の一時的なアクセスを可能にする。
社内での動作確認・共有用と割り切ること（起動のたびにURLが変わり、稼働継続の保証もない）。

```bash
docker compose up -d cloudflared
docker compose logs cloudflared   # 発行された https://xxxx.trycloudflare.com を確認
```

発行されたURLを `.env` の `TUNNEL_PUBLIC_URL` に設定し、`BETTER_AUTH_URL` に反映させるため
`app`コンテナを再起動する（設定しないと外部URLとOriginがずれてログインが403になる）。

```bash
docker compose up -d app
```

固定の独自ドメインで恒常的に公開したい場合は、Quick Tunnelではなく
[named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
（Cloudflareアカウントへのログインとドメイン登録が必要）に切り替えること。

## データベースをNeon（クラウド）に移行した経緯

PCを閉じてもデータが失われないよう、DBをローカルのDockerコンテナからNeon
（サーバーレスのマネージドPostgreSQL、無料枠あり）に移行した（アプリ本体もこの後Railwayに
移行したため、現在はDB・アプリともPCなしで動く。「アプリをRailway（クラウド）に移行した経緯」参照）。
移行手順は以下の通り。

1. Neonでプロジェクトを作成し、接続文字列を取得
2. `pnpm db:migrate`（`DATABASE_URL`をNeonに向けて実行）でテーブルを作成
3. `pg_dump --data-only`でローカルDBのデータを書き出し、Neonへ流し込んで移行
4. `.env`の`DATABASE_URL`をNeonの接続文字列に、`docker-compose.yml`の`app`サービスの
   `DATABASE_URL`上書き設定を削除し、`.env`の値がそのまま使われるようにした
5. ローカルの`postgres`サービスは`profiles: [rollback]`を付けて通常は起動しないようにした
   （データも消さずロールバック用に残してある。復旧する場合は
   `docker compose --profile rollback up -d postgres` で起動し、`.env`の`DATABASE_URL`を
   ローカル向けに戻す）

**注意（ハマった点）**：Neonの接続文字列には、ホスト名に`-pooler`が付いた「プーラー経由」と、
付いていない「直接接続」の2種類がある。データ移行時に`pg_dump`が出力する
`SELECT pg_catalog.set_config('search_path', '', false)`をプーラー経由のコネクションに対して
実行してしまい、プーラーが使い回す接続の`search_path`が空のまま壊れて、テーブルが
見えなくなる不具合が発生した（`ALTER DATABASE ... SET search_path`をやり直しても、
既に壊れたプールされた接続には反映されなかった）。**このアプリのように永続接続するNode.js
サーバーではプーラーのメリットがなく、事故の元になるため、`DATABASE_URL`には直接接続
（ホスト名に`-pooler`が付かない方）を使うこと。**

### pgAdminでNeonのデータを見る

ローカルの`postgres`サービスは通常起動していないため、pgAdminで以前登録した「ローカル用」の
サーバー（ホスト名`postgres`）は`failed to resolve host 'postgres'`のエラーになる。
実際に使われているデータはNeon側にあるため、pgAdminに**Neon用のサーバーを新しく登録**する。

1. pgAdmin（http://localhost:5051）の左「Servers」を右クリック →「登録」→「サーバー」
2. 「全般」タブ：名前に`Neon`など分かりやすいものを入力
3. 「接続」タブに以下を入力

   | 項目 | 値 |
   | --- | --- |
   | ホスト名/アドレス | `.env`の`DATABASE_URL`のホスト部分（`@`の後ろ、`/neondb`の手前） |
   | ポート | `5432` |
   | メンテナンスDB | `neondb` |
   | ユーザー名 | `neondb_owner` |
   | パスワード | `.env`の`DATABASE_URL`の`neondb_owner:`の直後の文字列 |

4. 「SSL」タブ：「SSL mode」を`Require`に変更（Neonは暗号化接続が必須）
5. 保存すると、`Databases > neondb > Schemas > public > Tables`の下に
   `user`・`account`・`equipment_items`・`equipment_loans`などが見える

ローカル用の古いサーバー登録（ホスト名`postgres`）は、使わないなら削除して構わない。

## アプリをRailway（クラウド）に移行した経緯 ※現在は廃止

> **この節は過去の経緯**。RailwayはCloudflare Workersへの移行後に**サービスごと削除済み**
> （従量課金を止めるため）。現在の構成は「Cloudflare Workers + Hyperdrive + Neon 構成」を参照。
> 戻したくなった場合は、この節の手順とGitHubのコードから再構築できる。

PCの電源を落としても・Dockerを止めてもアクセスできるよう、アプリ本体もRailway
（Dockerイメージをそのままデプロイできるホスティングサービス）に移行した。
公開URL（当時）：https://shukudai2-production.up.railway.app

**構成**：既存の[Dockerfile](Dockerfile)の`app`ステージ（最終ステージ）がそのままRailwayでビルド・
実行される。nginx・docker-mailserver・pgAdmin・cloudflaredはRailwayへは移行していない
（下記「今回保留した点」参照）。DBは前節のNeonをそのまま共有して使う。

**Basic認証について**：Railwayではこのアプリの前段にnginxを置いていないため、
[server.mjs](server.mjs)にアプリ自身でのBasic認証ミドルウェアを追加した。
`BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD`が両方設定されている場合のみ有効になる
（未設定なら何もしない＝ローカルの`pnpm dev`等には影響しない）。nginx経由の構成
（Docker Compose）では、nginxとアプリの両方で同じ認証情報を使って二重にチェックされるが、
値が同じなので体感上は問題ない。

**Railway側の環境変数**：`railway variables set`で以下を設定した（`.env`とは別に、
Railwayのプロジェクト側で管理されている。ローカルの`.env`をコミットしないのと同様、
これらの値もリポジトリには含まれない）。

| 変数 | 値 |
| --- | --- |
| `DATABASE_URL` | Neonの直接接続URL（ローカルと共有） |
| `BETTER_AUTH_SECRET` | Railway用に新規生成した値（ローカルとは別の値） |
| `BETTER_AUTH_URL` | `https://shukudai2-production.up.railway.app`（`railway domain`で発行） |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | Railway用に新規生成した値（ローカルとは別の値） |
| `SMTP_*` / `MAIL_FROM` / `CONTACT_NOTIFY_TO` | プレースホルダーの値（下記の通り機能しない） |

**今回保留した点（メール通知）**：問い合わせフォームの通知メール送信は今回のRailway移行では
未対応のまま。docker-mailserverをクラウドで安定稼働させるのはコストに見合わないため、
`SMTP_HOST`等はダミー値を設定してアプリの起動チェック（`src/lib/env.ts`）だけ通し、
実際に問い合わせフォームを送信すると失敗する（画面には「送信に失敗しました」と表示されるのみで、
アプリ全体がクラッシュすることはない）。本格的に対応する場合は、Resend・SendGridなどの
外部メール配信サービスへの切り替えを検討する。

**デプロイ・運用コマンド**（Railway CLIを使用。`railway login`でログイン済みであること）：

```bash
railway up            # 現在のディレクトリの内容をデプロイ
railway logs           # 実行ログを表示
railway variables list # 設定済みの環境変数を確認
railway service list   # デプロイ状態を確認
```

なお`railway up`で「Multiple services found」と言われる場合は`--service shukudai2`を付ける。

## Cloudflare Workers + Hyperdrive + Neon 構成（このブランチ）

アプリを Cloudflare Workers 上で動かし、DB（Neon）へは **Hyperdrive** 経由で接続する構成。
Railway（従量課金）からの移行先として作成した。公開URL：https://shukudai2.t-ikeda-09f.workers.dev

```
利用者 → Cloudflare Workers（アプリ本体＋静的配信＋Basic認証）
              ↓ Hyperdrive（接続プール・接続確立の高速化）
           Neon（PostgreSQL）
```

### 構成のポイント

- **ビルド**：[@cloudflare/vite-plugin](https://developers.cloudflare.com/workers/vite-plugin/) を
  `vite.config.ts` の**先頭**に置き、SSR環境を workerd で動かす。開発（`pnpm dev`）も本番と同じ
  workerd 上で動くため、環境差による事故が起きにくい。
- **エントリポイント**：Basic認証を挟むため、既定の `@tanstack/react-start/server-entry` ではなく
  [src/server.ts](src/server.ts) を使う（`wrangler.jsonc` の `main`）。
- **DB接続**：[src/lib/db.ts](src/lib/db.ts)。Hyperdrive の接続文字列はリクエストの `env` からしか
  取れないため、`src/server.ts` がリクエスト毎に DB 層へ渡す。
- **静的ファイル**：`dist/client` を Workers の Assets として配信（Viteプラグインが自動設定）。

### ハマった点（重要）

1. **`wrangler deploy` は必ずビルド出力側の設定を指定する**
   ルートの `wrangler.jsonc` をそのまま使うと、wrangler が `src/server.ts` を**独自に再バンドル**して
   しまい、TanStack Start のコード変換（サーバー関数の抽出など）が抜け落ちて500エラーになる。
   Viteプラグインが `dist/server/wrangler.json` を生成するので、そちらを指定すること
   （`pnpm deploy` がこれを行う）。

2. **モジュール読み込み時（グローバルスコープ）で乱数生成・通信をしてはいけない**
   Workers の制約で、`Disallowed operation called within global scope` エラーになる。
   better-auth の初期化（`betterAuth({...})`）と DB クライアントの生成がこれに該当したため、
   どちらも**最初に使われた時に生成する遅延初期化**へ変更した。呼び出し側を変えずに済むよう、
   `auth` と `db` は実体への Proxy として公開している
   （[auth.ts](src/lib/auth.ts) / [db.ts](src/lib/db.ts)）。
   なおローカル開発では requestごとにモジュールが評価されるためこのエラーが出ず、
   **本番だけ500になる**という形で表面化する。

3. **`betterAuth()` の戻り値型はファクトリ関数から推論する**
   `ReturnType<typeof betterAuth>` と書くとプラグイン（admin/username）由来のAPIの型が失われ、
   `createUser` や `role` が「存在しない」と型エラーになる。

### コマンド

```bash
pnpm dev          # ローカル開発（workerd上で動く）
pnpm build        # ビルド
pnpm deploy       # ビルドしてCloudflareへデプロイ
wrangler tail     # 本番の実行ログ（--format json で例外のスタックまで見える）
```

### 環境変数・シークレット

秘密でない値は `wrangler.jsonc` の `vars`、秘密の値は `wrangler secret put <名前>` で登録する
（`nodejs_compat` により、どちらも `process.env` から読める＝[src/lib/env.ts](src/lib/env.ts) がそのまま動く）。

| 種別 | 変数 |
| --- | --- |
| vars（公開） | `BETTER_AUTH_URL` / `BASIC_AUTH_USER` / `SMTP_*` / `MAIL_FROM` / `CONTACT_NOTIFY_TO` |
| secret（非公開） | `BETTER_AUTH_SECRET` / `BASIC_AUTH_PASSWORD` / `DATABASE_URL` |

ローカル開発用のシークレットは `.dev.vars`（gitignore済み）に置く。ローカルの Hyperdrive は
環境変数 `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` で接続先を指定する。

### この構成での制約

- **メール送信は動かない**：Workers では nodemailer（SMTP）が使えない。`SMTP_*` はダミー値を
  設定してあり、問い合わせフォームを送信すると画面に「送信に失敗しました」と表示される。
  対応する場合は Resend など HTTP API 型のサービスへ差し替える。
- **`pnpm user:create` / `pnpm auth:schema`（better-auth CLI）は Node 上で動く**。
  DB接続は `.env` の `DATABASE_URL`（Neonへの直接接続）を使うため、そのまま利用できる。

## 構成の選定理由と、他の選択肢との比較

「なぜこの組み合わせなのか」「乗り換えるならどこか」を後から判断できるよう、検討内容を残す。

### ローカルとクラウドは同じDBを共有している

現在、ローカルの開発環境もCloudflare Workers（本番）も、**同じNeonのDBを指している**
（本番はHyperdrive経由、ローカルは`.env`の`DATABASE_URL`経由だが、接続先のDBは同一）。
同期しているのではなく、そもそもDBが1つしかない、というのが正確な理解。変更の種類によって
挙動が違う点に注意する。

| 変更の種類 | ローカルで変更した場合 | 本番で変更した場合 |
| --- | --- | --- |
| データ（顧客を1件追加など） | 本番にも即反映 | ローカルにも即反映 |
| DBの構造（`pnpm db:migrate`） | 本番にも即反映 | 同上 |
| 画面・コード | **反映されない**（デプロイが必要） | （本番でコードは直接編集しない） |

この構成は「ローカルでの試行錯誤が本番データを直接壊しうる」という裏返しでもある。
分けたい場合はNeonのブランチ機能で開発用DBを作る（意図的に別DBになるため、
データは互いに反映されなくなる）。

### データベース：Neonを選んでいる理由

このアプリは「普通のPostgreSQL + drizzle-orm + better-auth」という一般的な構成で、
Neon固有の機能は使っていない。そのため**標準的なPostgreSQLサービスなら`DATABASE_URL`の
差し替えだけで移行できる**。それでもNeonを維持しているのは以下の理由。

- すでに動いており、乗り換えには必ず事故のリスクが伴う（実際にsearch_pathの件で一度ハマっている）
- 無料枠（ストレージ0.5GB／コンピュート100CU時間）に対し、この規模の使用量は極小
- 開発用DBを分けたくなった時に、ブランチ機能がそのまま使える
- Cloudflare Workersへ移る可能性を残せる（HTTP経由の接続に対応しているのはNeonの強み）

他の選択肢を選ぶとしたら以下が候補。

| ケース | 候補 | 備考 |
| --- | --- | --- |
| 今のまま安定運用したい | **Neon（現状維持）** | 移行の手間ゼロ |
| 将来ファイル保存や別の認証機能も使いたい | Supabase | PostgreSQLなので差し替えのみ |
| 管理先を1か所にまとめたい | RailwayのPostgres | 従量課金でコストは増える |
| Cloudflareに全部寄せたい | Cloudflare D1 | **SQLite系で別物**。スキーマ・認証基盤の作り直しが必要 |

### アプリの置き場所：RailwayからCloudflareへ移した理由と、実際にかかった手間

**費用**が決め手。Railwayは従量課金（`railway usage`で確認できる）で使うほど増える一方、
Cloudflare Workersはこの規模なら無料枠に収まる。長期間動かし続ける前提のため移行し、
**Railwayはサービスごと削除した**。

移行前は「4箇所の書き直しが必要」と見積もっていたが、実際にやってみた結果は以下の通りだった
（見積もりが外れた点も含めて記録しておく）。

| 事前の見積もり | 実際 |
| --- | --- |
| `postgres`パッケージ（TCP接続）は動かないので`@neondatabase/serverless`へ差し替えが必要 | **不要だった**。Hyperdrive + `nodejs_compat` により `postgres` パッケージのまま動いた |
| better-auth（`node:crypto`依存）の調整が必要 | ライブラリ自体は`nodejs_compat`で動いた。ただし**初期化タイミング**の修正が必要だった（下記） |
| メール送信（nodemailer）が使えない | そのとおり。ダミー設定のまま保留 |
| ビルド構成の変更が必要 | そのとおり。`@cloudflare/vite-plugin`を足すだけで済んだ |

一方、**事前に見積もれていなかった問題**が2つあり、こちらの方が時間を使った。
どちらも「Cloudflare Workers + Hyperdrive + Neon 構成」の節に詳しく書いてある。

1. `wrangler deploy` にビルド出力側の設定を渡さないと、ソースが再バンドルされて500になる
2. Workers はモジュール読み込み時の乱数生成・通信を禁止しており、better-authとDB接続の
   初期化を遅延化する必要があった（**ローカルでは再現せず本番だけ500になる**）

## 外部公開する前のセキュリティ対応

Cloudflare Tunnelでインターネットから到達可能にする前に、以下を行っている
（**Railwayへのアプリ移行後は、Basic認証は上記の通りアプリ自身がかけている**）。

1. **検索エンジンにインデックスさせない**：全ページに`<meta name="robots" content="noindex, nofollow">`
   （[__root.tsx](src/routes/__root.tsx)）を出力し、`/robots.txt`（[public/robots.txt](public/robots.txt)）で
   `Disallow: /`を返す。
2. **入り口でBasic認証をかける**：nginx側で`auth_basic`を有効にし（[nginx/default.conf](nginx/default.conf)）、
   ID/パスワードは`.env`の`BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD`から、コンテナ起動時に
   [generate-htpasswd.sh](nginx/generate-htpasswd.sh)が生成する（値をイメージやコードに焼き込まない）。
   パスワードを変更したら `docker compose up -d --build nginx` で反映する。
3. **アプリ自体のログインパスワードも強固なものに変更済み**（Basic認証を突破された場合の保険）。

Basic認証はアプリの全パス（`/robots.txt`含む）にかかるため、検索botは`robots.txt`の中身を見る前に
401で弾かれる。結果的にnoindexよりも強い制限になっている（意図した動作）。

## 環境変数

`.env` は `.gitignore` で除外しています。**認証情報をコードやリポジトリに直接書かないでください。**
本番環境では `.env` ファイルではなく、実行環境の環境変数（systemd の `Environment=`、
Docker の secrets、CI/CD のシークレット機能など）で渡します。

| 変数 | 用途 |
| --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | ロールバック用のローカルpostgres（`profiles: [rollback]`。通常は未使用）の設定 |
| `DATABASE_URL` | 実際に接続するDB（現在はNeon）。`pnpm dev` / `db:migrate` / `db:seed` およびDockerの`app`サービスが使う。Neonは**プーラー経由ではなく直接接続のURL**を使うこと（「データベースをNeonに移行した経緯」参照） |
| `NGINX_PORT` | nginx（リバースプロキシ）のホスト側公開ポート（既定 8080）。コンテナでアプリまで動かす場合の実際のアクセス先 |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | 外部公開時にnginxがかけるBasic認証のID/パスワード。未設定だとnginxが起動しない |
| `BETTER_AUTH_SECRET` | セッション署名用の秘密鍵。`openssl rand -base64 32` などで生成し、環境ごとに変える |
| `BETTER_AUTH_URL` | アプリの公開URL |
| `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` / `PGADMIN_PORT` | pgAdmin（DBをブラウザで見るツール）のログイン情報と公開ポート |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | 問い合わせ通知メールのSMTP設定。ホストからは`localhost:2525`、コンテナ内からは`mailserver:25`に接続する |
| `MAIL_FROM` | 通知メールの差出人 |
| `CONTACT_NOTIFY_TO` | 問い合わせの通知先アドレス |
| `MAIL_DOMAIN` | docker-mailserver のドメイン名（社内限定のため実在ドメインでなくてよい） |
| `MAIL_SMTP_PORT` | docker-mailserver のホスト側公開ポート（既定 2525。ホストから送信テストする場合に使う） |
| `TUNNEL_PUBLIC_URL` | Cloudflare Tunnel（`cloudflared`サービス）で外部公開する際の公開URL。設定すると`BETTER_AUTH_URL`をこの値で上書きする |

値は `src/lib/env.ts` の zod スキーマで検証されます。未設定・不正な形式ならその場で失敗するため、
本番で設定漏れに気づかないまま動き続けることはありません。
`env.ts` はサーバー側専用です。クライアントコンポーネントから import しないでください。

コンテナ内は接続先が変わるため、`DATABASE_URL` と `BETTER_AUTH_URL` は
[docker-compose.yml](docker-compose.yml) が `.env` の値を上書きします（DBのホスト名は `postgres`）。
`POSTGRES_PASSWORD` は `DATABASE_URL` に埋め込むため、`@` `:` `/` を含めず英数字のみにしてください。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー（5273番。ポートは vite.config.ts で固定） |
| `pnpm build` | 本番ビルド |
| `pnpm start` | ビルド済みアプリをNodeで起動（静的配信も同プロセス） |
| `pnpm test` | Vitest |
| `pnpm db:generate` | スキーマ変更からマイグレーションSQLを生成 |
| `pnpm db:migrate` | マイグレーションを適用 |
| `pnpm db:seed` | ダミーデータ3件を投入（既にデータがあれば何もしない） |
| `pnpm db:studio` | drizzle studio |
| `pnpm auth:schema` | better-auth の設定から認証テーブル定義を再生成 |
| `pnpm user:create` | アカウントを発行 |

## ディレクトリ構成

```
src/
├── server.ts              # Cloudflare Workers 向けエントリ（Basic認証＋DB接続の受け渡し）
├── routes/                 # ファイルベースルーティング
│   ├── __root.tsx           # HTMLドキュメント全体の枠
│   ├── index.tsx            # ダッシュボード（要ログイン。各画面への入口）
│   ├── customers.tsx         # 顧客一覧・作成・編集・削除（要ログイン）
│   ├── customers_.$id.tsx    # 顧客詳細＋保有車両一覧（末尾の"_"は非ネスト化のため）
│   ├── vehicles.tsx          # 車両一覧・作成・編集・削除
│   ├── vehicles_.$id.tsx     # 車両詳細＋関連案件一覧
│   ├── cases.tsx             # 案件一覧・作成・編集・削除
│   ├── cases_.$id.tsx        # 案件詳細＋関連する見積・請求一覧
│   ├── quotes.tsx            # 見積・請求一覧・作成（自動集計込み）
│   ├── quotes_.$id.tsx       # 見積・請求詳細＋明細項目の追加・編集・削除
│   ├── quotes_.$id_.print.tsx # 見積書・請求書の印刷ページ（PDF出力）
│   ├── master.tsx            # マスタ管理（社員・会社設定。要admin）
│   ├── login.tsx             # ログイン
│   ├── contact.tsx           # 問い合わせフォーム
│   ├── lp.tsx                # 店舗紹介ページ（お客様向け。管理画面のナビは使わない）
│   └── api/auth/$.ts        # better-auth のHTTPハンドラ
├── server/
│   ├── customers.ts        # サーバー関数（顧客のCRUD）
│   ├── vehicles.ts         # サーバー関数（車両のCRUD、所有者名・案件数を結合）
│   ├── cases.ts            # サーバー関数（案件のCRUD、車両名・顧客名を結合）
│   ├── quotes.ts           # サーバー関数（見積・請求＋明細項目のCRUD、集計計算）
│   ├── shopSettings.ts     # サーバー関数（会社設定の取得・更新、admin専用）
│   ├── accounts.ts         # サーバー関数（社員=ログインアカウントのCRUD、admin専用）
│   ├── postal.ts           # サーバー関数（郵便番号→住所の検索。外部APIをサーバー経由で呼ぶ）
│   ├── dashboard.ts        # サーバー関数（ダッシュボードの集計）
│   ├── session.ts          # ダッシュボード用のログイン中ユーザー取得
│   ├── authGuard.ts        # ログイン必須／admin権限チェックの共通処理
│   └── inquiries.ts        # サーバー関数（問い合わせのメール通知）
├── components/
│   ├── documents/
│   │   └── quote-document.tsx  # 見積書・請求書の帳票テンプレート（印刷用）
│   └── ui/
│       ├── form.tsx            # 入力欄・ボタン・モーダル（ark-ui + tailwind-variants）
│       └── layout.tsx          # 画面の骨組み（上部ナビ・カード・一覧の行・バッジ・数値タイル）
├── lib/                    # auth / db / mailer / env / zodスキーマ
├── db/                     # drizzleスキーマ・マイグレーション・シード
└── styles/app.css          # Tailwind エントリ

nginx/
└── default.conf            # アプリへのリバースプロキシ設定（パターンAでのみ使用）
```

`customers_.$id.tsx` のように、一覧画面（`customers.tsx`）と同じプレフィックスを持つ詳細画面は
**末尾に`_`を付けて非ネスト化**している。TanStack Routerは`customers.$id.tsx`のような命名だと
`customers.tsx`の子ルート（レイアウト）として扱い、親に`<Outlet />`が無いと詳細画面の内容が
表示されない（この問題に実際にハマったため記録している）。

`src/db/auth-schema.ts` と `src/routeTree.gen.ts` は自動生成ファイルです。手で編集しないでください。

## 見積書・請求書のPDF出力

`/quotes/$id/print` が帳票の印刷ページです。見積・請求の一覧・詳細にある「印刷 / PDF」ボタンから開き、
**ブラウザの印刷画面で「送信先」を「PDFに保存」にするとPDFファイルとして保存できます**。

### 帳票テンプレート

[quote-document.tsx](src/components/documents/quote-document.tsx) が帳票のテンプレートです。
元のFileMaker「見積・請求_印刷」レイアウトの構成（発行元ヘッダ → 宛名 → 合計金額 → 明細表 →
振込先 → 通信欄）を踏襲しています。

- **差し込む内容はすべてDBから**。発行元（会社名・住所・TEL・インボイス登録番号・振込先）は
  マスタ画面の「会社設定」、宛名は顧客、明細は見積・請求の明細項目を使います。
  テンプレートを直さなくても、会社設定を変えれば全帳票の印字内容が変わります。
- **種別で文言を出し分ける**（元レイアウトの`用紙_文言`と同じ）。
  見積書は「お見積もり内容は以下になります」「御見積金額」、請求書は「下記の通りご請求申し上げます」
  「御請求金額」。**振込先は請求書のときだけ**印字します。
- **書類番号は`quotes.doc_number`（連番）**。UUIDは人が読み上げられないため、帳票用に別途持っています。
- 画面全体はダークテーマですが、**帳票だけは紙に出す前提で白地・黒文字**にしています。

### PDF生成にライブラリを使っていない理由

日本語のPDFを自前で生成するにはCJKフォントの埋め込みが必要で、フォントファイルだけで数MB〜十数MBに
なります。Cloudflare Workers にはスクリプトサイズの上限があるため現実的ではありません。
ブラウザの印刷機能を使えば、フォントは閲覧者の端末のものが使われるためこの問題が起きません
（元のFileMakerも「印刷レイアウトに切り替えてPDF保存」という同じ考え方でした）。
用紙サイズ・余白は[app.css](src/styles/app.css)の`@page`で指定しています。

## 画面デザインの方針

管理画面は**明るいテーマ＋オレンジのアクセント**、店舗紹介ページ（LP）だけは**ダークテーマ**です。
管理画面は長時間の入力作業で使うため見やすさを優先し、LPは店の雰囲気を出すため暗いままにしています。

- **配色は[app.css](src/styles/app.css)の`@theme`に集約**。`shell`（最も奥の背景）／`surface`（カード）／
  `surface-raised`（ホバー・入れ子）／`line`（罫線）／`ink`系（文字）／`accent`（オレンジ）／
  `danger`・`success`・`info`（状態）という**役割で名前を付けている**ため、配色を変えたい時は
  このファイルだけを直せば全画面に反映されます。
  画面側では`bg-surface`・`text-ink-muted`のように役割名で参照し、`slate-700`のような具体色は書きません。
  エラー表示も`text-red-400`ではなく`text-danger`と書きます（テーマを切り替えても破綻しないため）。
- **明暗の切り替えは`.theme-dark`クラスひとつ**。このクラスは`@theme`の変数を暗い値で再定義するだけなので、
  画面側のクラス（`bg-surface`など）は書き換え不要です。LPは最上位の`<div>`にこれを付けています。
  一部だけ暗くしたい画面が出てきた場合も、同じように囲むだけで済みます。
- **アクセント（オレンジ）は「今いちばん押してほしいもの」にだけ使う**。主操作ボタン、選択中のナビ、
  税込合計、作業中ステータスなど。多用すると効かなくなるため、副操作は`outline`／`ghost`にしています。
- **メリハリの付け方**。平坦に見えないよう、次の3つを意図的に使い分けています。
  - **大きさの差をはっきり付ける**：画面見出しは`text-3xl font-black`、ダッシュボードは`text-4xl`。
    中間の太さ（`font-medium`）を減らし、太い／細いの2段階に寄せています。
  - **面で示す**：選択中のナビとダッシュボードの主要数値は、薄い色違いではなくオレンジで塗りつぶします。
    一覧の行はホバー時に左端へオレンジの縦線が伸び、いま見ている行が分かります。
  - **区切りを作る**：見出しの下に罫線、カードの見出し帯に薄い背景、カードにはごく弱い影。
    地の色（`shell`）をわずかに沈ませ、白いカードが浮いて見えるようにしています。
- **全画面共通の上部ナビ**（[layout.tsx](src/components/ui/layout.tsx)の`AppShell`）で、どの画面からでも
  顧客・車両・案件・見積請求へ移動できます。以前のように各画面へ「← ダッシュボードへ」と
  ログアウトボタンを個別に置く必要がなくなりました。
- **状態は文字ではなく色付きバッジで示す**。案件ステータス（未作業＝無彩色／作業中＝オレンジ／
  完了済み＝緑）、見積書＝青・請求書＝オレンジ。一覧をざっと見た時に状況が掴めるようにするためです。
- **金額・数量は`tabular-nums`で桁を揃える**。一覧で縦に並んだ時に読み違えないようにするためです。

## 実装上の注意点

- **ログインの判定はサーバー側で行う**。[authGuard.ts](src/server/authGuard.ts) の `requireSession()`
  （ログイン必須）／`requireAdminSession()`（admin必須）を各サーバー関数の先頭で呼び、条件を満たさなければ
  `/login` または `/` へリダイレクトします。画面側の表示制御だけに頼っていません。
- **`server.mjs` はアプリ本体を動的importで読み込む**（パターンA＝Node向けビルドの場合）。アプリは
  読み込んだ時点で環境変数を検証するため、静的importにすると `.env` の読み込みより先に評価されて
  起動に失敗します。
- **コンテナのタイムゾーンを `Asia/Tokyo` に固定している**（パターンA）。日付を扱う項目の初期値が
  サーバーとブラウザでずれないようにするためです。alpine は `tzdata` を入れないと `TZ` の指定が
  無視されます。
- pnpm 12.3.4 は `@tanstack/start-server-core` が使う npm エイリアス依存 `h3-v2`（= `h3`）を
  再解決できず、依存を追加しようとすると 404 で失敗します。[pnpm-workspace.yaml](pnpm-workspace.yaml)
  の `overrides` で解決先を明示して回避しています。この行を消すと `pnpm add` が通らなくなります。
- **ホスト側のポートは、既に使われているものを避けて割り当てています**（PostgreSQL: 5433、
  nginx: 8080、docker-mailserver: 2525、開発サーバー: 5273）。このPCでは 3000 と 5173 を
  他プロジェクトの開発サーバーが使用しており、そのままだと同じURLで別のアプリが表示されてしまいます。
  `vite.config.ts` は `strictPort: true` にしてあるため、ポートが空いていなければ黙って
  別ポートに移らず起動に失敗します（`BETTER_AUTH_URL` とずれるのを防ぐため）。
- **`vite.config.ts` で `server.host: true` を指定しています**。WSL の中で既定の localhost
  だけを見て待ち受けると、環境によっては Windows のブラウザから届かないことがあるためです。
- **データベースは他プロジェクトと共有していません**。`docker-compose.yml` の `name:` により、
  コンテナ・データ保管庫・ネットワークがこのプロジェクト専用に分かれます。`~/dev/posgres` にある
  共有PostgreSQL（5432番）とは無関係です。
- **社員マスタの更新で、アカウント名（`username`）が変わっていない場合は更新データに含めない**
  （[accounts.ts](src/server/accounts.ts) の `updateAccount`）。better-authの`username`プラグインは
  「自分以外のユーザーを、既存のアカウント名のまま更新する」際に、更新対象と操作者（管理者）のIDを
  取り違えて誤って「アカウント名が既に使われています」と判定することがあるため、この回避策が必要。
- **nginx（[nginx/default.conf](nginx/default.conf)）は `Host` ヘッダを `$host` ではなく
  `$http_host` で転送している**。`$host` はポート番号を含まないため、`BETTER_AUTH_URL`
  （ポート込み）と不一致になり、サーバー関数のCSRF検証（Origin/Hostの比較）が403になる。
- **アプリコンテナはホストへ直接公開していない**（`expose: "3000"` のみ）。nginx経由の
  アクセスと直接アクセスの2通りが有効だと、`BETTER_AUTH_URL`と実際のHostヘッダがずれた方で
  CSRF検証に失敗するため、入り口をnginxだけに絞っている。
- **docker-mailserverは社内限定の送信専用リレーとして最小構成にしている**
  （`ENABLE_SPAMASSASSIN` / `ENABLE_CLAMAV` / `ENABLE_FAIL2BAN` はすべて無効、`PERMIT_DOCKER: network`
  で同じDockerネットワーク内からは認証なしでリレーを許可）。TLS証明書やDNSのSPF/DKIM/PTR設定は
  行っていないため、**社外の実際のメールアドレスへの配信は保証されません**。実際にGmail宛に
  送信テストしたところ、送信元ドメインが認証されていないとしてDMARCポリシー違反で拒否（バウンス）
  されることを確認済みです（`550 5.7.26 Unauthenticated email ... is not accepted due to domain's
  DMARC policy`）。社内向けの通知用途に限定してください。実際に社外へ配信する必要が出た場合は、
  自前運用ではなく SendGrid・Amazon SES・Postmark などの正式なメール配信サービスの利用を検討する。

## 外部システムからのログイン確認（社内ダッシュボード連携）

社内ダッシュボードなど別システムがこのアプリのログイン状態を確認したい場合、`account` テーブルの
パスワードハッシュに直接クエリするのではなく、better-auth が標準で提供する
`GET /api/auth/get-session`（`src/routes/api/auth/$.ts` 経由。追加実装は不要）を使ってください。
未ログイン・無効なセッションなら `null`、有効なら `{ session, user }` をJSONで返し、
`user` にはパスワード関連の情報は一切含まれません（`user` テーブル自体にパスワード列が存在しないため）。

呼び出し元が別オリジンのブラウザアプリになる場合は、`src/lib/auth.ts` に `trustedOrigins` の設定と、
Cookieをサブドメイン間で共有するための設定（`advanced.crossSubDomainCookies` など）が別途必要です。
社内ダッシュボードのURLが決まっていないため、現時点では未設定です。決まり次第この節を更新してください。

## これまでの作業履歴

開発の経緯を後から追えるよう、主な作業を時系列でまとめる（詳細は各節・各コミットを参照）。

1. **基本画面の実装**：ログイン、ダッシュボード、備品貸出リスト（登録・返却）、問い合わせフォームを
   TanStack Start + drizzle-orm + better-auth構成で実装。
2. **ログイン方式の変更**：メールアドレスではなく「アカウント名」でログインできるよう、better-authの
   `username`プラグインを導入（[auth.ts](src/lib/auth.ts)）。
3. **マスタ画面への刷新**：アカウント管理を「マスタ」画面（社員マスタ・備品マスタ、左右2ペイン、
   新規作成・編集はポップアップ）に作り直した（[master.tsx](src/routes/master.tsx)）。パスワードのみ
   変更時に失敗する不具合も修正（[accounts.ts](src/server/accounts.ts)）。
4. **周辺インフラの追加**：DBをブラウザで見るpgAdmin、リバースプロキシのnginx、問い合わせ通知用の
   docker-mailserverを追加。社内限定の送信専用リレーであり、社外への実配信は保証されないことを確認済み
   （DMARCポリシー違反で拒否される実例あり。「実装上の注意点」参照）。
5. **貸出登録と備品マスタの連携**：貸出リストの「備品名」欄を、備品マスタの登録名を候補表示しつつ
   手入力も可能な形にし、マスタに無い名前はサーバー側（[loans.ts](src/server/loans.ts)）で登録を拒否する
   ようにした。
6. **フォルダ名の変更**：`shukudasai-2` → `shukudai2` に変更し、影響する設定（Dockerプロジェクト名・
   メールドメイン・READMEのパス表記等）を追従修正。
7. **GitHubへの登録**：ローカルのみだったプロジェクトを`git init`し、Privateリポジトリ
   （https://github.com/sup-tikeda/shukudai2）を作成してpush。`.env`など機密ファイルは
   `.gitignore`で除外されていることを確認済み。
8. **Cloudflare Tunnelでの外部公開**：`cloudflared`サービス（Quick Tunnel）を追加し、
   `https://xxxx.trycloudflare.com`形式のURLでインターネット経由のアクセスを可能にした
   （「Cloudflare Tunnelで一時的に外部公開する」参照）。
9. **外部公開前のセキュリティ対応**：ファイル・コミット履歴に鍵や個人情報が含まれていないことを点検、
   検索エンジン対策（noindexメタタグ・`robots.txt`）、nginxでのBasic認証を追加し、アプリの管理者
   パスワードもより強固な値に変更した（「外部公開する前のセキュリティ対応」参照）。
10. **データベースをNeonに移行**：PCを閉じてもデータが失われないよう、DBをローカルのDockerから
    クラウドのNeonに移行した（「データベースをNeonに移行した経緯」参照）。
11. **アプリ本体をRailwayに移行**：PCなしでもアクセスできるよう、アプリ本体もRailwayにデプロイした。
    前段にnginxが無い構成のため、Basic認証はアプリ自身（`server.mjs`）で行うよう変更した
    （「アプリをRailway（クラウド）に移行した経緯」参照）。問い合わせメール通知は今回のRailway移行
    では対応を保留した。
12. **顧客マスタの追加**：マスタ画面に「顧客マスタ」タブを追加し、顧客名・担当者名・電話番号・
    メールアドレス・住所のCRUDを実装した（`customers`テーブル、[customers.ts](src/server/customers.ts)）。
    現時点では貸出登録など他機能とは連携せず、単体のマスタとして追加している。
13. **Cloudflare Workers + Hyperdrive へ移行し、Railwayを廃止**：従量課金を止めるため、
    アプリをCloudflare Workersへ移した。DBは引き続きNeonで、接続はHyperdrive経由。
    Railwayのサービスは削除済み（「Cloudflare Workers + Hyperdrive + Neon 構成」参照）。
14. **バイクショップ店舗管理への全面刷新**：FileMaker製アプリ（`バイクショップ店舗管理.fmp12`）を
    DDRParserで解析した設計情報をもとに、社内備品貸出管理の業務画面（貸出リスト・備品マスタ・
    顧客マスタ）をすべて廃止し、顧客・車両・案件・見積/請求の4画面＋会社設定に作り替えた。
    ログイン・認証（`user`/`session`/`account`/`verification`テーブル、社員マスタ）はそのまま
    引き継ぎ、既存の`customers`テーブルは項目を拡張して流用した。ダミーデータを投入して動作確認済み。
    実装中、詳細画面（`customers_.$id.tsx`等）が一覧画面の子ルートとして扱われ表示されない問題に
    遭遇し、TanStack Routerの非ネスト化規約（末尾`_`）で解決した（「ディレクトリ構成」参照）。
15. **デザインの刷新**：整備工場をイメージしたダークテーマ＋オレンジのアクセントに変更した。
    配色を`app.css`の`@theme`へ役割名で集約し、全画面共通の上部ナビ・カード・色付きバッジ・
    ダッシュボードの数値タイルを[layout.tsx](src/components/ui/layout.tsx)に共通部品として整理した
    （「画面デザインの方針」参照）。
16. **見積書・請求書のPDF出力**：元のFileMakerの印刷レイアウトを踏襲した帳票テンプレートを作成し、
    ブラウザの印刷機能でPDF保存できるようにした。帳票番号用に`quotes.doc_number`（連番）を追加
    （「見積書・請求書のPDF出力」参照）。

17. **元FileMakerとの機能差を埋めた**：FileMakerの設計情報を読み直し、Web版に無かった機能を
    洗い出して追加した。内訳は、各一覧の絞り込み・並べ替え、郵便番号からの住所自動入力
    （[postal.ts](src/server/postal.ts)）、案件の「残り日数」表示、案件一覧での「請求済み」表示、
    顧客詳細への車両・案件・見積/請求の集約、関連レコードを引き継いだ新規作成、
    見積・請求の種別/タイトル/税率/送付日/通信欄の後編集、帳票へのロゴ印字
    （会社設定の`logo_url`。マイグレーション`0006`）。
    **顧客写真・車両写真は対象外**とした（画像の保管場所を用意していないため）。
18. **店舗紹介ページ（LP）の追加**：架空の店舗「バイクショップイケダ」のランディングページを
    `/lp` に追加した（「店舗紹介ページ（LP）について」参照）。あわせて会社設定の会社名を
    「バイクショップイケダ」に変更した。

19. **管理画面を明るいテーマに変更**：暗くて見づらいという指摘を受け、管理画面の配色を白基調に
    変更した。`@theme`の変数を明るい値に置き換え、暗い配色は`.theme-dark`クラスとして残して
    LPにだけ適用している。あわせて`text-red-400`などの直書きの色を`danger`/`success`/`info`という
    役割名のトークンに置き換え、テーマを切り替えても破綻しないようにした。
    LPはダークのまま、ダッシュボードから別ウィンドウで開くようにした。
    なお**顧客写真・車両写真は実装しない方針**で確定した（画像の保管場所を新たに用意しないため）。

20. **メリハリの強化**：平坦で単調だったため、管理画面・LPの両方で強弱を付け直した。
    管理画面は見出しの拡大とオレンジの縦棒、選択中ナビの塗りつぶし、カード見出し帯、
    行ホバー時の左線、ダッシュボードの主要数値のオレンジ塗り。LPはセクションの明暗を交互にし、
    実績の帯と最後のCTAを全面オレンジにした（「画面デザインの方針」参照）。
    なお**Claude Design（claude.ai/design）は使わない方針**で、直接CSSを調整している。

21. **FileMaker再点検で見つかった不足機能をさらに追加**：全78スクリプト・13レイアウトを読み直し、
    優先度の高いものを実装した。
    - 明細ごとの消費税率（`quote_items.tax_rate`）。税額は**税率ごとに税抜小計をまとめてから
      1回だけ丸める**方式にした（元のFileMakerは行ごとに丸めており、数量が2以上のとき
      税抜合計＋消費税額が税込合計と一致しない不具合があったため、そのまま移植していない）。
      計算ロジックは[quote-summary.ts](src/lib/quote-summary.ts)に分離し、
      [quote-summary.test.ts](tests/quote-summary.test.ts)で端数処理を検証している。
    - 見積書→請求書のワンクリック変換（`convertQuoteToInvoice`）
    - 見積・請求の社内メモ（`internal_note`。通信欄と違い帳票に印字しない）と発行日の編集
    - 担当者マスタ（`assignees`テーブル）。案件の担当者欄がコード直書きだったため、
      マスタ管理できるようにした
    - 顧客一覧への保有台数・住所の表示（`leftJoin + count`）
    - ダッシュボードへの車検期限アラート
    - 上部ナビの右側に「設定」を常設（従来はダッシュボード最下部のリンクのみだった）し、
      admin以外には表示しない（「マスタ管理の配置」参照）
    - あわせて、FileMakerの値一覧からそのまま移植されていた担当者名（実在の人物名の可能性があるもの）
      を、シードデータ・DB上のデータともに架空の名前へ置き換えた
22. **ダッシュボードの車検期限アラートでSQLエラーが発生した不具合を修正**：`current_date + 60`
    という素のSQL式で、整数パラメータの型をPostgresが一意に決められず
    （`operator is not unique: date + unknown`）、ログイン後の最初の画面が必ずエラーになっていた。
    `::int`で明示的にキャストして解消した。あわせてダッシュボードの集計に
    「見積中の金額」「車検切れ間近の台数」を追加し、6項目に拡充した
    （[dashboard.ts](src/server/dashboard.ts)）。

23. **ダッシュボードをカード＋グラフ構成に刷新**：数字が並ぶだけで情報量が少なかったため、
    売上の推移（エリアチャート）と案件ステータス（ドーナツ）を追加し、スクロールせずに
    全体を見渡せる配置にした（「ダッシュボードの構成」参照）。あわせて、集計の税額計算が
    書類ヘッダの税率のままで帳票とずれていたのを、明細ごとの税率で計算するよう直した。

25. **CRUD（新規・更新・削除）の全体監査と修正**：「案件の担当者を変更しても表示が変わらない」
    という報告をきっかけに全画面を点検し、次を修正した。
    - 任意項目を空にしても消えない問題（更新処理の全テーブルに影響）
    - モーダルが閉じてもアンマウントされず、別の行を編集すると前の値が保存される問題
      （所有者・ステータス・権限などが黙って書き換わる恐れがあった）
    - 車両のメーカー・色に「未選択」が無く、未指定でも先頭が保存される問題
    - 削除の確認文が実際の削除範囲（案件・見積・請求まで連鎖）を伝えていなかった問題
    - アカウント名の重複が英語のまま表示される／自分自身を降格できてしまう／
      社員作成時に詳細情報が黙って保存されないことがある、といったアカウント周りの穴
    - 顧客の「担当者名」が検索対象なのに入力欄が無かった問題
    （「実装上の落とし穴（CRUDで実際に踏んだもの）」参照）
26. **左サイドバーのレイアウトへ変更**：上部の横並びナビから、左に固定サイドバー・右に本体という
    構成にした。顧客→車両→案件→見積請求の流れを縦に並べ、設定とログアウトは下端へ分けている。
    狭い画面では従来どおり上部の横並びに切り替わる。

27. **一覧画面も1画面に収める構成へ**：顧客・車両・案件・見積請求の4画面で、
    ページ全体をスクロールさせず一覧の中身だけをスクロールさせるようにした。
    見出し・検索欄・件数表示が常に見えたまま、画面内に収まる
    （「実装上の落とし穴」参照）。
28. **見出しの体裁を全画面で統一**：ダッシュボードだけ独自の見出しを持っていたため、
    小見出し（Customers / Vehicles など）を `PageHeader` に追加し、
    ダッシュボードも同じ部品を使うようにして文字サイズをそろえた。

29. **一覧を項目ごとの列に分割**：1行に情報を詰め込んでいたため縦に見比べられなかった。
    共通の表部品（`DataTable`）を作り、顧客・車両・案件・見積請求の4画面を
    列に分けた表に置き換えた（「一覧画面の表示」参照）。

## ダッシュボードの構成

来店対応の合間に開くことを想定し、**スクロールせず1画面で全体を見渡せる**ことを優先しています。

```
┌ 顧客 ─┬ 車両 ─┬ 対応中の案件 ─┬ 車検切れ間近 ┐   ← 件数タイル4枚
├───────┴───────┴─────────────┴────────────┤
│ 売上の推移（直近6か月）  │ 案件の状況 │ 車検期限が近い車両 │
│ 請求金額／見積金額＋グラフ │ ドーナツ  │ 先頭3台            │
└──────────────────────┴──────────┴──────────────────┘
```

- **グラフはライブラリを使わず、SVGを自前で描いています**（[chart.tsx](src/components/ui/chart.tsx)）。
  Cloudflare Workers にはスクリプトサイズの上限があり、この程度の表現のために
  数十KBの依存を足したくないためです。色は`app.css`の`@theme`変数を直接参照しているので、
  配色を変えるとグラフも一緒に変わります。
- **タイルの並びは「規模 → 要対応」の順**。車検切れ間近は0台なら通常表示、
  1台でもあれば数字を赤くして目に留まるようにしています。
- **車検アラートは先頭3台だけ**を出し、残りは件数で示して「車両一覧へ」に送ります。
  全件出すと画面に収まらないためです。
- 以前あった4つのメニューカード（顧客・車両・案件・見積請求への入口）は削除しました。
  上部ナビに同じ導線があり、二重に場所を取っていたためです。
- 月別売上は、売上の無い月も0として並べます（[dashboard-series.ts](src/lib/dashboard-series.ts)）。
  DBは売上のあった月しか返さず、そのままだと空白の月が詰められて
  「毎月売上がある」ように見えてしまうためです。

24. **担当者マスタを社員マスタへ統合し、社員の詳細情報を追加**：同じ人を二重に登録することになり
    維持の手間しか生まなかったため、`assignees`テーブルを廃止して社員マスタ（ログインアカウント）に
    一本化した。あわせて社員の詳細情報（`staff_profiles`テーブル）を追加し、ふりがな・生年月日・
    入社日・退職日・役職・保有資格・住所・連絡先・備考を登録できるようにした。
    設定画面のタブは会社設定を先頭に変更した。

## 実装上の落とし穴（CRUDで実際に踏んだもの）

新規・更新・削除まわりで実際に不具合が出た点です。同じ種類のミスを繰り返さないために残します。

### 1. 任意項目を空にしても値が消えない

zodの正規化で空文字を `undefined` にしていたところ、**drizzle-orm の `.set()` は
値が `undefined` のキーをSQLから除外する**ため、更新時にその列が一切書き換わりませんでした。
「案件の担当者を未定に戻せない」「退職日を消して在職中に戻せない」という形で表面化します。

**対策**：`optionalText` / `optionalDate` / `optionalInt` は `undefined` ではなく **`null`** を返します
（[validation.ts](src/lib/validation.ts)）。`tests/validation-optional.test.ts` で固定しています。

### 2. モーダルを閉じても中身がDOMに残り、前の行の値が保存される

ark-ui の `Dialog` は既定で**閉じても中身をアンマウントしません**（`lazyMount` / `unmountOnExit` の
どちらも指定していない場合）。フォームは `defaultValue` を使う非制御コンポーネントなので、
一度マウントされると後から `defaultValue` を変えても表示は変わりません。
その結果、**別の行の「編集」を開いても前回の値が残り、そのまま保存**されてしまいます。
セレクト（所有者・ステータス・権限）で起きると、気づかないままデータが書き換わります。

**対策**：[form.tsx](src/components/ui/form.tsx) の `Modal` に `lazyMount unmountOnExit` を付けています。
非制御フォームをモーダルで使う場合は必ずセットで考えること。

### 3. `<select>` に空の選択肢が無いと、未指定でも先頭が保存される

`defaultValue=""` を渡しても、一致する `<option>` が無ければブラウザは先頭を選びます。
車両のメーカー・色が、未指定のつもりでも必ず「ホンダ」「ブラック」になっていました。

**対策**：任意の選択項目には `{ value: "", label: "未選択" }` を先頭に入れます。

### 4. 「1画面に収める」ための高さの持ち方

一覧画面は、**ページ全体をスクロールさせず、一覧の中身だけをスクロール**させています。
こうすると見出し・検索欄・件数表示が常に見えたまま、画面内に収まります。

- `AppShell` の一番外側を `h-screen overflow-hidden` にして、画面の高さに固定
- 一覧画面は `<AppShell fill>` と `<Card fill>` を**セットで**使う
  - `AppShell fill` … 本文（`main`）自体をスクロールさせない（`overflow-hidden`）
  - `Card fill` … 残りの高さいっぱいに広がり、中身だけがスクロールする

**見出しや絞り込みを「構造的にスクロール領域の外側」へ置くことが要点**です。
はじめは本文ごとスクロールさせたうえで高さ計算で収めようとしましたが、
計算が少しでも狂うと見出しごと動いてしまいました。
スクロールする箱の外に出してしまえば、高さがどうであれ動きようがありません。

要点は2つあります。

- **`min-h-0` を付ける**。flexの子は既定で中身より小さくならないため、これが無いと
  カードが縮まず画面の外へあふれます。
- **パーセントの高さ（`min-h-full` / `h-full`）に頼らない**。パーセントの高さは
  「親の高さが確定していること」が条件で、条件が崩れると子が高さいっぱいに広がらず、
  結局ページ全体がスクロールしてしまいます。最初 `min-h-full` で組んだところ
  実際にこの症状が出たため、`flex-1` だけで高さを決める形に直しました。

当初は `position: sticky` で見出しを貼り付けましたが、バーの高さに応じて
下の要素の位置を計算する必要があり複雑になったため、この方式に変えました。

### 5. 固定表示（sticky）と重なり順

一覧画面の見出し・絞り込みは、スクロールしても隠れないよう `StickyBar`
（[layout.tsx](src/components/ui/layout.tsx)）で画面上部に貼り付けています。
`position: sticky` を使うと重なり順の指定が必要になるため、次の順に揃えています。

| 要素 | z-index | 理由 |
|---|---|---|
| 一覧の見出しバー | 20 | 一覧の行より前に出す |
| 上部ナビ（狭い画面のみ） | 30 | 見出しバーより前に出す |
| モーダルの背景 | 40 | 固定表示のものをすべて覆う |
| モーダル本体 | 50 | 最前面 |

モーダルは `z-index` を指定しないと **固定表示の見出しバーの後ろに隠れます**
（ark-ui は見た目を持たないヘッドレスUIで、既定の `z-index` が無いため）。

## 一覧画面の表示

顧客・車両・案件・見積請求の一覧は、**項目ごとに列を分けた表**（`DataTable`）で出しています。
1行にまとめて書くより、列で揃っているほうが同じ項目を縦に見比べられるためです。
詳細画面の中にある小さな一覧は、件数が少なく列を揃える意味が薄いので `Row` のままです。

| 画面 | 列 |
|---|---|
| 顧客 | 顧客名（担当者名）／保有台数／電話番号／メール／住所 |
| 車両 | モデル名（車両番号）／メーカー／所有者／案件／車検期限 |
| 案件 | **番号**／案件名／ステータス／顧客・車両／担当者／作業予定／請求 |
| 見積・請求 | 種別／番号／タイトル／顧客・車両／金額（税込）／発行日 |

- **列見出しは `sticky` でカードの中に貼り付け**ています。中身だけがスクロールするので、
  下まで見ても「どの列が何か」が分からなくなりません。
- **列幅は指定せず、ブラウザの自動配分に任せています**。特定の列に `w-full` を付けると
  その列が余白を全部吸ってしまい、名前が短いときに大きな空白ができて不格好になりました。
  潰れると困る列にだけ `min-w-[10rem]` のように下限を決めています。
- **表の中だけ本文より一段小さい文字**（13px）にして、列が多くても収まるようにしています。
  それでも入らない狭い画面では、列を潰さず横スクロールさせます（`min-w-[44rem]`）。
- 車検期限は、60日以内なら赤太字にして案内漏れに気づけるようにしています。
### 番号（連番）の持ち方

顧客・車両・案件・見積請求は、**それぞれ一意な番号**を持ちます。主キーはUUIDですが、
UUIDは電話口で読み上げたり書類に書いたりできないため、人が扱う番号を別に持たせています。

| 対象 | 列 | 画面での呼び方 |
|---|---|---|
| 顧客 | `customers.customer_number` | 番号 |
| 車両 | `vehicles.manage_number` | 管理番号 |
| 案件 | `cases.case_number` | 番号 |
| 見積・請求 | `quotes.doc_number` | 番号 |
| 社員（マスタ） | `staff_profiles.staff_code` | 社員コード |

社員コードだけは、better-auth が発行する文字列IDが主キーのため `staff_profiles` 側に持ちます。
詳細情報が未入力でもコードは振られるよう、**アカウント作成時に空の詳細行を必ず作って**います
（`serial` は行ができた時点で採番されるため）。会社設定は全体で1件のみなので番号は持ちません。

- いずれも `serial`（自動採番）＋ `unique` 制約付きです。**採番と一意性をDBに任せる**ため、
  アプリ側で「次の番号」を数える必要がなく、同時に登録しても重複しません。
- 車両だけ `manage_number` という名前なのは、**`vehicle_number`（ナンバープレートの番号）が
  既にある**ためです。画面でも「管理番号」と「車両番号」で呼び分けています。
- 画面では6桁ゼロ埋め（`000123`）で表示し、一覧の先頭列に置いています。
  番号での絞り込みと並べ替えにも対応しています。

## 社員マスタと担当者

社員マスタは**ログインアカウントそのもの**です。ここに登録した人が、そのまま案件の担当者として
選べます。以前は「社員マスタ」と「担当者マスタ」を分けていましたが、同じ人を二重に登録する
手間しか生まなかったため統合しました。

- **案件は担当者の「名前」を保存**しており、社員マスタとは外部キーで結んでいません。
  退職や削除があっても、過去の案件に記録された担当者名を変えないためです。
- **退職日を入れた社員は、担当者の選択肢から外れます**。ただし過去の案件に残った名前はそのままで、
  その案件を編集したときも担当者が黙って空にならないよう、選択肢に
  「◯◯（社員マスタにありません）」として残します。
- 退職は在職フラグではなく**退職日**で持っています。「いつ辞めたか」も残したいためです。
- **年齢は保存せず、生年月日から表示のたびに計算**します（[staff.ts](src/lib/staff.ts)）。
  保存すると誕生日が来るたびにずれるためです。

### ログインしない社員

社員マスタは **ログインアカウント（`user`テーブル）そのもの**ですが、パスワードなどの認証情報は
別テーブル（`account`）に入るため、**認証情報を持たない社員**も登録できます。

- アルバイトなど、作業の担当にはなるがシステムを使わない人を名簿に載せられます
- 一覧には「ログイン不可」と表示され、編集画面でパスワードを設定すると
  そのままログインできるようになります（better-auth の `setUserPassword` が
  認証情報を新規作成するため）
- ダミーデータの3名（山田・高橋・小林）はこの形で登録しています

### 個人情報の扱い

社員の詳細情報には氏名・生年月日・住所・電話番号といった**個人情報**が入ります。

- 閲覧・編集できるのは **admin権限のみ**です（案件の担当者選択で使う「名前」だけは、
  一般ユーザーも取得できる別の関数から返しています）。
- 設定画面は `beforeLoad` でも admin を確認しており、**画面の読み込みが始まる前に**
  一般ユーザーをダッシュボードへ戻します。各サーバー関数側の確認と二重になりますが、
  入口で止めたほうが情報が一瞬でも表示される余地がなくなるためです。
- 詳細情報は better-auth が生成する `user` テーブルではなく、**別テーブル
  （`staff_profiles`）に分けています**。`user` テーブルは認証設定を変えるとCLIで作り直されるため、
  業務で使う項目をそこに足すと消えてしまうからです。
- **この練習用アプリには実在の従業員の情報を入れないでください。** 投入済みのデータは
  すべて架空のものです。実運用する場合は、保存期間と閲覧範囲を決めたうえで運用してください。

## マスタ管理の配置

設定（旧マスタ）は、以前はダッシュボード最下部のリンクからしか開けませんでした。
これだと会社設定を直して帳票を確認する、といった往復がしづらいため、**上部ナビの右側に常設**し、
ログアウトボタンの隣に置いています。

- 左側の顧客・車両・案件・見積請求は、実際の仕事の流れそのままの並びで「毎日使う業務」
- 右側の設定は「たまにしか使わない、自分と店舗の設定」

という役割の違いを、ナビ上の位置（左右）と区切り線で表現しています。admin以外のユーザーには
右側に「ログアウト」しか出ないため、権限による見え方の違いも自然に表現されます。

## 店舗紹介ページ（LP）について

`/lp` は、来店前のお客様に見せることを想定した集客用のページです。**掲載している店名・住所・
電話番号・料金・お客様の声はすべて架空のダミー**で、実在の店舗や個人とは関係ありません。

- 管理画面向けの上部ナビ（`AppShell`）は使わず、[lp.tsx](src/routes/lp.tsx)だけで完結させています。
  役割が違う（社内向け／お客様向け）ため、共通部品を無理に共有していません。
- 配色は管理画面と同じ`app.css`の`@theme`変数を使い、ダーク＋オレンジの世界観をそろえています。
- **写真素材を持たないため、画像ファイルは一切使っていません**。ロゴ・案内図・背景はすべて
  CSSの図形（`clip-path`・グラデーション・繰り返し背景）で作っています。
- ダッシュボードからは**別ウィンドウ（新しいタブ）で開きます**。管理画面とは配色も役割も違うため、
  作業中の画面を閉じずに確認できるようにしています。
- LPも他の画面と同じく**Basic認証の内側**にあります。練習用アプリを不特定多数に見せないための
  措置で、一般公開したい場合は[server.ts](src/server.ts)の`isAuthorized`で`/lp`を除外します。
  ただしその場合は`noindex`のまま公開されることに注意してください。

## 次に検討すること

1. メール通知の実装（Workersでは nodemailer が使えないため、Resend など HTTP API 型の
   サービスへの切り替えが前提）
3. 社内ダッシュボードのURLが決まったら、`trustedOrigins` とCookie共有設定を追加する
4. Docker（nginx・docker-mailserver・postgres・cloudflared）一式は停止済みだが、
   ロールバック用にリポジトリへ残してある。不要と判断できた時点で、関連ファイル
   （`docker-compose.yml` / `Dockerfile` / `nginx/` / `server.mjs`）ごと整理する
5. docker-mailserverから社外へ実際にメールを配信する必要が出た場合の、SPF/DKIM/PTRなどDNS設定
   （現状は社内限定の送信専用リレーとしてのみ動作します）
6. 以下は実務価値はあるものの規模が大きいため、必要になってから対応する方針で見送っている
   - 請求の入金消込（入金日・入金額の記録）
   - CSVエクスポート／インポート（会計ソフト連携・棚卸し用）
   - 期間で絞る詳細検索（車検期限が今月、終了予定日が今週、など）
   - 帳票のPDFをメールでそのまま顧客へ送る機能
   - 一覧のページネーション（現状は全件取得して画面側で絞り込む方針。件数が数千件規模に
     なってから対応すれば十分）
