#!/bin/sh
# BASIC_AUTH_USER / BASIC_AUTH_PASSWORD（.env経由の環境変数）から
# Basic認証用のhtpasswdファイルをコンテナ起動時に生成する。
# パスワードをGitやイメージに焼き込まないため、必ずここで動的に作る。
set -eu

if [ -z "${BASIC_AUTH_USER:-}" ] || [ -z "${BASIC_AUTH_PASSWORD:-}" ]; then
  echo "警告: BASIC_AUTH_USER/BASIC_AUTH_PASSWORD が未設定のため、Basic認証は無効化されません（起動を中断します）。" >&2
  exit 1
fi

htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD"
