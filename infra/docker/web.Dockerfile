# TV web image — сборка статики tv-app + раздача через nginx.
FROM node:22-slim AS build

WORKDIR /app
RUN corepack enable

# В Этапе 1 приложение работает в mock-режиме (демо-креды).
# В Этапе 2 переключается на реальный API: VITE_USE_MOCKS=false
# (API вызывается same-origin, nginx проксирует /v1 → api).
ARG VITE_USE_MOCKS=true
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/tv-app/package.json ./apps/tv-app/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

COPY packages/shared-types ./packages/shared-types
COPY apps/tv-app ./apps/tv-app

RUN pnpm --filter tv-app build

# --- Раздача ---
FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/tv-app/dist /usr/share/nginx/html
EXPOSE 8080
