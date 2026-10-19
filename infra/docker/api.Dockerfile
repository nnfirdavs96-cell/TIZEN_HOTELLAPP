# API image — NestJS (shared-types импортируется как type-only, рантайм без .ts).
FROM node:22-slim

WORKDIR /app
RUN corepack enable

# Манифесты для кэшируемой установки зависимостей
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

# Исходники
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN pnpm --filter api build

COPY infra/docker/entrypoint-api.sh /entrypoint-api.sh
RUN chmod +x /entrypoint-api.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint-api.sh"]
