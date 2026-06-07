# 04. Модель данных

Источник правды — **PostgreSQL 16**. **Redis** — для сессий, кэша, очередей и pub/sub (не источник правды). Ниже — логическая схема: таблицы, ключевые поля, связи, индексы. Имена — `snake_case`, первичные ключи — `uuid` (генерация на стороне БД), временные метки — `timestamptz`.

## ER-обзор (связи)

```
hotels 1───* rooms 1───* devices
hotels 1───* staff_users
rooms  1───* bookings *───1 guests
bookings 1───* orders 1───* order_items
bookings 1───* taxi_rides
bookings 1───* service_requests
bookings 1───* chat_threads 1───* chat_messages
bookings 1───* folio_entries        (начисления на счёт)
menu_categories 1───* menu_items 1───* menu_item_modifiers
shop_categories 1───* shop_items
info_pages, schedules, points_of_interest  (контент, по hotel_id, локализуемый)
```

## Таблицы

### Организация и устройства

**hotels**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| name | text | |
| timezone | text | напр. `Europe/Moscow` |
| default_locale | text | `ru` / `en` |
| address | jsonb | для точки подачи такси |
| settings | jsonb | флаги функций, валюта |
| created_at / updated_at | timestamptz | |

**rooms**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| hotel_id | uuid FK→hotels | |
| number | text | «305» |
| floor | int | |
| status | text | `free` / `occupied` / `cleaning` |
| Индекс | unique(hotel_id, number) | |

**devices** — конкретный TV, привязанный к номеру (провижининг)
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| hotel_id | uuid FK | |
| room_id | uuid FK→rooms | nullable до привязки |
| device_token | text unique | секрет устройства (хэш) |
| tizen_model | text | модель/год TV |
| capabilities | jsonb | напр. `{ "webrtc": false }` |
| last_seen_at | timestamptz | |
| status | text | `provisioned` / `active` / `revoked` |

### Гости и брони

**guests**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| full_name | text | |
| email | text | для счёта (PII — см. [08](./08-security-compliance.md)) |
| phone | text | для callback такси (PII) |
| locale | text | предпочитаемый язык |

**bookings**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| hotel_id | uuid FK | |
| room_id | uuid FK | |
| guest_id | uuid FK | |
| booking_code | text | код брони (для входа) |
| pin_hash | text | хэш PIN (bcrypt/argon2) |
| check_in | timestamptz | |
| check_out | timestamptz | |
| status | text | `reserved`/`checked_in`/`checked_out`/`cancelled` |
| total_amount | numeric(12,2) | кэш суммы (правда — сумма folio_entries) |
| Индекс | index(room_id, status), unique(hotel_id, booking_code) | |

### Сессии и аутентификация

> Активные сессии/refresh-токены храним в **Redis** (TTL), но журнал — в БД для аудита.

**auth_sessions** (аудит)
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| booking_id | uuid FK | |
| device_id | uuid FK | |
| issued_at | timestamptz | |
| revoked_at | timestamptz | при Check-out |
| ip / user_agent | text | |

### Меню и заказы еды

**menu_categories** (`id, hotel_id, sort, available_from, available_to, i18n jsonb{ru,en}`)

**menu_items**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| category_id | uuid FK | |
| price | numeric(12,2) | |
| currency | text | |
| image_url | text | |
| allergens | text[] | |
| is_available | bool | стоп-лист |
| i18n | jsonb | `{ru:{name,desc}, en:{...}}` |

**menu_item_modifiers** (`id, item_id FK, price_delta, i18n, group, required bool`)

**orders** (общая таблица для еды и магазина — поле `kind`)
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| booking_id | uuid FK | |
| room_id | uuid FK | |
| kind | text | `food` / `shop` |
| status | text | `new`/`accepted`/`cooking`/`delivering`/`done`/`cancelled` |
| total_amount | numeric(12,2) | пересчитан на сервере |
| payment_method | text | `room` / `online` |
| payment_status | text | `pending`/`charged`/`failed` |
| idempotency_key | text unique | защита от дублей |
| comment | text | |
| created_at | timestamptz | |
| Индекс | index(room_id, status), index(booking_id) | |

**order_items** (`id, order_id FK, item_ref uuid, name_snapshot, unit_price, qty, modifiers jsonb`)
> `*_snapshot`/`unit_price` фиксируют цену и название на момент заказа (цена в каталоге может измениться).

**order_status_history** (`id, order_id FK, status, changed_by, changed_at`)

### Магазин

**shop_categories** (`id, hotel_id, sort, i18n`)
**shop_items** (`id, category_id FK, price, currency, image_url, stock int, is_available, i18n`)
> Заказы магазина пишутся в общую таблицу `orders` с `kind='shop'`.

