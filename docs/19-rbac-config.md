# 19. RBAC, конфигурация и переменные окружения

## Роли и матрица доступа (RBAC)

Пять ролей персонала. Гость — отдельный субъект (доступ только к ресурсам своей брони/номера).

| Действие / ресурс | guest | reception | kitchen | housekeeping | maintenance | admin |
|-------------------|:-----:|:---------:|:-------:|:------------:|:-----------:|:-----:|
| Свои заказы (создать/смотреть) | ✅ | — | — | — | — | — |
| Чужой номер (любой ресурс) | ❌ | ✅ | — | — | — | ✅ |
| Заказы еды: смотреть | своё | ✅ | ✅ | — | — | ✅ |
| Заказы еды: менять статус | — | ✅ | ✅ | — | — | ✅ |
| Заказы магазина: статус | — | ✅ | — | ✅ | — | ✅ |
| Чат с гостем | своё | ✅ | — | — | — | ✅ |
| Заявки: уборка/полотенца | создать | ✅ | — | ✅ | — | ✅ |
| Заявки: техник | создать | ✅ | — | — | ✅ | ✅ |
| Заявки такси (dispatch) | создать | ✅ | — | — | — | ✅ |
| Статус номеров | — | ✅ | — | ✅ | — | ✅ |
| Контент (меню/магазин/инфо) | — | — | — | — | — | ✅ |
| Цены / стоп-лист / остатки | — | — | стоп-лист(food)¹ | остатки(shop)¹ | — | ✅ |
| Пользователи персонала | — | — | — | — | — | ✅ |
| Аналитика | — | частично² | — | — | — | ✅ |
| Настройки отеля / интеграции | — | — | — | — | — | ✅ |

¹ Опционально: кухне можно дать переключение стоп-листа блюд, хаускипингу — остатки магазина (настраивается).
² Ресепшену — операционные показатели (открытые заявки, время ответа), без финансов.

**Реализация:**
- Роль — в JWT персонала; guard на каждом `/v1/staff/*` и `/v1/admin/*`.
- Для гостя — middleware сверяет `room_id`/`booking_id` токена с ресурсом (нельзя читать чужой номер → 403).
- Принцип наименьших привилегий; чувствительные действия → `audit_log`.
- Мультитенантность: всё фильтруется по `hotel_id` из токена (персонал не видит другие отели).

---

## Переменные окружения (полный реестр)

### API (`apps/api`)
| Переменная | Назначение | Пример / дефолт |
|------------|-----------|-----------------|
| `NODE_ENV` | окружение | `development`/`production` |
| `PORT` | порт API | `4000` |
| `JWT_SECRET` | подпись JWT (секрет!) | — (из секрет-менеджера) |
| `JWT_ACCESS_TTL` | TTL access, сек | `900` |
| `JWT_REFRESH_TTL` | TTL refresh, сек | `2592000` |
| `STORE_DRIVER` | хранилище | `postgres` (`memory` для dev) |
| `DATABASE_URL` | подключение PG | `postgres://...` |
| `REDIS_URL` | подключение Redis | `redis://...` |
| `CORS_ORIGINS` | разрешённые origin | `https://panel...,http://localhost:5173` |
| `RATE_LIMIT_*` | лимиты | напр. `RATE_LIMIT_AUTH=10/min` |
| `PMS_PROVIDER` | адаптер PMS | `manual`/`opera-fias`/`opera-ohip` |
| `PMS_*` | доступы PMS | по провайдеру |
| `PAYMENT_PROVIDER` | онлайн-оплата | `yookassa`/`stripe`/`off` |
| `PAYMENT_API_KEY` / `PAYMENT_WEBHOOK_SECRET` | ключи (секрет!) | — |
| `TAXI_PROVIDER` | адаптер такси | `dispatch`/`yandex-b2b` |
| `TAXI_*` | доступы такси | по провайдеру |
| `EMAIL_PROVIDER` | email | `smtp`/`sendgrid` |
| `SMTP_*` / `EMAIL_API_KEY` | доступы email | — |
| `TURN_URL` / `TURN_SECRET` | WebRTC TURN | — (если VoIP) |
| `SENTRY_DSN` | трекинг ошибок | — |
| `LOG_LEVEL` | уровень логов | `info` |

### TV-app / Panel (Vite, префикс `VITE_`)
| Переменная | Назначение |
|------------|-----------|
| `VITE_API_URL` | базовый URL API |
| `VITE_WS_URL` | URL WebSocket |
| `VITE_DEFAULT_LOCALE` | язык по умолчанию |

**Правила:** секреты — только в секрет-менеджере/CI-secrets, в git лишь `.env.example`; разные значения на dev/staging/prod; в `production` `STORE_DRIVER≠memory` и нет `mock`-адаптеров (проверка на старте).

---

## Конфигурация отеля (feature flags)

`hotels.settings` (JSONB) — что включено для конкретного отеля. Позволяет продавать модули по отдельности и адаптироваться под отсутствие интеграций.

```json
{
  "features": {
    "food": true, "shop": true, "taxi": true,
    "chat": true, "voice": false, "info": true,
    "onlinePayment": false
  },
  "integrations": {
    "pms":     { "provider": "manual", "transactionCodes": { "food":"RMS","shop":"SHOP","taxi":"TAXI" } },
    "payment": { "online": { "provider": "yookassa", "enabled": false } },
    "taxi":    { "provider": "dispatch" },
    "notify":  { "email": { "provider": "smtp" }, "sms": { "enabled": false } },
    "maps":    { "provider": "yandex", "enabled": true }
  },
  "branding": { "name": "Отель «Пример»", "logoUrl": "...", "primaryColor": "#1b4965" },
  "locales": ["ru","en"],
  "checkout": { "csatSurvey": true }
}
```
- TV-app запрашивает конфиг отеля при старте и **скрывает выключенные модули** (плитки на S2).
- Изменение флагов — в админ-панели, без релиза приложения.
