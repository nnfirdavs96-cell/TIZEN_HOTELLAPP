# 13. Интеграции (конкретные спецификации)

Этот документ убирает «заглушечность» из плана: вместо «mock-адаптер / опционально / в MVP вручную» — конкретные провайдеры, протоколы, форматы запросов и порядок действий. Каждая интеграция спрятана за интерфейсом (порт), но здесь описаны **реальные реализации**.

Принцип: **порт + адаптеры**. Доменный код зависит от интерфейса (`PaymentPort`, `TaxiPort`, `PmsPort`, `NotifyPort`); конкретный провайдер выбирается конфигом отеля (`hotels.settings.integrations`). `mock`-адаптер существует только для локальной разработки/тестов и **запрещён** в `production` (проверка на старте).

---

## 13.1 Платежи

Два независимых потока: **charge-to-room** (основной) и **онлайн-оплата** (опц., для предоплаты/гостей без открытого фолио).

### A. Charge-to-room (списание на счёт номера)

Начисление добавляется на **фолио** гостя в PMS; гость оплачивает при выезде на ресепшене. Мы карты не трогаем.

**Интерфейс `PaymentPort.chargeToRoom`:**
```
chargeToRoom(input: {
  bookingRef: string;          // id брони/резервации в PMS
  roomNumber: string;
  amount: { value: string; currency: string };  // "1250.00", "RUB"
  items: { name: string; qty: number; unitPrice: string }[];
  transactionCode: string;     // код услуги в PMS (напр. "RMS" room service, "SHOP")
  idempotencyKey: string;
}): Promise<{ folioRef: string; status: 'posted' | 'queued' }>
```

**Реализация зависит от PMS (см. §13.3):**
- **OPERA on-prem** → постинг через интерфейс **FIAS** (Fidelio Interface Application Specification) по TCP/IP — стандартный протокол, которым POS/мини-бары постят начисления в Opera. Сообщение постинга (`PS` record): номер комнаты, сумма, transaction code, описание.
- **OPERA Cloud** → **OHIP Cashiering API**, `POST .../reservations/{id}/charges` с массивом `charges[{ transactionCode, amount, quantity, reference }]`.
- **1С:Отель / Fidelio Suite8 / иные** → свой адаптер по доступному API/интерфейсу.

**Гарантии:**
- **Идемпотентность:** `idempotencyKey` хранится; повтор не задваивает начисление.
- **Очередь с ретраями:** если PMS недоступен — `folio_entries.pms_sync_status = pending`, фоновый воркер (`queue:folio-sync`) повторяет с экспоненциальным backoff; алерт при превышении N попыток.
- **Сверка (reconciliation):** ежедневная сверка `folio_entries` (статус `synced`) с отчётом PMS; расхождения — в отчёт.
- **Идемпотентность на стороне PMS:** в `reference` передаём наш `order_id`, чтобы PMS-сторона тоже могла отсеять дубль.

### B. Онлайн-оплата (Payment Link + QR)

Для предоплаты или когда фолио не открыто. Карта вводится **на стороне провайдера**, на телефоне гостя (QR), не на TV и не у нас. PCI — **SAQ-A**.

**Провайдеры (выбор по региону отеля):**
| Регион | Провайдер | Механизм |
|--------|-----------|----------|
| РФ | **ЮKassa (YooKassa)** | Платёж с подтверждением `redirect`/`qr`; вебхук `payment.succeeded` |
| РФ (альт.) | CloudPayments / Tinkoff Kassa | Платёжная ссылка + вебхук |
| Международный | **Stripe** | Payment Links / PaymentIntent; вебхук `checkout.session.completed` |

**Интерфейс `PaymentPort.createOnlinePayment`:**
```
createOnlinePayment(input: {
  orderId: string;
  amount: { value: string; currency: string };
  description: string;
  idempotencyKey: string;
  returnUrl?: string;
}): Promise<{ paymentId: string; payUrl: string; qrPng: string /* base64 */ }>
```

**Поток:**
1. TV: «Оплатить онлайн» → `POST /v1/orders` с `paymentMethod: "online"`.
2. API создаёт платёж у провайдера (Idempotency-Key), кладёт `payments(status=pending)`, возвращает `payUrl` + `qrPng`.
3. TV показывает **QR**; гость сканирует телефоном, платит на странице провайдера.
4. Провайдер шлёт **вебхук** → `POST /v1/webhooks/payments/{provider}` (проверка подписи!).
5. API проверяет подпись и сумму, ставит `payments.status = paid`, `orders.payment_status = charged`, шлёт WS `order.updated`.
6. TV видит смену статуса; при `failed`/таймауте — предлагает повтор или charge-to-room.

