# 20. Аналитика и локализация (каталоги)

## Часть A. Аналитика: события и метрики

### Таксономия событий (клиент TV → API/аналитика)

События шлются батчами (офлайн-устойчиво, в общей очереди). Формат: `{ event, ts, roomId, sessionId, props }`. PII не передаём.

| Событие | Когда | props |
|---------|-------|-------|
| `app_open` | старт приложения | `tizenModel`, `locale` |
| `login_success` / `login_fail` | вход | `method: pin\|code`, `attempts?` |
| `module_open` | открыт модуль | `module: food\|shop\|taxi\|chat\|info\|bill` |
| `menu_view` | открыто меню | `category` |
| `item_view` | карточка блюда/товара | `itemId`, `kind` |
| `cart_add` / `cart_remove` | изменение корзины | `itemId`, `qty` |
| `order_submit` | оформление | `kind`, `total`, `paymentMethod`, `itemsCount` |
| `order_offline_queued` | заказ ушёл в очередь | `kind` |
| `taxi_estimate` / `taxi_request` | такси | `carClass`, `provider` |
| `service_request` | сервис-запрос | `type` |
| `chat_message_sent` | сообщение в чат | — |
| `checkout` | выезд | `total` |
| `csat_submit` | оценка на выходе | `score 1..5` |
| `error_shown` | показан экран ошибки | `code`, `screen` |
| `lang_switch` | смена языка | `from`,`to` |

### Серверные/бизнес-метрики (для дашбордов и KPI)

| Метрика | Источник | Связь с KPI ([01](./01-overview.md)) |
|---------|----------|--------------------------------------|
| Adoption (доля номеров с ≥1 `app_open`) | events | ≥40% |
| Конверсия меню→заказ | `menu_view`→`order_submit` | ≥15% |
| Выручка по источникам | `folio_entries`/`orders` | — |
| Средний чек | `orders` | — |
| Топ-блюда/товары | `order_items` | — |
| Заявки по типам | `service_requests` | снижение звонков −20% |
| Среднее время ответа в чате | `chat_messages` (guest→staff) | <2 мин |
| Время до принятия заказа кухней | `order_status_history` (new→accepted) | операционная |
| Доля офлайн-очереди | `order_offline_queued`/`order_submit` | <1% |
| CSAT | `csat_submit` | ≥4.3 |
| Ошибки приложения | `error_shown`, Sentry | <0.5% сессий |

### Технические метрики (Prometheus)
`http_requests_total`, `http_request_duration_seconds` (P50/P95/P99), `ws_connections`, `queue_depth{queue}`, `folio_sync_failures_total`, `payment_webhook_total{status}`, `upstream_errors_total{provider}`.

### Конфиденциальность аналитики
- Без PII (нет имени/email/телефона в событиях).
- `roomId`/`sessionId` — псевдонимные идентификаторы.
- Хранение агрегатов; сырые события — ограниченный срок.

---

## Часть B. Локализация: каталог ключей (RU/EN)

Все строки UI — через ключи `t('...')`. Словари: `apps/tv-app/src/i18n/{ru,en}.json` и панель `apps/staff-panel/src/i18n/...`. Тексты контента (меню/инфо) — в БД (`i18n jsonb`), не здесь.

### Структура ключей (TV-app) — выдержка

