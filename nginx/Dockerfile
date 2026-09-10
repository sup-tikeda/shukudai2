# syntax=docker/dockerfile:1

# Basic認証用のhtpasswdファイルを環境変数から生成するため、
# 素のnginxイメージに apache2-utils（htpasswdコマンド）だけ追加する。
FROM nginx:1.27-alpine

RUN apk add --no-cache apache2-utils

# 公式nginxイメージは、起動時に /docker-entrypoint.d/ 以下の実行可能スクリプトを
# 番号順に自動実行する（envsubstより前に走らせたいので若い番号にする）。
COPY generate-htpasswd.sh /docker-entrypoint.d/10-generate-htpasswd.sh
RUN chmod +x /docker-entrypoint.d/10-generate-htpasswd.sh