### Такси

**taxi_rides**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| booking_id | uuid FK | |
| room_id | uuid FK | |
| provider | text | `dispatch`/`aggregator`/`mock` |
| provider_ride_id | text | id у внешнего провайдера |
| pickup | jsonb | адрес/гео подачи |
| dropoff | jsonb | адрес назначения |
| car_class | text | |
| estimate_price | numeric(12,2) | |
| status | text | `requested`/`assigned`/`arrived`/`completed`/`cancelled` |
| idempotency_key | text unique | |

### Связь с персоналом

**chat_threads** (`id, booking_id FK, room_id FK, status open/closed, last_message_at`)
**chat_messages**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| thread_id | uuid FK | |
| sender_type | text | `guest` / `staff` |
| sender_id | uuid | guest_id или staff_user_id |
| body | text | |
| read_at | timestamptz | |
| created_at | timestamptz | |
| Индекс | index(thread_id, created_at) | |

**service_requests**
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| booking_id / room_id | uuid FK | |
| type | text | `cleaning`/`towels`/`technician`/`callback`/`dnd`/... |
| status | text | `new`/`in_progress`/`done`/`cancelled` |
| assigned_role | text | `reception`/`housekeeping`/`maintenance` |
| payload | jsonb | детали (напр. телефон для callback) |
| idempotency_key | text unique | |
| created_at | timestamptz | |

### Платежи / счёт

**folio_entries** — начисления на счёт номера (источник правды по сумме)
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| booking_id | uuid FK | |
| source | text | `food`/`shop`/`taxi`/`manual` |
| source_ref | uuid | id заказа/поездки |
| amount | numeric(12,2) | |
| currency | text | |
| description | text | |
| pms_sync_status | text | `pending`/`synced`/`failed` |
| created_at | timestamptz | |

**payments** (для онлайн-оплат через провайдер)
| Поле | Тип | Прим. |
|------|-----|-------|
| id | uuid PK | |
| order_id | uuid FK | |
| provider | text | |
| provider_payment_id | text | |
| amount | numeric(12,2) | |
| status | text | `pending`/`paid`/`failed`/`refunded` |
> **Данные карт не хранятся** — только идентификаторы транзакций провайдера (ADR-004).

### Персонал и контент

**staff_users** (`id, hotel_id FK, email unique, password_hash, role, is_active`)
> `role` ∈ `reception`/`kitchen`/`housekeeping`/`maintenance`/`admin` (RBAC — см. [08](./08-security-compliance.md)).

**info_pages** (`id, hotel_id, slug, i18n{title,body}, sort, published bool`)
**schedules** (`id, hotel_id, service text, i18n, time_rules jsonb`)
**points_of_interest** (`id, hotel_id, i18n{name,desc}, image_url, category, geo jsonb`)

**audit_log** (`id, actor_type, actor_id, action, entity, entity_id, meta jsonb, created_at`) — для безопасности и разбора инцидентов.

## Использование Redis

| Назначение | Ключи / структура | TTL |
|------------|-------------------|-----|
| Refresh-сессии | `session:{deviceId}` → JWT id, room_id | до Check-out / 30 дн |
| Кэш меню/каталога/инфо | `cache:menu:{hotelId}` (с версией/ETag) | инвалидация по событию |
| Очереди (BullMQ) | `queue:folio-sync`, `queue:email`, `queue:notify` | — |
| Pub/Sub реального времени | Socket.IO Redis-adapter | — |
| Антифрод/лимиты | `ratelimit:{ip}`, попытки PIN `pin-fail:{bookingId}` | минуты |

## Миграции и сиды

- Миграции — версионированные, в `infra/db/migrations` (один инструмент: например, Prisma Migrate / Knex / TypeORM-migrations — выбрать в Фазе 1).
- Сиды для разработки: демо-отель, 5 номеров, демо-меню/каталог, демо-контент, тестовые брони/PIN.
- Каждая миграция обратима (down) или имеет задокументированную причину необратимости.

## Принципы целостности

- **Деньги — `numeric`, не `float`.** Везде хранить валюту рядом с суммой.
- **Снимки цен** в `order_items` — заказ не меняется при изменении каталога.
- **Идемпотентность** мутаций через `idempotency_key` (unique).
- **Мягкое удаление** контента (флаг `published`/`deleted_at`), жёсткое — только для PII по запросу (152-ФЗ/GDPR).
- **Внешние ключи + индексы** на все часто запрашиваемые связи (`room_id`, `booking_id`, `status`).