**Безопасность вебхука:**
- Проверка HMAC-подписи провайдера (секрет вебхука из секрет-менеджера).
- Идемпотентность по `provider_payment_id` (повторный вебхук игнорируется).
- Сверка `amount`/`currency` с заказом; несовпадение → алерт, платёж не засчитывается.
- Только серверная истина: статус заказа меняет **вебхук**, не клиент.

### C. Возвраты / отмены
- Отмена заказа до оплаты — просто отмена `payment(pending)`.
- Возврат после оплаты — `PaymentPort.refund(paymentId, amount)`; для charge-to-room — сторно-начисление (`folio_entries` с отрицательной суммой, transaction code reversal).

---

## 13.2 Такси

Публичного клиентского API «закажи поездку» у Яндекс.Такси нет — это **B2B**. Поэтому `TaxiPort` с тремя реальными адаптерами; отель выбирает доступный.

**Интерфейс `TaxiPort`:**
```
estimate(input: { pickup: GeoOrAddress; dropoff: GeoOrAddress; carClass: string })
  : Promise<{ price?: Money; etaPickupMin?: number; available: boolean }>
createRide(input: { pickup; dropoff; carClass; phone?; idempotencyKey })
  : Promise<{ rideId: string; providerRideId?: string; status: RideStatus; mode: 'api' | 'dispatch' }>
getStatus(rideId): Promise<{ status: RideStatus; car?: { model; plate; etaMin } }>
cancel(rideId): Promise<void>
```

### Адаптер 1 — `yandex-b2b` (корпоративный аккаунт отеля)
- **Что нужно:** корпоративный договор «Яндекс Go для бизнеса», API-токен корпоративного кабинета.
- **Поток:** `createRide` создаёт заказ на корпоративном аккаунте отеля (поездка относится на счёт отеля → начисление гостю через charge-to-room). Статусы поездки тянем поллингом/вебхуком (по возможностям API), транслируем в `taxi.updated` (WS).
- **Ограничение:** доступность зависит от наличия договора и покрытия города.

### Адаптер 2 — `dispatch` (через ресепшен/диспетчерскую) — гарантированный fallback
- **Что нужно:** ничего внешнего; только процесс в отеле.
- **Поток:** `createRide` создаёт `taxi_rides(status=requested, mode=dispatch)` и `service_request(type=taxi)` → событие в панель ресепшена/диспетчеру (и опц. в Telegram-бот отеля). Сотрудник заказывает машину привычным способом и руками двигает статус (`assigned`→`arrived`). Гость видит статус и сообщение «Заявка передана, ожидайте».
- **Это всегда работает** — даже без всякого API. Включён по умолчанию.

### Адаптер 3 — `deeplink` (запасной, маргинальный для TV)
- Показать гостю номер телефона службы такси и/или QR с диплинком приложения (для тех, кто закажет с телефона). Используется, только если ни B2B, ни dispatch недоступны.

### Справочник точек
- Предзаполненные популярные направления отеля (аэропорт, вокзал, центр) с координатами — `points_of_interest` (category=`destination`), RU/EN.
- Геокодер адресов назначения — провайдер карт (Яндекс.Карты Geocoder API / 2GIS), за интерфейсом `GeocoderPort`.

---

## 13.3 PMS (система управления отелем)

`PmsPort` — канонический интерфейс; адаптер выбирается под PMS отеля.

**Канонические операции:**
```
getReservationByRoom(roomNumber): Promise<Reservation | null>   // бронь, гость, даты
getFolio(bookingRef): Promise<{ entries: FolioEntry[]; total: Money }>
postCharge(bookingRef, charge): Promise<{ folioRef: string }>    // см. §13.1.A
checkout(bookingRef): Promise<{ invoiceRef: string }>
```

| PMS | Протокол интеграции | Постинг начислений | Получение брони |
|-----|---------------------|--------------------|-----------------|
| **OPERA on-prem** | **FIAS** (TCP/IP) + **OXI** (XML) | FIAS `PS` posting record | OXI/IFC выгрузка резерваций или запрос по комнате |
| **OPERA Cloud** | **OHIP** (REST/OAuth2) | Cashiering API `POST .../charges` | Reservations API `GET .../reservations?roomId=` |
| **Fidelio Suite8** | FIAS-совместимый интерфейс | FIAS posting | Интерфейсный экспорт |
| **1С:Отель** | HTTP-сервисы 1С / обмен | Документ начисления через API | Запрос проживания по номеру |
| **Нет интеграции (пилот)** | `manual` адаптер | Накопление в `folio_entries`, экспорт счёта (PDF/CSV) на ресепшен | Бронь ведётся в нашей БД |

