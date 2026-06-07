# 05. API: REST + WebSocket

Контракты между клиентами (TV-app, панель) и бэкендом. Источник правды для типов — `packages/shared-types` (TypeScript DTO), из которых генерируется и документация OpenAPI.

## Общие правила

- **База:** `https://api.<домен>/v1`. Версионирование в пути (`/v1`).
- **Формат:** JSON; даты — ISO-8601 UTC; деньги — `{ "amount": "12.50", "currency": "RUB" }` (строка, не float).
- **Авторизация:** заголовок `Authorization: Bearer <access_jwt>`. Провижининг устройства — отдельный поток (ниже).
- **Идемпотентность:** все мутации, создающие сущности (заказы, заявки), требуют заголовок `Idempotency-Key: <uuid>`. Повтор с тем же ключом возвращает первый результат, не создаёт дубль.
- **Локализация:** заголовок `Accept-Language: ru|en` (или поле `locale`).
- **Кэш:** GET-контент (меню, каталог, инфо) отдаёт `ETag`/`Cache-Control`; клиент шлёт `If-None-Match` → `304`.
- **Ошибки:** единый формат:
  ```json
  { "error": { "code": "ORDER_INVALID", "message": "…", "details": {…}, "traceId": "…" } }
  ```
- **Коды:** `200/201` ок, `304` не изменено, `400` валидация, `401` нет/просрочен токен, `403` нет прав, `404` нет, `409` конфликт/идемпотентность, `422` бизнес-правило, `429` лимит, `5xx` сервер.
- **Пагинация:** `?limit=&cursor=`; ответ `{ items, nextCursor }`.

---

## Аутентификация и провижининг

### Провижининг устройства (один раз, при установке)
```
POST /v1/devices/provision
Body: { "provisionCode": "HOTEL-SETUP-CODE", "tizenModel": "UE49...", "capabilities": {"webrtc": false} }
→ 201 { "deviceId", "deviceToken", "roomId" | null }
```
> `provisionCode` выдаётся персоналу/администратором (см. [06](./06-tizen.md)). Дальше устройство хранит `deviceToken` в защищённом хранилище Tizen.

### Привязка устройства к номеру (если не задано при провижининге)
```
POST /v1/devices/bind   (требует staff-токен или одноразовый код)
Body: { "deviceId", "roomNumber": "305" }
→ 200 { "roomId" }
```

### Вход гостя (на TV)
```
POST /v1/auth/login
Headers: X-Device-Token: <deviceToken>
Body: { "bookingCode": "ABC123" }  // или { "pin": "4821" }
→ 200 { "accessToken", "refreshToken", "expiresIn", "guest": {...}, "booking": {...} }
```

### Обновление токена
```
POST /v1/auth/refresh
Body: { "refreshToken" }
→ 200 { "accessToken", "expiresIn" }
```

### Вход персонала (панель)
```
POST /v1/auth/staff/login
Body: { "email", "password" }
→ 200 { "accessToken", "refreshToken", "user": { "role": "kitchen", ... } }
```

---

## Модуль 1 — Booking / Check-in-out

```
GET  /v1/booking/current
→ 200 { booking: { dates, guest, services, totalAmount }, room }

GET  /v1/booking/folio
→ 200 { entries: [ { source, description, amount } ], total }

POST /v1/booking/checkout
Body: { "email": "guest@x.com" }   // подтверждение/изменение email
→ 200 { "invoiceId", "status": "sent" }
```

---

## Модуль 2 — Food

```
GET  /v1/food/menu                 (ETag, кэшируемо)
→ 200 { categories: [ { id, name, items: [ { id, name, desc, price, allergens, image, modifiers } ] } ] }

POST /v1/orders                    (Idempotency-Key)
Body: {
  "kind": "food",
  "items": [ { "itemId", "qty", "modifierIds": [], "comment" } ],
  "paymentMethod": "room",         // room | online
  "comment": "без лука"
}
→ 201 { "orderId", "status": "new", "total": {amount,currency}, "paymentStatus": "charged|pending" }
// при online: { "paymentLink": "https://...", "qr": "data:image/png;base64,..." }

GET  /v1/orders/:id
→ 200 { order, statusHistory }

POST /v1/orders/:id/cancel         (если статус позволяет)
→ 200 { status: "cancelled" }
```

**Серверная логика заказа:** валидация доступности позиций → пересчёт суммы на сервере → создание `order` + `order_items` (снимки цен) → `folio_entry` (charge-to-room) или payment link → WS `order.created`.

---

## Модуль 3 — Taxi

```
POST /v1/taxi/estimate
Body: { "dropoff": { "address" | "geo" }, "carClass": "standard" }
→ 200 { "price": {amount,currency}, "etaPickupMin": 7, "provider": "dispatch" }

POST /v1/taxi/rides                 (Idempotency-Key)
Body: { "dropoff": {...}, "carClass": "standard" }
→ 201 { "rideId", "status": "requested" }
// fallback: { "rideId", "status": "requested", "mode": "dispatch", "message": "Заявка передана ресепшену" }

GET  /v1/taxi/rides/:id
→ 200 { ride: { status, car?: {model,plate,etaMin} } }

POST /v1/taxi/rides/:id/cancel
→ 200 { status: "cancelled" }
```

