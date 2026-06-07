# 17. Потоки (sequence) и машины состояний

Конкретные сценарии «по шагам» между компонентами и формальные машины состояний сущностей. Это спецификация поведения — её можно проверять тестами.

Компоненты: **TV** (клиент), **API** (бэкенд), **DB** (PostgreSQL), **Q** (очереди/Redis), **WS** (realtime), **PMS/PAY/TAXI** (внешние через порты), **PANEL** (персонал).

---

## 17.1 Вход гостя

```
TV → API:  POST /auth/login  (X-Device-Token, {pin})
API → DB:  найти device по token_hash → room → активную booking
API:       проверить PIN (argon2); лимит попыток (Redis pin-fail:{bookingId})
  ├─ неверно → 401 INVALID_CREDENTIALS (или 423 после лимита)
  └─ верно:
API → DB:  booking.status = checked_in (если был reserved); audit_log(login)
API → Redis: создать refresh-сессию session:{deviceId} (TTL до check-out)
API → TV:  200 { accessToken(15м), refreshToken, guest, booking }
TV:        сохранить токены; перейти в S2 (главное меню)
TV → WS:   connect(auth: accessToken) → присоединиться к room:{roomId}
```

## 17.2 Заказ еды (charge-to-room) — основной путь

```
TV:        собрать корзину локально
TV → API:  POST /orders (Idempotency-Key, kind=food, items[], paymentMethod=room)
API:       проверить идемпотентность (idempotency_keys) — если повтор, вернуть прошлый ответ
API → DB:  загрузить актуальные menu_items; проверить is_available и время категории
  └─ нарушение → 422 BUSINESS_RULE
API:       ПЕРЕСЧИТАТЬ сумму на сервере (цены из БД + модификаторы)
API → DB:  INSERT order(status=new, total=...), order_items(snapshots), order_status_history(new)
API → DB:  INSERT folio_entry(source=food, source_ref=order, status=pending)
API → Q:   enqueue folio-sync(order)            // асинхронный постинг в PMS
API → DB:  order.payment_status = charged       // на счёт номера принято
API → WS:  emit order.created → staff:kitchen
API → TV:  201 { orderId, status=new, total, paymentStatus=charged }
TV:        S7 (статус)

# Кухня двигает статус:
PANEL → API: PATCH /staff/orders/:id/status {accepted|cooking|delivering|done}
API → DB:    проверить допустимость перехода; обновить; history
API → WS:    emit order.updated → room:{roomId}
TV:          обновить прогресс в S7

# Воркер folio-sync:
Q → API:   взять задачу → PmsPort.chargeToRoom(...)
  ├─ ok → folio_entry.status = synced, pms_folio_ref
  └─ ошибка → retry (backoff); после N → status=failed + алерт
```

## 17.3 Заказ еды (онлайн-оплата по QR)

```
TV → API:  POST /orders (paymentMethod=online)
API:       пересчёт суммы; INSERT order(payment_status=pending)
API → PAY: PaymentPort.createOnlinePayment(order, amount)  → { paymentId, payUrl, qrPng }
API → DB:  INSERT payments(status=pending, provider_payment_id)
API → TV:  201 { orderId, paymentStatus=pending, payUrl, qr }
TV:        показать QR (S6), поллинг GET /orders/:id ИЛИ ждать WS

PAY → API: POST /webhooks/payments/:provider (событие payment.succeeded)
API:       проверить подпись HMAC; идемпотентность по provider_payment_id; сверить сумму
  ├─ невалидно → 400 (статус не меняем)
  └─ валидно:
API → DB:  payments.status=paid; orders.payment_status=charged
API → WS:  emit order.updated → room:{roomId}; emit order.created → staff:kitchen
TV:        QR → экран «Оплачено», S7
# Таймаут/отказ: payments.status=failed → TV предлагает повтор или charge-to-room
```

## 17.4 Вызов такси

```
TV → API:  POST /taxi/estimate {dropoff, carClass}
API → TAXI: TaxiPort.estimate(...) → {price?, eta?, available}
API → TV:  оценка (или «уточняется» для dispatch)

TV → API:  POST /taxi/rides (Idempotency-Key)
API → TAXI: TaxiPort.createRide(...)
  ├─ api (yandex-b2b): провайдер создал заказ → providerRideId, status=requested
  └─ dispatch: создать service_request(type=taxi) + taxi_ride(mode=dispatch)
API → DB:  INSERT taxi_ride
API → WS:  (dispatch) emit service_request.created → staff:reception
API → TV:  201 { rideId, status=requested, mode }
TV:        S10 (статус)

# Обновления:
api-режим:   воркер поллит TaxiPort.getStatus → WS taxi.updated → room
dispatch:    PANEL двигает статус → API → WS taxi.updated → room
# Завершение поездки (если оплата через отель) → folio_entry(source=taxi)
```

## 17.5 Чат и сервис-запрос

