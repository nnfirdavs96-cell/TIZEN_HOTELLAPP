# 15. Полный справочник API

Исчерпывающий референс к [05](./05-api.md): каждый эндпоинт с полным телом запроса/ответа, кодами ошибок и примерами. База: `https://api.<домен>/v1`. Все примеры — реальные формы payload.

## Общие заголовки

| Заголовок | Когда | Пример |
|-----------|-------|--------|
| `Authorization` | защищённые эндпоинты | `Bearer eyJhbGci...` |
| `X-Device-Token` | вход гостя | `dt_8f3a...` |
| `Idempotency-Key` | все POST, создающие сущности | `a1b2c3d4-...` (uuid) |
| `Accept-Language` | локализация | `ru` / `en` |
| `If-None-Match` | кэшируемые GET | `"v42"` |

## Каталог ошибок

| HTTP | code | Когда |
|------|------|-------|
| 400 | `VALIDATION_ERROR` | невалидное тело/параметры |
| 401 | `UNAUTHENTICATED` | нет/просрочен токен |
| 401 | `INVALID_CREDENTIALS` | неверный PIN/код/пароль |
| 403 | `FORBIDDEN` | нет прав (роль/чужой номер) |
| 404 | `NOT_FOUND` | ресурс не найден |
| 409 | `IDEMPOTENCY_CONFLICT` | тот же ключ, другое тело |
| 409 | `INVALID_STATE_TRANSITION` | недопустимая смена статуса |
| 422 | `BUSINESS_RULE` | нарушено бизнес-правило (стоп-лист, нет на складе) |
| 423 | `PIN_LOCKED` | превышен лимит попыток PIN |
| 429 | `RATE_LIMITED` | слишком много запросов |
| 500 | `INTERNAL` | ошибка сервера |
| 502 | `UPSTREAM_ERROR` | сбой внешнего провайдера (PMS/платёж/такси) |

Формат тела ошибки:
```json
{ "error": { "code": "BUSINESS_RULE", "message": "Позиция недоступна (стоп-лист)",
             "details": { "itemId": "..." }, "traceId": "b7c1..." } }
```

---

## Auth & провижининг

### `POST /v1/devices/provision`
Запрос:
```json
{ "provisionCode": "HOTEL-7F3A-SETUP", "tizenModel": "UE49NU7100", "capabilities": { "webrtc": false } }
```
Ответ `201`:
```json
{ "deviceId": "d_91...", "deviceToken": "dt_8f3a2b...", "roomId": null }
```

### `POST /v1/devices/bind` (staff)
```json
// req
{ "deviceId": "d_91...", "roomNumber": "305" }
// res 200
{ "roomId": "r_55..." }
```

### `POST /v1/auth/login` (гость)
Заголовок `X-Device-Token: dt_...`
```json
// req (вариант A — код брони)
{ "bookingCode": "ABC123" }
// req (вариант B — PIN)
{ "pin": "4821" }
// res 200
{
  "accessToken": "eyJ...", "refreshToken": "rt_...", "expiresIn": 900,
  "guest": { "id": "g_1", "fullName": "Иван Петров", "locale": "ru" },
  "booking": { "id": "b_1", "checkIn": "2026-06-05T14:00:00Z",
               "checkOut": "2026-06-09T12:00:00Z", "room": { "number": "305" } }
}
// res 401 INVALID_CREDENTIALS / 423 PIN_LOCKED
```

### `POST /v1/auth/refresh`
```json
{ "refreshToken": "rt_..." }  →  { "accessToken": "eyJ...", "expiresIn": 900 }
```

### `POST /v1/auth/staff/login`
```json
{ "email": "chef@hotel.com", "password": "..." }
→ { "accessToken": "eyJ...", "refreshToken": "rt_...",
    "user": { "id": "s_2", "role": "kitchen", "fullName": "Анна" } }
```

---

## Booking / Check-out

### `GET /v1/booking/current`
```json
// res 200
{
  "booking": { "id": "b_1", "checkIn": "...", "checkOut": "...", "status": "checked_in",
               "guest": { "fullName": "Иван Петров" } },
  "room": { "number": "305", "floor": 3 },
  "folioTotal": { "value": "3250.00", "currency": "RUB" }
}
```

### `GET /v1/booking/folio`
```json
{
  "entries": [
    { "source": "food", "description": "Заказ еды #A-102", "amount": { "value": "1850.00", "currency": "RUB" } },
    { "source": "shop", "description": "Магазин #S-44",     "amount": { "value": "1400.00", "currency": "RUB" } }
  ],
  "total": { "value": "3250.00", "currency": "RUB" }
}
```

### `POST /v1/booking/checkout`
```json
// req
{ "email": "ivan@example.com" }
// res 200
{ "invoiceId": "inv_77", "status": "sent" }
// побочный эффект: инвалидация всех токенов брони, room.status -> cleaning
```

---

## Food

