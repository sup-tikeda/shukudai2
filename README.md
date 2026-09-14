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
- マスタ管理（`/master`。admin権限のみ）
  - 社員マスタ：ログインアカウントの新規作成・編集（名前・アカウント名・権限・パスワード）・削除
  - 会社設定：見積・請求書に印字する自社情報と既定の消費税率（全体で1レコードのみ）
- 問い合わせフォーム → 担当者へメール通知（`/contact`。DBには保存しません）

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
│   ├── master.tsx            # マスタ管理（社員・会社設定。要admin）
│   ├── login.tsx             # ログイン
│   ├── contact.tsx           # 問い合わせフォーム
│   └── api/auth/$.ts        # better-auth のHTTPハンドラ
├── server/
│   ├── customers.ts        # サーバー関数（顧客のCRUD）
│   ├── vehicles.ts         # サーバー関数（車両のCRUD、所有者名・案件数を結合）
│   ├── cases.ts            # サーバー関数（案件のCRUD、車両名・顧客名を結合）
│   ├── quotes.ts           # サーバー関数（見積・請求＋明細項目のCRUD、集計計算）
│   ├── shopSettings.ts     # サーバー関数（会社設定の取得・更新、admin専用）
│   ├── accounts.ts         # サーバー関数（社員=ログインアカウントのCRUD、admin専用）
│   ├── session.ts          # ダッシュボード用のログイン中ユーザー取得
│   ├── authGuard.ts        # ログイン必須／admin権限チェックの共通処理
│   └── inquiries.ts        # サーバー関数（問い合わせのメール通知）
├── components/ui/
│   ├── form.tsx            # 入力欄・ボタン・モーダル（ark-ui + tailwind-variants）
│   └── layout.tsx          # 画面の骨組み（上部ナビ・カード・一覧の行・バッジ・数値タイル）
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

## 画面デザインの方針

整備工場をイメージした**ダークテーマ＋オレンジのアクセント**で統一しています。

- **配色は[app.css](src/styles/app.css)の`@theme`に集約**。`shell`（最も奥の背景）／`surface`（カード）／
  `surface-raised`（ホバー・入れ子）／`line`（罫線）／`ink`系（文字）／`accent`（オレンジ）という
  **役割で名前を付けている**ため、配色を変えたい時はこのファイルだけを直せば全画面に反映されます。
  画面側では`bg-surface`・`text-ink-muted`のように役割名で参照し、`slate-700`のような具体色は書きません。
- **アクセント（オレンジ）は「今いちばん押してほしいもの」にだけ使う**。主操作ボタン、選択中のナビ、
  税込合計、作業中ステータスなど。多用すると効かなくなるため、副操作は`outline`／`ghost`にしています。
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

## 次に検討すること

1. 見積・請求のPDF出力・印刷画面（元のFileMakerには存在したが、今回は未実装）
2. メール通知の実装（Workersでは nodemailer が使えないため、Resend など HTTP API 型の
   サービスへの切り替えが前提）
3. 社内ダッシュボードのURLが決まったら、`trustedOrigins` とCookie共有設定を追加する
4. Docker（nginx・docker-mailserver・postgres・cloudflared）一式は停止済みだが、
   ロールバック用にリポジトリへ残してある。不要と判断できた時点で、関連ファイル
   （`docker-compose.yml` / `Dockerfile` / `nginx/` / `server.mjs`）ごと整理する
5. docker-mailserverから社外へ実際にメールを配信する必要が出た場合の、SPF/DKIM/PTRなどDNS設定
   （現状は社内限定の送信専用リレーとしてのみ動作します）