```
# Чат
TV → WS:   chat.send {threadId, body, idempotencyKey}
API → DB:  INSERT chat_message(sender=guest); thread.last_message_at
API → WS:  emit chat.message → staff:reception (и обратно подтверждение в room)
PANEL → WS: chat.send (sender=staff) → API → WS chat.message → room:{id}
TV:        показать сообщение; chat.markRead → read_at

# Сервис-запрос
TV → API:  POST /service-requests (Idempotency-Key, {type:towels})
API → DB:  INSERT service_request(assigned_role=housekeeping, status=new)
API → WS:  emit service_request.created → staff:housekeeping
PANEL → API: PATCH /staff/service-requests/:id {status:in_progress|done}
API → WS:  emit service_request.updated → room:{id}
```

## 17.6 Check-out

```
TV → API:  POST /booking/checkout {email}
API → DB:  собрать folio_entries → итог; booking.status=checked_out
API → PMS: (если интеграция) PmsPort.checkout(bookingRef) → invoiceRef
API:       сгенерировать PDF-счёт (реквизиты, позиции, итог, НДС)
API → Q:   enqueue email(invoice → guest.email)
API → Redis/DB: инвалидировать все токены брони (session:{deviceId} удалить); audit_log
API → DB:  room.status = cleaning; (опц.) создать задачу housekeeping
API → TV:  200 { invoiceId, status:sent }
TV:        экран «Счёт отправлен» → (опц.) CSAT → S0; локальные данные гостя очищены
Q → API:   email-воркер отправляет письмо (ретраи); ошибка → алерт ресепшену
```

## 17.7 Офлайн-заказ (потеря сети)

```
TV → API:  POST /orders  ✗ (нет сети)
TV:        положить запрос в локальную очередь (с Idempotency-Key), статус «отправляется»
TV:        показать баннер «Нет сети — отправим автоматически»
... сеть восстановилась ...
TV → API:  повтор POST /orders (тот же Idempotency-Key)
API:       идемпотентность → создать ОДИН заказ (повтор не задваивает)
API → TV:  201 → статус «отправлено», S7
```

---

## Машины состояний

### Заказ (`orders.status`)
```
        ┌──────────────────────────────────────────┐
        ▼                                           │
  new ──→ accepted ──→ cooking ──→ delivering ──→ done
   │          │           │            │
   └──────────┴───────────┴────────────┴──────→ cancelled
   (cancelled допустим из new/accepted/cooking; из delivering/done — нет)
```
- Переходы только «вперёд» по основной цепочке; «назад» запрещены (422 INVALID_STATE_TRANSITION).
- Кто двигает: `new→accepted→cooking→delivering→done` — персонал (kitchen). `cancelled` — гость (до cooking) или персонал.
- Платёж: `payment_status` независим — `pending → charged → (refunded)` / `failed`.

### Поездка (`taxi_rides.status`)
```
  requested ──→ assigned ──→ arrived ──→ completed
      │             │            │
      └─────────────┴────────────┴──→ cancelled
```
- `api`-режим: статусы из провайдера; `dispatch`: двигает персонал.

### Сервис-запрос (`service_requests.status`)
```
  new ──→ in_progress ──→ done
   │            │
   └────────────┴──→ cancelled
```

### Бронь (`bookings.status`)
```
  reserved ──→ checked_in ──→ checked_out
      │
      └──→ cancelled
```
- `reserved→checked_in` — при первом успешном входе гостя (или ручном check-in персоналом).
- `checked_in→checked_out` — при Check-out; инвалидирует сессии.

### Платёж заказа (`payments.status` / `orders.payment_status`)
```
  pending ──→ paid ──→ refunded
     │
     └──→ failed
```
- Меняется только сервером (вебхук провайдера / charge-to-room), никогда клиентом.

### Устройство (`devices.status`)
```
  provisioned ──→ active ──→ revoked
       ▲             │
       └─────────────┘  (повторный провижининг при замене TV)
```

### Сессия гостя (`auth_sessions`)
```
  issued ──→ revoked   (revoked при check-out, истечении refresh, или вручную)
```

---

## Правила переходов (валидация на сервере)

| Сущность | Разрешённые переходы | Кто инициирует |
|----------|----------------------|----------------|
| order | new→accepted→cooking→delivering→done; {new,accepted,cooking}→cancelled | staff; cancelled — guest/staff |
| taxi_ride | requested→assigned→arrived→completed; любой(кроме completed)→cancelled | provider/staff; cancelled — guest/staff |
| service_request | new→in_progress→done; {new,in_progress}→cancelled | staff |
| booking | reserved→checked_in→checked_out; reserved→cancelled | system/staff |
| payment | pending→paid→refunded; pending→failed | provider webhook/system |

Любой недопустимый переход → `409/422 INVALID_STATE_TRANSITION`, состояние не меняется, попытка пишется в `audit_log`.
