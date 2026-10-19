#!/usr/bin/env bash
# Деплой/обновление стека на домашнем сервере (Debian).
# Использование:
#   ./infra/deploy.sh          — обновить код и пересобрать (Этап 1, mock-режим)
#   VITE_USE_MOCKS=false ./infra/deploy.sh   — собрать с реальным API (Этап 2)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.yml"

cd "$REPO_ROOT"

echo "==> Подтягиваю свежий код (git pull)..."
git pull --ff-only || echo "(!) git pull пропущен — проверь ветку вручную"

echo "==> Пересобираю и поднимаю стек..."
docker compose -f "$COMPOSE_FILE" up -d --build

echo "==> Статус контейнеров:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Готово. Проверь:"
echo "  API:  curl http://localhost:3000/v1/health"
echo "  WEB:  открой http://<IP-сервера>:8080 в браузере"
