# 14. Полная схема БД (DDL)

Конкретный SQL для PostgreSQL 16 вместо прозаических таблиц из [04](./04-data-model.md). Это исполнимый референс для миграций. Соглашения: `uuid` PK (`gen_random_uuid()` из `pgcrypto`), `timestamptz`, деньги — `numeric(12,2)` + отдельная колонка валюты, `snake_case`, мягкое удаление `deleted_at` где уместно.

```sql
-- Расширения
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;       -- регистронезависимый email

-- ─────────────────────────────────────────────────────────────
-- Организация и устройства
-- ─────────────────────────────────────────────────────────────
CREATE TABLE hotels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  timezone        text        NOT NULL DEFAULT 'Europe/Moscow',
  default_locale  text        NOT NULL DEFAULT 'ru' CHECK (default_locale IN ('ru','en')),
  currency        text        NOT NULL DEFAULT 'RUB',
  address         jsonb       NOT NULL DEFAULT '{}',
  settings        jsonb       NOT NULL DEFAULT '{}',   -- флаги функций, integrations (см. doc 13)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  number     text NOT NULL,
  floor      int,
  status     text NOT NULL DEFAULT 'free' CHECK (status IN ('free','occupied','cleaning','ooo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, number)
);

CREATE TABLE devices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id        uuid REFERENCES rooms(id) ON DELETE SET NULL,
  device_token_hash text NOT NULL,            -- хэш секрета устройства (не сам токен)
  tizen_model    text,
  capabilities   jsonb NOT NULL DEFAULT '{}', -- {"webrtc": false, ...}
  status         text NOT NULL DEFAULT 'provisioned'
                  CHECK (status IN ('provisioned','active','revoked')),
  last_seen_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_token_hash)
);
CREATE INDEX idx_devices_room ON devices(room_id);
CREATE INDEX idx_devices_hotel ON devices(hotel_id);

-- ─────────────────────────────────────────────────────────────
-- Гости и брони
-- ─────────────────────────────────────────────────────────────
CREATE TABLE guests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  full_name  text,
  email      citext,                 -- PII
  phone      text,                   -- PII
  locale     text NOT NULL DEFAULT 'ru' CHECK (locale IN ('ru','en')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz             -- для удаления PII по запросу (152-ФЗ/GDPR)
);

CREATE TABLE bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id       uuid NOT NULL REFERENCES rooms(id),
  guest_id      uuid NOT NULL REFERENCES guests(id),
  pms_ref       text,               -- id резервации в PMS (если есть)
  booking_code  text NOT NULL,      -- код для входа гостя
  pin_hash      text,               -- argon2/bcrypt PIN
  check_in      timestamptz NOT NULL,
  check_out     timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'reserved'
                 CHECK (status IN ('reserved','checked_in','checked_out','cancelled')),
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,  -- кэш; правда — сумма folio_entries
  currency      text NOT NULL DEFAULT 'RUB',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, booking_code)
);
CREATE INDEX idx_bookings_room_status ON bookings(room_id, status);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);

-- Аудит сессий (активные refresh — в Redis; здесь журнал)
CREATE TABLE auth_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  device_id  uuid REFERENCES devices(id) ON DELETE SET NULL,
  staff_user_id uuid,               -- для сессий персонала
  issued_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip         inet,
  user_agent text
);
CREATE INDEX idx_sessions_booking ON auth_sessions(booking_id);

-- ─────────────────────────────────────────────────────────────
-- Меню (еда)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE menu_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  sort          int  NOT NULL DEFAULT 0,
  available_from time,             -- напр. завтрак 06:00
  available_to   time,             -- ...до 11:00 (NULL = круглосуточно)
  i18n          jsonb NOT NULL DEFAULT '{}',  -- {"ru":{"name":...},"en":{...}}
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  price        numeric(12,2) NOT NULL CHECK (price >= 0),
  currency     text NOT NULL DEFAULT 'RUB',
  image_url    text,
  allergens    text[] NOT NULL DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,   -- стоп-лист
  i18n         jsonb NOT NULL DEFAULT '{}',     -- {"ru":{"name","desc"},"en":{...}}
  sort         int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

CREATE TABLE menu_item_modifiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name  text NOT NULL,                 -- "Степень прожарки"
  price_delta numeric(12,2) NOT NULL DEFAULT 0,
  required    boolean NOT NULL DEFAULT false,
  i18n        jsonb NOT NULL DEFAULT '{}'
);

-- ─────────────────────────────────────────────────────────────
-- Магазин
-- ─────────────────────────────────────────────────────────────
CREATE TABLE shop_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id  uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  sort      int NOT NULL DEFAULT 0,
  i18n      jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE shop_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES shop_categories(id) ON DELETE CASCADE,
  price        numeric(12,2) NOT NULL CHECK (price >= 0),
  currency     text NOT NULL DEFAULT 'RUB',
  image_url    text,
  stock        int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_available boolean NOT NULL DEFAULT true,
  i18n         jsonb NOT NULL DEFAULT '{}',
  sort         int NOT NULL DEFAULT 0
);
CREATE INDEX idx_shop_items_category ON shop_items(category_id);

-- ─────────────────────────────────────────────────────────────
-- Заказы (еда и магазин — общая таблица, поле kind)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES hotels(id),
  booking_id      uuid NOT NULL REFERENCES bookings(id),
  room_id         uuid NOT NULL REFERENCES rooms(id),
  kind            text NOT NULL CHECK (kind IN ('food','shop')),
  status          text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','accepted','cooking','delivering','done','cancelled')),
  total_amount    numeric(12,2) NOT NULL,        -- пересчитан НА СЕРВЕРЕ
  currency        text NOT NULL DEFAULT 'RUB',
  payment_method  text NOT NULL DEFAULT 'room' CHECK (payment_method IN ('room','online')),
  payment_status  text NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending','charged','failed','refunded')),
  idempotency_key text NOT NULL,
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE INDEX idx_orders_room_status ON orders(room_id, status);
CREATE INDEX idx_orders_booking ON orders(booking_id);
CREATE INDEX idx_orders_kind_status ON orders(hotel_id, kind, status);

CREATE TABLE order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_ref      uuid NOT NULL,                  -- menu_items.id / shop_items.id
  name_snapshot text NOT NULL,                  -- фиксируем имя на момент заказа
  unit_price    numeric(12,2) NOT NULL,         -- фиксируем цену
  qty           int NOT NULL CHECK (qty > 0),
  modifiers     jsonb NOT NULL DEFAULT '[]'     -- [{name, priceDelta}]
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_status_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     text NOT NULL,
  changed_by uuid,                              -- staff_users.id или NULL (система)
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Такси
-- ─────────────────────────────────────────────────────────────
CREATE TABLE taxi_rides (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id),
  booking_id       uuid NOT NULL REFERENCES bookings(id),
  room_id          uuid NOT NULL REFERENCES rooms(id),
  provider         text NOT NULL,               -- yandex-b2b | dispatch | deeplink
  mode             text NOT NULL DEFAULT 'dispatch' CHECK (mode IN ('api','dispatch')),
  provider_ride_id text,
  pickup           jsonb NOT NULL,
  dropoff          jsonb NOT NULL,
  car_class        text NOT NULL DEFAULT 'standard',
  estimate_price   numeric(12,2),
  currency         text NOT NULL DEFAULT 'RUB',
  status           text NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','assigned','arrived','completed','cancelled')),
  car_info         jsonb,                        -- {model, plate, etaMin}
  idempotency_key  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE INDEX idx_taxi_room_status ON taxi_rides(room_id, status);

-- ─────────────────────────────────────────────────────────────
-- Связь: чат и сервис-запросы
-- ─────────────────────────────────────────────────────────────
CREATE TABLE chat_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES hotels(id),
  booking_id      uuid NOT NULL REFERENCES bookings(id),
  room_id         uuid NOT NULL REFERENCES rooms(id),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_threads_status ON chat_threads(hotel_id, status);

CREATE TABLE chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('guest','staff')),
  sender_id   uuid,
  body        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread_time ON chat_messages(thread_id, created_at);

CREATE TABLE service_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES hotels(id),
  booking_id      uuid NOT NULL REFERENCES bookings(id),
  room_id         uuid NOT NULL REFERENCES rooms(id),
  type            text NOT NULL                 -- cleaning|towels|technician|callback|dnd|taxi
                   CHECK (type IN ('cleaning','towels','technician','callback','dnd','taxi','other')),
  status          text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','in_progress','done','cancelled')),
  assigned_role   text CHECK (assigned_role IN ('reception','housekeeping','maintenance')),
  payload         jsonb NOT NULL DEFAULT '{}',  -- напр. телефон для callback
  idempotency_key text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE INDEX idx_requests_role_status ON service_requests(hotel_id, assigned_role, status);
CREATE INDEX idx_requests_room ON service_requests(room_id);

-- ─────────────────────────────────────────────────────────────
-- Платежи / счёт
-- ─────────────────────────────────────────────────────────────
CREATE TABLE folio_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  source          text NOT NULL CHECK (source IN ('food','shop','taxi','manual')),
  source_ref      uuid,                          -- order_id / ride_id
  amount          numeric(12,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'RUB',
  description     text NOT NULL,
  pms_sync_status text NOT NULL DEFAULT 'pending'
                   CHECK (pms_sync_status IN ('pending','synced','failed')),
  pms_folio_ref   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_folio_booking ON folio_entries(booking_id);
CREATE INDEX idx_folio_sync ON folio_entries(pms_sync_status) WHERE pms_sync_status <> 'synced';

CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            text NOT NULL,             -- yookassa | stripe | ...
  provider_payment_id text,
  amount              numeric(12,2) NOT NULL,
  currency            text NOT NULL DEFAULT 'RUB',
  status              text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','paid','failed','refunded')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
  -- ВАЖНО: данные карт НЕ хранятся (PCI SAQ-A)
);

-- ─────────────────────────────────────────────────────────────
-- Персонал и контент
-- ─────────────────────────────────────────────────────────────
CREATE TABLE staff_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  email         citext NOT NULL,
  password_hash text NOT NULL,                   -- argon2id
  full_name     text,
  role          text NOT NULL CHECK (role IN
                  ('reception','kitchen','housekeeping','maintenance','admin')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, email)
);

CREATE TABLE info_pages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id  uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  slug      text NOT NULL,
  i18n      jsonb NOT NULL DEFAULT '{}',         -- {"ru":{"title","body"},"en":{...}}
  sort      int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  UNIQUE (hotel_id, slug)
);

CREATE TABLE schedules (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  service  text NOT NULL,                        -- restaurant|pool|spa|gym
  i18n     jsonb NOT NULL DEFAULT '{}',
  time_rules jsonb NOT NULL DEFAULT '[]'         -- [{days:[1..7], from, to}]
);

CREATE TABLE points_of_interest (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id  uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category  text NOT NULL DEFAULT 'attraction',  -- attraction|destination|excursion
  i18n      jsonb NOT NULL DEFAULT '{}',
  image_url text,
  geo       jsonb,                               -- {lat, lon}
  sort      int NOT NULL DEFAULT 0
);

-- Аудит безопасности
CREATE TABLE audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   uuid REFERENCES hotels(id) ON DELETE SET NULL,
  actor_type text NOT NULL,                      -- guest|staff|system
  actor_id   uuid,
  action     text NOT NULL,                      -- login|charge|content.update|pii.delete...
  entity     text,
  entity_id  uuid,
  meta       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_hotel_time ON audit_log(hotel_id, created_at);

-- Идемпотентность (общая таблица ключей, альтернатива UNIQUE на каждой)
CREATE TABLE idempotency_keys (
  key        text PRIMARY KEY,
  scope      text NOT NULL,                      -- 'orders' | 'service_requests' | ...
  response   jsonb,                              -- закэшированный ответ
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Триггеры/правила целостности (рекомендации)

- `updated_at` — триггер `BEFORE UPDATE` на `hotels` (и др. изменяемых).
- `bookings.total_amount` — пересчитывать из `folio_entries` (материализованно/по событию), не доверять клиенту.
- Запрет перехода статусов «назад» в `orders`/`taxi_rides` — на уровне сервиса (или CHECK/триггер).
- Партиционирование `chat_messages`/`audit_log` по времени — при росте объёма (позже).

## Миграции
- Инструмент: один из Prisma Migrate / Knex / node-pg-migrate (выбор в Фазе 1).
- Каждая миграция — `up`/`down`; продакшен — только expand/contract (без ломающих изменений на лету).
- Сиды для dev — демо-отель, 5 номеров, меню (3 категории × 4 блюда), магазин (2×4), контент, 2 брони с PIN, 4 staff-аккаунта (по ролям).