```jsonc
{
  "common": {
    "back": { "ru": "Назад", "en": "Back" },
    "next": { "ru": "Далее", "en": "Next" },
    "confirm": { "ru": "Подтвердить", "en": "Confirm" },
    "cancel": { "ru": "Отмена", "en": "Cancel" },
    "retry": { "ru": "Повторить", "en": "Retry" },
    "loading": { "ru": "Загрузка…", "en": "Loading…" },
    "offline": { "ru": "Нет соединения — повтор автоматически",
                 "en": "No connection — will retry automatically" },
    "error_generic": { "ru": "Что-то пошло не так", "en": "Something went wrong" }
  },
  "lock": {
    "welcome": { "ru": "Добро пожаловать", "en": "Welcome" },
    "enter": { "ru": "Войти", "en": "Enter" }
  },
  "auth": {
    "prompt": { "ru": "Введите PIN или код брони", "en": "Enter PIN or booking code" },
    "wrong": { "ru": "Неверный код, попыток осталось: {n}",
               "en": "Invalid code, attempts left: {n}" },
    "locked": { "ru": "Слишком много попыток. Подождите {m} мин",
                "en": "Too many attempts. Wait {m} min" }
  },
  "menu": {
    "greeting": { "ru": "Здравствуйте, {name}!", "en": "Hello, {name}!" },
    "food": { "ru": "Еда", "en": "Food" },
    "shop": { "ru": "Магазин", "en": "Shop" },
    "taxi": { "ru": "Такси", "en": "Taxi" },
    "chat": { "ru": "Связь", "en": "Contact" },
    "info": { "ru": "Информация", "en": "Information" },
    "bill": { "ru": "Счёт", "en": "Bill" }
  },
  "food": {
    "cart": { "ru": "Корзина", "en": "Cart" },
    "addToCart": { "ru": "Добавить в корзину — {sum}", "en": "Add to cart — {sum}" },
    "checkout": { "ru": "Оформить заказ", "en": "Place order" },
    "total": { "ru": "Итого: {sum}", "en": "Total: {sum}" },
    "allergens": { "ru": "Аллергены: {list}", "en": "Allergens: {list}" },
    "unavailableTime": { "ru": "Доступно с {from}", "en": "Available from {from}" },
    "empty": { "ru": "Корзина пуста", "en": "Cart is empty" }
  },
  "pay": {
    "toRoom": { "ru": "На счёт номера", "en": "Charge to room" },
    "online": { "ru": "Онлайн (QR)", "en": "Online (QR)" },
    "scanQr": { "ru": "Отсканируйте QR телефоном для оплаты",
                "en": "Scan the QR with your phone to pay" }
  },
  "order": {
    "status_new": { "ru": "Новый", "en": "New" },
    "status_accepted": { "ru": "Принят", "en": "Accepted" },
    "status_cooking": { "ru": "Готовится", "en": "Cooking" },
    "status_delivering": { "ru": "Везут", "en": "On the way" },
    "status_done": { "ru": "Доставлен", "en": "Delivered" }
  },
  "taxi": {
    "to": { "ru": "Куда", "en": "Destination" },
    "estimate": { "ru": "~{price} · подача ~{eta} мин", "en": "~{price} · pickup ~{eta} min" },
    "order": { "ru": "Заказать", "en": "Order" },
    "dispatch": { "ru": "Заявка передана ресепшену, ожидайте",
                  "en": "Request sent to reception, please wait" }
  },
  "chat": {
    "title": { "ru": "Чат с ресепшен", "en": "Chat with reception" },
    "placeholder": { "ru": "Сообщение", "en": "Message" },
    "towels": { "ru": "Полотенца", "en": "Towels" },
    "cleaning": { "ru": "Уборка", "en": "Cleaning" },
    "technician": { "ru": "Техник", "en": "Technician" },
    "callback": { "ru": "Перезвоните мне", "en": "Call me back" },
    "dnd": { "ru": "Не беспокоить", "en": "Do not disturb" }
  },
  "checkout": {
    "title": { "ru": "Счёт и выезд", "en": "Bill & check-out" },
    "emailLabel": { "ru": "Email для счёта", "en": "Email for the invoice" },
    "submit": { "ru": "Оформить выезд и отправить счёт",
                "en": "Check out and send the invoice" },
    "sent": { "ru": "Счёт отправлен. Спасибо!", "en": "Invoice sent. Thank you!" },
    "csat": { "ru": "Оцените ваше проживание", "en": "Rate your stay" }
  }
}
```

### Правила локализации
- **Интерполяция** через `{placeholder}` (имя, сумма, n/m, from/eta).
- **Форматирование** сумм/дат — `Intl.NumberFormat`/`Intl.DateTimeFormat` с валютой и таймзоной отеля (не хардкодить «₽»).
- **Множественное число** — через правила Intl.PluralRules (RU имеет 3 формы).
- **Полнота:** каждый ключ обязан существовать в обоих языках; CI-проверка отсутствующих ключей.
- **Добавление языка** — новый файл словаря + флаг в `hotels.locales`; код не меняется.
- **Контент** (названия блюд, тексты инфо) — локализуется в БД (`i18n jsonb`), редактируется в панели.
