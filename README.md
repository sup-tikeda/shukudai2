# 社内備品 貸出リスト

TanStack Start + Vite / ark-ui / Tailwind CSS + Tailwind Variants / zod / better-auth / drizzle-orm /
PostgreSQL / Vitest 構成の社内向けアプリです。PostgreSQL は Docker で起動します。
アプリをコンテナで動かす場合は、nginx（リバースプロキシ）経由でアクセスし、
問い合わせ通知メールは docker-mailserver（社内限定の送信専用リレー）経由で送信します。

## 現在のスコープ

- ログイン（アカウント名／パスワード。自己登録は不可で、初期アカウントはCLIで発行）
- ログイン後のダッシュボード（`/`）から各画面へ遷移
- 備品の貸出登録（備品名・借りた人・貸出日）、貸出中の一覧表示と「返却」（`/loans`）
- マスタ管理（`/master`。admin権限のみ）
  - 社員マスタ：ログインアカウントの新規作成・編集（名前・アカウント名・権限・パスワード）・削除
  - 備品マスタ：備品名の新規作成・編集・削除（貸出登録フォームとはまだ連動していません）
- 問い合わせフォーム → 担当者へメール通知（`/contact`。DBには保存しません）

貸出データは PostgreSQL に保存されるため、ログインできる人全員が同じ一覧を見ます。
「返却」を押した行は一覧から消えますが、レコードは削除せず `returned_at` に日時を入れて履歴として残します。

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
cp .env.example .env          # 値を自分の環境に合わせて編集する
docker compose up -d postgres # PostgreSQL を起動
pnpm db:migrate               # テーブルを作成
pnpm db:seed                  # 動作確認用のダミーデータ3件を投入（任意）
```

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
docker compose up -d --build  # postgres + app + nginx + mailserver
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

## 外部公開する前のセキュリティ対応

Cloudflare Tunnelでインターネットから到達可能にする前に、以下を行っている。

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
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | docker compose が作る PostgreSQL の初期設定 |
| `POSTGRES_PORT` | ホスト側の公開ポート（既定 5433。5432 は既存のローカル PostgreSQL と衝突するため） |
| `DATABASE_URL` | ホストから接続する際の接続先。`pnpm dev` / `db:migrate` / `db:seed` が使う |
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
├── routes/               # ファイルベースルーティング
│   ├── __root.tsx         # HTMLドキュメント全体の枠
│   ├── index.tsx          # ダッシュボード（要ログイン。各画面への入口）
│   ├── loans.tsx          # 備品貸出リスト（要ログイン）
│   ├── master.tsx         # マスタ管理（社員・備品。要admin）
│   ├── login.tsx          # ログイン
│   ├── contact.tsx        # 問い合わせフォーム
│   └── api/auth/$.ts      # better-auth のHTTPハンドラ
├── server/
│   ├── loans.ts          # サーバー関数（一覧・登録・返却）
│   ├── accounts.ts       # サーバー関数（社員=ログインアカウントのCRUD、admin専用）
│   ├── equipmentItems.ts # サーバー関数（備品マスタのCRUD、admin専用）
│   ├── session.ts        # ダッシュボード用のログイン中ユーザー取得
│   ├── authGuard.ts      # admin権限チェックの共通処理
│   └── inquiries.ts      # サーバー関数（問い合わせのメール通知）
├── components/ui/        # ark-ui + tailwind-variants の共通部品（Modalを含む）
├── lib/                  # auth / db / mailer / env / zodスキーマ
├── db/                   # drizzleスキーマ・マイグレーション・シード
└── styles/app.css        # Tailwind エントリ

nginx/
└── default.conf          # アプリへのリバースプロキシ設定
```

`src/db/auth-schema.ts` と `src/routeTree.gen.ts` は自動生成ファイルです。手で編集しないでください。

## 実装上の注意点

- **ログインの判定はサーバー側で行う**。`src/server/loans.ts` の `requireSession()` を各サーバー関数の
  先頭で呼び、未ログインなら `/login` へリダイレクトします。画面側の表示制御だけに頼っていません。
- **`server.mjs` はアプリ本体を動的importで読み込む**。アプリは読み込んだ時点で環境変数を検証するため、
  静的importにすると `.env` の読み込みより先に評価されて起動に失敗します。
- **コンテナのタイムゾーンを `Asia/Tokyo` に固定している**。貸出日の初期値（今日）がサーバーと
  ブラウザでずれないようにするためです。alpine は `tzdata` を入れないと `TZ` の指定が無視されます。
- **返却は「未返却のものだけ」を対象に更新する**。二重に押しても、他の人が先に返却していても
  エラーにならず、一覧を読み直せば消えています。
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

## 次に検討すること

1. 返却済みを含む貸出履歴の閲覧・検索画面
2. HTTPS 対応（nginxでTLSを終端する。証明書の用意とnginx設定の追記が必要。
   `Host` ヘッダはポート番号を含めて渡すこと。`$host` を使うとサーバー関数のCSRF検証が403になります）
3. 社内ダッシュボードのURLが決まったら、`trustedOrigins` とCookie共有設定を追加する
4. docker-mailserverから社外へ実際にメールを配信する必要が出た場合の、SPF/DKIM/PTRなどDNS設定
   （現状は社内限定の送信専用リレーとしてのみ動作します）