### `GET /v1/food/menu`  (ETag, кэшируемо)
```json
{
  "version": "v42",
  "categories": [
    { "id": "c_1", "name": "Завтраки", "availableFrom": "06:00", "availableTo": "11:00",
      "items": [
        { "id": "i_1", "name": "Омлет с овощами", "desc": "3 яйца, перец, томаты",
          "price": { "value": "450.00", "currency": "RUB" }, "image": "https://cdn/.../omlet.webp",
          "allergens": ["egg"], "available": true,
          "modifiers": [ { "id": "m_1", "group": "Дополнительно", "name": "Сыр",
                          "priceDelta": { "value": "80.00", "currency": "RUB" }, "required": false } ] }
      ] }
  ]
}
```
`304 Not Modified` — если `If-None-Match: "v42"`.

### `POST /v1/orders`  (Idempotency-Key)
```json
// req
{
  "kind": "food",
  "items": [
    { "itemId": "i_1", "qty": 2, "modifierIds": ["m_1"], "comment": "без томатов" },
    { "itemId": "i_5", "qty": 1, "modifierIds": [] }
  ],
  "paymentMethod": "room",
  "comment": "Постучите, не звоните"
}
// res 201 (room)
{
  "orderId": "o_102", "status": "new",
  "total": { "value": "1060.00", "currency": "RUB" },
  "paymentStatus": "charged"
}
// res 201 (online) — добавляются поля оплаты
{ "orderId": "o_103", "status": "new", "total": {...}, "paymentStatus": "pending",
  "payUrl": "https://yookassa/.../pay", "qr": "data:image/png;base64,iVBOR..." }
// res 422 BUSINESS_RULE — позиция в стоп-листе / категория недоступна по времени
```
> Сумма (`total`) **всегда считается сервером** по текущему меню; присланные клиентом цены игнорируются.

### `GET /v1/orders/:id`
```json
{
  "order": { "id": "o_102", "kind": "food", "status": "cooking",
             "total": { "value": "1060.00", "currency": "RUB" }, "paymentStatus": "charged",
             "items": [ { "name": "Омлет с овощами", "qty": 2, "unitPrice": {"value":"530.00","currency":"RUB"} } ] },
  "statusHistory": [
    { "status": "new", "at": "2026-06-07T08:01:00Z" },
    { "status": "accepted", "at": "2026-06-07T08:02:10Z" },
    { "status": "cooking", "at": "2026-06-07T08:05:00Z" }
  ]
}
```

### `POST /v1/orders/:id/cancel`
`200 { "status": "cancelled" }` · `422 INVALID_STATE_TRANSITION` если уже `delivering`/`done`.

---

## Taxi

### `POST /v1/taxi/estimate`
```json
// req
{ "dropoff": { "address": "Аэропорт Шереметьево" }, "carClass": "standard" }
// res 200
{ "price": { "value": "1500.00", "currency": "RUB" }, "etaPickupMin": 7,
  "available": true, "provider": "yandex-b2b" }
// res 200 (dispatch — без точной цены)
{ "available": true, "provider": "dispatch", "etaPickupMin": null, "price": null }
```

### `POST /v1/taxi/rides`  (Idempotency-Key)
```json
// req
{ "dropoff": { "address": "Аэропорт Шереметьево" }, "carClass": "standard", "phone": "+7999..." }
// res 201 (api)
{ "rideId": "tr_5", "status": "requested", "mode": "api" }
// res 201 (dispatch)
{ "rideId": "tr_6", "status": "requested", "mode": "dispatch",
  "message": "Заявка передана ресепшену, ожидайте подтверждения" }
```

### `GET /v1/taxi/rides/:id`
```json
{ "ride": { "id": "tr_5", "status": "assigned",
            "car": { "model": "Hyundai Solaris, белый", "plate": "А123ВС777", "etaMin": 4 } } }
```

### `POST /v1/taxi/rides/:id/cancel` → `200 { "status": "cancelled" }`

---

## Shop

### `GET /v1/shop/catalog` (ETag)
```json
{ "version": "v8", "categories": [
  { "id": "sc_1", "name": "Гигиена", "items": [
    { "id": "si_1", "name": "Зубной набор", "price": {"value":"150.00","currency":"RUB"},
      "stock": 20, "image": "https://cdn/.../kit.webp", "available": true } ] } ] }
```

### `POST /v1/orders` (`kind:"shop"`) — контракт как у food; `422 BUSINESS_RULE` если `stock` недостаточно.

### `GET /v1/orders?kind=shop&limit=20`
```json
{ "items": [ { "id": "o_90", "status": "done", "total": {"value":"300.00","currency":"RUB"},
               "createdAt": "..." } ], "nextCursor": null }
```

---

## Chat / Service requests

### `GET /v1/chat/thread`
```json
{ "threadId": "th_1", "messages": [
  { "id": "msg_1", "sender": "guest", "body": "Можно доп. подушку?", "createdAt": "...", "readAt": "..." },
  { "id": "msg_2", "sender": "staff", "body": "Конечно, принесём", "createdAt": "...", "readAt": null } ] }
```

### `POST /v1/chat/messages` (Idempotency-Key)
```json
{ "body": "Спасибо!" } → 201 { "messageId": "msg_3", "createdAt": "..." }
```

