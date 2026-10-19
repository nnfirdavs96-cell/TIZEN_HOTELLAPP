#!/bin/sh
set -e

echo "[entrypoint] Применяю миграции БД..."
# Postgres может подниматься чуть дольше — короткий ретрай.
pnpm --filter api migration:run || (echo "[entrypoint] retry через 5с..." && sleep 5 && pnpm --filter api migration:run)

echo "[entrypoint] Сидирую начальные данные (идемпотентно)..."
pnpm --filter api db:seed || true

echo "[entrypoint] Запускаю API..."
exec node apps/api/dist/main.js