**Стратегия внедрения (без блокировки разработки):**
1. **Фазы 1–2:** адаптер `manual` — брони и фолио в нашей БД, charge-to-room пишет `folio_entries`, при Check-out счёт формируется нами (PDF на email) и/или экспортируется на ресепшен.
2. **Пилот:** если отель даёт доступ — подключаем `opera-fias` (постинг начислений) и/или `opera-ohip`.
3. **После пилота:** полноценная двусторонняя синхронизация (брони из PMS, начисления в PMS, единый счёт).

**Надёжность:** все вызовы PMS — через очередь с ретраями и таймаутами; недоступность PMS не блокирует гостя (заказ принимается, начисление синкается асинхронно).

---

## 13.4 Уведомления (Email / SMS / Push)

`NotifyPort` с каналами.

### Email (счёт при выезде, подтверждения)
- **Провайдер:** SMTP отеля **или** SendGrid/Mailgun (международный) / Unisender (РФ).
- **Счёт:** генерируем **PDF** (шаблон с реквизитами отеля, позиции фолио, итог, НДС) и прикладываем к письму; тело — RU/EN по `guest.locale`.
- **Шаблоны:** `invoice`, `order_confirmation` (опц.), `checkout_thanks`.
- **Надёжность:** очередь `queue:email`, ретраи; статус отправки логируется; ошибка — алерт ресепшену (выдать счёт вручную).

### SMS (callback такси, коды) — опционально
- **Провайдер:** SMSC.ru / SMS.ru (РФ) или Twilio (международный), за `SmsPort`.
- Используется для «перезвоните мне» (уведомить гостя) и при необходимости — кодов.

### Push на TV (входящие)
- Не классический push, а **WebSocket-доставка** (Socket.IO) на активное приложение: новое сообщение чата, смена статуса заказа/такси, ответ на сервис-запрос. При оффлайн-TV — догрузка при реконнекте.

---

## 13.5 WebRTC (голос, опционально, Tizen ≥ 5.5)

- **Сигнализация:** наш сервер (namespace `/voice`, см. [05](./05-api.md)).
- **TURN/STUN:** собственный **coturn** (хост `turn.<домен>`), короткоживущие credentials выдаёт `GET /v1/voice/ice`.
- **Кодеки:** Opus (аудио). Видео в MVP не делаем.
- **Деградация:** если `RTCPeerConnection`/getUserMedia недоступны (детект на старте) — кнопка звонка скрыта, показывается «Перезвоните мне» (см. ADR-005).

---

## 13.6 Карты / геокодинг (для такси и навигации)
- **Провайдер:** Яндекс.Карты / 2GIS (РФ), Google/Mapbox (международный), за `GeocoderPort`/`MapPort`.
- Используется для: адреса назначения такси, карты отеля/окрестностей, точек интереса.
- Карта отеля в MVP — статичная схема-изображение (без онлайн-карт), геокодер нужен только для адресов такси.

---

## 13.7 Матрица «что требуется для подключения»

| Интеграция | Что запросить у отеля/провайдера | Можно стартовать без него? |
|------------|----------------------------------|-----------------------------|
| Charge-to-room | Доступ к PMS (FIAS/OHIP/API) или согласие на `manual` | Да — `manual` адаптер |
| Онлайн-оплата | Аккаунт ЮKassa/Stripe, ключи API + вебхука | Да — функция выключается флагом |
| Такси (B2B) | Корп. договор Яндекс Go + токен | Да — `dispatch` fallback |
| PMS | Тип PMS, доступ к интерфейсу, transaction codes | Да — `manual` |
| Email | SMTP/ключ провайдера, реквизиты для счёта | Нет (счёт нужен) — минимум SMTP |
| SMS | Аккаунт SMS-провайдера | Да — опционально |
| Карты/геокодер | Ключ API карт | Да — точки задаются вручную |

## 13.8 Конфигурация интеграций (на отель)

В `hotels.settings.integrations` (JSON), секреты — в секрет-менеджере, в БД только идентификаторы/флаги:
```json
{
  "payment": { "online": { "provider": "yookassa", "enabled": true } },
  "pms":     { "provider": "manual", "transactionCodes": { "food": "RMS", "shop": "SHOP", "taxi": "TAXI" } },
  "taxi":    { "provider": "dispatch", "yandexB2B": { "enabled": false } },
  "notify":  { "email": { "provider": "smtp" }, "sms": { "enabled": false } },
  "maps":    { "provider": "yandex", "enabled": true }
}
```
Старт сервиса проверяет: в `production` нет `mock`-адаптеров; для включённых провайдеров присутствуют секреты.