---

## Модуль 4 — Shop

```
GET  /v1/shop/catalog              (ETag, кэшируемо)
→ 200 { categories: [ { id, name, items: [ { id, name, price, stock, image } ] } ] }

POST /v1/orders                    // kind: "shop", тот же контракт, что и food
GET  /v1/orders?kind=shop          // история покупок за проживание
→ 200 { items: [ ...orders ], nextCursor }
```

---

## Модуль 5 — Chat / Service requests

REST (история и создание), реальное время — по WebSocket (ниже).
```
GET  /v1/chat/thread
→ 200 { threadId, messages: [ { sender, body, createdAt, readAt } ] }

POST /v1/chat/messages             (Idempotency-Key)
Body: { "body": "текст" }
→ 201 { messageId, createdAt }

POST /v1/service-requests          (Idempotency-Key)
Body: { "type": "towels" | "cleaning" | "technician" | "callback" | "dnd", "payload": {...} }
→ 201 { requestId, status: "new" }

GET  /v1/service-requests?status=open
→ 200 { items: [...] }
```

---

## Модуль 6 — Info (контент)

```
GET /v1/info/pages                 (ETag)            → 200 { pages: [ { slug, title, body } ] }
GET /v1/info/schedules             (ETag)            → 200 { schedules: [ { service, rules } ] }
GET /v1/info/poi                   (ETag)            → 200 { items: [ { name, desc, image, geo } ] }
```

---

## Admin / Staff (панель персонала)

```
# Заказы (кухня/хаускипинг)
GET   /v1/staff/orders?status=&kind=
PATCH /v1/staff/orders/:id/status     Body: { "status": "cooking" }

# Заявки
GET   /v1/staff/service-requests?role=&status=
PATCH /v1/staff/service-requests/:id  Body: { "status": "in_progress" }

# Чаты
GET   /v1/staff/threads?status=open
POST  /v1/staff/threads/:id/messages  Body: { "body": "..." }

# Статус номеров
GET   /v1/staff/rooms                 → { rooms: [ { number, status, checkout, openRequests } ] }

# Управление контентом (admin)
POST/PATCH/DELETE /v1/admin/menu/...   /v1/admin/shop/...   /v1/admin/info/...
POST/PATCH        /v1/admin/staff-users

# Аналитика (admin)
GET /v1/admin/analytics/summary       → { revenue, topItems, requestsByType, avgChatResponse }
```

Доступ к `/v1/staff/*` и `/v1/admin/*` — по роли (RBAC, см. [08](./08-security-compliance.md)).

---

## WebSocket (Socket.IO)

**Подключение:** `wss://api.<домен>` с `auth: { token: <accessJwt> }`.
**Комнаты:** гость автоматически в `room:{roomId}`; персонал — в `staff:{role}` и `hotel:{hotelId}`.

### События сервер → клиент

| Событие | Кому | Payload |
|---------|------|---------|
| `order.created` | `staff:kitchen` / `staff:housekeeping` | `{ orderId, kind, room, items, total }` |
| `order.updated` | `room:{id}` | `{ orderId, status }` |
| `taxi.updated` | `room:{id}` | `{ rideId, status, car? }` |
| `chat.message` | `room:{id}` / `staff:reception` | `{ threadId, message }` |
| `chat.read` | обе стороны | `{ threadId, messageId }` |
| `service_request.created` | соответствующая `staff:{role}` | `{ requestId, type, room }` |
| `service_request.updated` | `room:{id}` | `{ requestId, status }` |
| `presence` | `staff:*` | `{ roomId, online }` |

### События клиент → сервер

| Событие | От кого | Payload |
|---------|---------|---------|
| `chat.send` | гость/персонал | `{ threadId, body, idempotencyKey }` |
| `chat.typing` | обе стороны | `{ threadId }` |
| `chat.markRead` | обе стороны | `{ threadId, messageId }` |
| `order.updateStatus` | персонал | `{ orderId, status }` |

### WebRTC-сигнализация (опц., Tizen ≥ 5.5) — namespace `/voice`
| Событие | Payload |
|---------|---------|
| `call.invite` | `{ from, roomId }` |
| `call.offer` / `call.answer` | `{ sdp }` |
| `call.ice` | `{ candidate }` |
| `call.end` | `{ reason }` |

> STUN/TURN-конфиг отдаётся отдельным REST-эндпоинтом `GET /v1/voice/ice` (короткоживущие креды).

## Безопасность контрактов

- Все мутации — за `Authorization` + (для гостя) проверкой соответствия `room_id` токена и ресурса.
- Серверная валидация всех входных DTO (class-validator/zod); никогда не доверять суммам/ценам от клиента.
- Rate limiting на `auth/*`, `orders`, `service-requests`.
- Идемпотентность — на всех `POST`, создающих деньги/заявки.
