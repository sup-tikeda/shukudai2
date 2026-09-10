# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# 貸出日の「今日」がサーバーとブラウザでずれないよう日本時間に固定する
ENV TZ=Asia/Tokyo
# alpine には tzdata が入っておらず、これが無いと TZ の指定が無視されてUTCになる
RUN apk add --no-cache tzdata
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# アプリ本体。ビルド済みの { fetch } ハンドラを server.mjs で待ち受ける。
FROM base AS app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts tsconfig.json server.mjs ./
# マイグレーション(drizzle-kit)・シード投入・アカウント発行(better-auth CLI)が
# スキーマ定義と認証設定のソースを読むため、src も含める
COPY src ./src
EXPOSE 3000
CMD ["node", "server.mjs"]