### `POST /v1/service-requests` (Idempotency-Key)
```json
// req
{ "type": "towels", "payload": { "qty": 2 } }
// res 201
{ "requestId": "sr_10", "status": "new", "assignedRole": "housekeeping" }
// callback
{ "type": "callback", "payload": { "phone": "+7999..." } }
```

### `GET /v1/service-requests?status=open`
```json
{ "items": [ { "id": "sr_10", "type": "towels", "status": "new", "createdAt": "..." } ] }
```

---

## Info (контент)

### `GET /v1/info/pages` (ETag)
```json
{ "version": "v3", "pages": [ { "slug": "wifi", "title": "Wi-Fi", "body": "Сеть: HOTEL, пароль: welcome2026" } ] }
```
### `GET /v1/info/schedules`
```json
{ "schedules": [ { "service": "restaurant", "title": "Ресторан",
  "rules": [ { "days": [1,2,3,4,5,6,7], "from": "07:00", "to": "23:00" } ] } ] }
```
### `GET /v1/info/poi`
```json
{ "items": [ { "name": "Старый город", "desc": "В 1.5 км", "image": "https://cdn/.../town.webp",
              "geo": { "lat": 55.75, "lon": 37.61 } } ] }
```

---

## Staff / Admin (панель)

### `GET /v1/staff/orders?status=new&kind=food`
```json
{ "items": [
  { "id": "o_102", "room": "305", "kind": "food", "status": "new", "waitingSec": 95,
    "items": [ { "name": "Омлет с овощами", "qty": 2, "modifiers": ["Сыр"], "comment": "без томатов" } ],
    "total": { "value": "1060.00", "currency": "RUB" }, "createdAt": "..." } ] }
```

### `PATCH /v1/staff/orders/:id/status`
```json
{ "status": "cooking" } → 200 { "id": "o_102", "status": "cooking" }
// 409 INVALID_STATE_TRANSITION при недопустимом переходе
```

### `GET /v1/staff/service-requests?role=housekeeping&status=new`
### `PATCH /v1/staff/service-requests/:id` `{ "status": "in_progress" }`
### `GET /v1/staff/threads?status=open` · `POST /v1/staff/threads/:id/messages`
### `GET /v1/staff/rooms`
```json
{ "rooms": [ { "number": "305", "status": "occupied", "checkout": "2026-06-09T12:00:00Z",
               "openRequests": 1, "online": true } ] }
```

### Admin (роль `admin`)
```
POST   /v1/admin/menu/categories         {...}
PATCH  /v1/admin/menu/items/:id          { price, isAvailable, i18n }
DELETE /v1/admin/menu/items/:id
POST   /v1/admin/shop/items              {...}
PATCH  /v1/admin/info/pages/:id          { i18n, published }
POST   /v1/admin/staff-users             { email, role, fullName, password }
GET    /v1/admin/analytics/summary?from=&to=
```
`GET /v1/admin/analytics/summary` →
```json
{ "revenue": { "food": {"value":"45200.00"}, "shop": {"value":"12300.00"}, "currency": "RUB" },
  "ordersCount": { "food": 84, "shop": 31 },
  "topItems": [ { "name": "Омлет с овощами", "qty": 22 } ],
  "requestsByType": { "towels": 12, "cleaning": 9, "technician": 3 },
  "avgChatResponseSec": 95 }
```

---

## Webhooks (входящие, от провайдеров)

### `POST /v1/webhooks/payments/:provider`
- Проверка подписи (HMAC секрет вебхука).
- Идемпотентность по `provider_payment_id`.
- Сверка суммы с заказом.
```json
// пример (нормализованный)
{ "event": "payment.succeeded", "paymentId": "2c8...", "orderId": "o_103",
  "amount": { "value": "1060.00", "currency": "RUB" }, "signature": "..." }
→ 200 { "ok": true }   // невалидная подпись → 400, не меняем статус
```

---

## WebSocket (Socket.IO) — сводка

Подключение: `wss://api.<домен>` с `auth: { token }`. Полный список событий — в [05](./05-api.md#websocket-socketio). Здесь — примеры payload:

```json
// server→kitchen
order.created  { "orderId":"o_102","kind":"food","room":"305","total":{...},"items":[...] }
// server→room:{id}
order.updated  { "orderId":"o_102","status":"cooking" }
taxi.updated   { "rideId":"tr_5","status":"assigned","car":{...} }
chat.message   { "threadId":"th_1","message":{"sender":"staff","body":"..."} }
service_request.updated { "requestId":"sr_10","status":"in_progress" }
// client→server
chat.send      { "threadId":"th_1","body":"...","idempotencyKey":"..." }
order.updateStatus { "orderId":"o_102","status":"cooking" }   // только staff
```

## Версионирование и контракты
- Версия в пути (`/v1`); ломающие изменения → `/v2`.
- DTO — единственный источник правды в `packages/shared-types`; из них генерируется OpenAPI (`/v1/openapi.json`) и Swagger UI (`/v1/docs`, только не-prod).
- Контрактные тесты проверяют соответствие реализации и DTO.
