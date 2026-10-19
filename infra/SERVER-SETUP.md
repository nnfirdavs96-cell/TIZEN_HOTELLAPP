# Серверный стек на домашнем Debian

Поднимает весь backend + раздачу ТВ-приложения одной командой.
После этого ТВ грузит приложение **с сервера** — обновления без переустановки `.wgt`.

```
┌─────────────┐   http://<IP>:8080    ┌──────────────── Debian-сервер ────────────────┐
│ Samsung TV   │ ────────────────────▶ │  nginx (web)  →  статика tv-app               │
│ (.wgt-shell) │                       │     │  /v1/* проксируется ↓                   │
└─────────────┘                       │  api (NestJS :3000) ── postgres ── redis      │
                                       └───────────────────────────────────────────────┘
```

---

## 1. Установить Docker (один раз)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # чтобы запускать docker без sudo
# ПЕРЕЗАЙДИ в сессию (logout/login), чтобы группа применилась
```

Проверка: `docker --version` и `docker compose version` отвечают.

---

## 2. Зафиксировать локальный IP сервера (важно!)

Чтобы адрес в оболочке `.wgt` не «уплывал» после перезагрузки роутера:

1. Узнай MAC и текущий IP сервера:
   ```bash
   ip addr    # ищи inet 192.168.x.x и link/ether (MAC)
   ```
2. В настройках роутера → **DHCP → резервирование адреса** закрепи этот IP за MAC сервера.

Запиши IP (вида `192.168.x.x`) — он понадобится для оболочки `.wgt` (Этап 2).

---

## 3. Забрать репозиторий

```bash
git clone https://github.com/nnfirdavs96-cell/TIZEN_HOTELLAPP.git
cd TIZEN_HOTELLAPP
```

---

## 4. Поднять стек

```bash
# (опционально) свои секреты JWT:
export JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

docker compose -f infra/docker/docker-compose.yml up -d --build
```

Первая сборка — несколько минут (качает образы, ставит зависимости).
API сам применит миграции и засидит демо-бронь (идемпотентно).

### Проверка

```bash
curl http://localhost:3000/v1/health
# → {"status":"ok","time":"..."}
```

В браузере с любого устройства в той же сети открой `http://<IP-сервера>:8080` —
увидишь экран Lock приложения.

---

## 5. Порты

| Порт | Что |
|------|-----|
| `8080` | Веб-приложение ТВ (сюда смотрит оболочка `.wgt`) |
| `3000` | API (`/v1/...`), в т.ч. `/v1/health` |

Postgres и Redis наружу не открыты — только внутри docker-сети.

---

## Обновление кода (ради чего всё затевалось)

Поменял код локально → запушил → **на сервере**:

```bash
cd TIZEN_HOTELLAPP
./infra/deploy.sh          # git pull + пересборка + перезапуск
```

ТВ подхватит новую версию при следующем запуске приложения.
**Переустанавливать `.wgt` не нужно.**

---

## Режимы приложения

- **Этап 1 (сейчас, по умолчанию):** mock-режим — вход по демо-кредам
  `ABC123` / PIN `4821`, данные из моков. Проверяем, что вся цепочка работает.
- **Этап 2:** реальный API. Пересобрать web с флагом:
  ```bash
  VITE_USE_MOCKS=false docker compose -f infra/docker/docker-compose.yml up -d --build web
  ```
  Тогда приложение ходит в API (same-origin, nginx проксирует `/v1`).
  Понадобится провижининг устройства — добавим в Этапе 2.

---

## Полезные команды

```bash
# логи
docker compose -f infra/docker/docker-compose.yml logs -f api
docker compose -f infra/docker/docker-compose.yml logs -f web

# остановить / запустить
docker compose -f infra/docker/docker-compose.yml down
docker compose -f infra/docker/docker-compose.yml up -d

# пересобрать только web (после правок tv-app)
docker compose -f infra/docker/docker-compose.yml up -d --build web

# сбросить БД полностью (удалит данные!)
docker compose -f infra/docker/docker-compose.yml down -v
```

---

## Частые проблемы

| Симптом | Решение |
|---------|---------|
| `docker: permission denied` | Не перезашёл после `usermod -aG docker` — logout/login |
| `curl :3000/v1/health` не отвечает | `docker compose ... logs api` — скорее всего ждёт Postgres; подожди 10–20с |
| С другого устройства `:8080` не открывается | Фаервол сервера (`sudo ufw allow 8080`, `sudo ufw allow 3000`); проверь что в одной сети |
| После рестарта роутера ТВ не грузит | IP сервера сменился — закрепи его (шаг 2) |
| Хочу чистую БД | `down -v` затем `up -d --build` |
