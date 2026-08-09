# 🧭 NAVIGATION.md — карта проекта

> **Начни с этого файла.** Он отвечает на вопрос «где что лежит и за что отвечает»,
> без необходимости читать весь код/документацию вслепую.
> Если после прочтения непонятно, куда смотреть дальше — значит, файл устарел, чини его (см. правила внизу).

Формат: `путь → назначение → ключевые строки/секции`.

---

## 1. Структура репозитория (карта верхнего уровня)

| Путь | Назначение | Статус |
|---|---|---|
| `README.md` | Точка входа для человека: что за проект, стек, как поднять локально, ссылки на всё остальное | ✅ есть |
| `NAVIGATION.md` | Этот файл — карта кода и документации | ✅ есть |
| `Hotel_Guest_App_Plan.docx` | Исходный презентационный план (до доработки в `docs/`), историческая версия | ✅ есть |
| `docs/` | Проектная документация (архитектура, API, роадмап и т.д.) — см. раздел 2 | ✅ есть |
| `apps/tv-app/` | Клиент на Samsung Tizen TV (Vite + TS, D-pad навигация) | ◐ Спринт 1.1 закрыт (без бэкенда) |
| `apps/staff-panel/` | Панель персонала (React SPA) | ⏳ план (Фаза 2–3) |
| `apps/api/` | Backend: REST + WebSocket (NestJS) | ⏳ план (Фаза 0–2) |
| `packages/shared-types/` | Общие TS-типы/контракты API между всеми приложениями | ⏳ план (Фаза 0) |
| `packages/ui-kit/` | Общие дизайн-токены (цвета, фокус-стили) | ⏳ план (Фаза 0) |
| `infra/docker/` | Dockerfile + docker-compose для локальной разработки | ⏳ план (Фаза 0) |
| `infra/db/` | Миграции и сиды PostgreSQL | ⏳ план (Фаза 0) |
| `infra/ci/` | CI/CD пайплайны | ⏳ план (Фаза 0) |
| `pnpm-workspace.yaml` | pnpm workspaces: `apps/*`, `packages/*` | ✅ есть |
| `package.json` (root) | Корневой манифест монорепо + скрипты `tv:dev`, `tv:build`, `tv:preview` | ✅ есть |
| `.gitignore` | Игнор node_modules, dist, .env, .wgt и т.п. | ✅ есть |
| `CLAUDE.md` | Правило автообновления `NAVIGATION.md` для Claude-сессий | ✅ есть |

Целевое обоснование этой структуры (монорепо на pnpm workspaces) — [`docs/02-architecture.md:57`](./docs/02-architecture.md#структура-репозитория).

---

## 2. Документация (`docs/`) — по файлам и секциям

| # | Файл | Что внутри | Ключевые секции (строка) |
|---|------|-----------|---------------------------|
| 00 | [`docs/00-shortcomings-fixed.md`](./docs/00-shortcomings-fixed.md) | Недочёты исходного `.docx`-плана и что исправлено | Главные выводы: L30 |
| 01 | [`docs/01-overview.md`](./docs/01-overview.md) | Видение, KPI, пользователи, объём MVP | Видение: L3 · Персоны: L21 · Объём MVP: L31 · KPI: L50 · Глоссарий: L74 |
| 02 | [`docs/02-architecture.md`](./docs/02-architecture.md) | Стек, схема системы, ADR-решения | Схема системы: L3 · Стек: L40 · Структура репо: L57 · Модули бэкенда: L79 · **ADR-001..008: L108-159** · NFR: L174 |
| 03 | [`docs/03-modules.md`](./docs/03-modules.md) | 6 модулей: экраны, задачи, критерии приёмки | Check-in: L17 · Еда: L72 · Такси: L131 · Магазин: L179 · Чат/персонал: L226 · Инфо: L280 · Сводная матрица: L325 |
| 04 | [`docs/04-data-model.md`](./docs/04-data-model.md) | Схема PostgreSQL, Redis | ER-обзор: L5 · Таблицы: L21 (устройства L23, брони L58, сессии L84, заказы еды L98, магазин L137, такси L143, чат L160, платежи L187, персонал/контент L213) · Redis: L224 |
| 05 | [`docs/05-api.md`](./docs/05-api.md) | REST + WebSocket контракты | Auth/провижининг: L22 · Booking: L63 · Food: L79 · Taxi: L106 · Shop: L127 · Chat: L140 · Info: L161 · Admin/Staff: L171 · WebSocket события: L201 |
| 06 | [`docs/06-tizen.md`](./docs/06-tizen.md) | Tizen-специфика: D-pad, фокус, провижининг, перф-бюджет | Клавиши пульта: L28 · Фокус-движок: L50 · Провижининг (A/B/C): L70 · Бюджет производительности: L86 · i18n: L122 · Офлайн: L131 |
| 07 | [`docs/07-roadmap.md`](./docs/07-roadmap.md) | Фазы → спринты → задачи | DoD: L11 · Фаза 0: L23 · **Фаза 1: L46** (Спринт 1.1 L50, 1.2 L61) · Фаза 2: L79 · Фаза 3: L117 · Фаза 4: L159 · Milestones: L199 |
| 08 | [`docs/08-security-compliance.md`](./docs/08-security-compliance.md) | JWT, PCI DSS, 152-ФЗ/GDPR | Модель угроз: L5 · Auth/сессии: L20 · RBAC: L28 · PCI: L41 · ПДн: L50 · Чек-лист релиза: L81 |
| 09 | [`docs/09-testing-qa.md`](./docs/09-testing-qa.md) | Пирамида тестов, матрица устройств | Критичные сценарии: L23 · Матрица TV: L45 · Перф: L58 · CI-автоматизация: L78 |
| 10 | [`docs/10-deployment-ops.md`](./docs/10-deployment-ops.md) | Окружения, CI/CD, мониторинг | CI/CD: L27 · Observability: L60 · Бэкапы: L72 · Runbook: L95 |
| 11 | [`docs/11-risks.md`](./docs/11-risks.md) | Реестр рисков | Топ-5 рисков: L38 |
| 12 | [`docs/12-monetization.md`](./docs/12-monetization.md) | Модели дохода, GTM | Источники дохода: L5 · Ценообразование: L20 |

---

## 3. Файловый индекс кода (`apps/`, `packages/`, `infra/`)

> Формат записи на файл (не на каждую строку — только на значимые/неочевидные блоки).

### apps/tv-app — Tizen TV клиент

#### apps/tv-app/package.json
- Vanilla TS + Vite (ADR-002, `docs/02-architecture.md:119`).
- Скрипты: `dev` (Vite dev), `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`.

#### apps/tv-app/tsconfig.json
- target: ES2017 (`docs/02-architecture.md` NFR + Tizen 4.0+).
- strict + все `noUnused*` — жёсткий TS с первого дня.
- `resolveJsonModule` — для словарей `i18n/*.json`.

#### apps/tv-app/vite.config.ts
- base: `"./"` (Tizen `.wgt` — файловый режим, не корень домена).
- target: es2017, sourcemap: true.

#### apps/tv-app/config.xml
- Tizen-манифест приложения (`docs/06-tizen.md:17`).
- Привилегии: `internet`, `tv.inputdevice`, `network.get`.
- `screen-orientation="landscape"`, `required_version=4.0`.

#### apps/tv-app/index.html
- Точка входа, подключает `src/styles/main.css` и `src/main.ts`.
- Контейнер `#app` — куда роутер рендерит экраны.

#### apps/tv-app/src/main.ts
- Загрузчик приложения (`boot()`):
  - Инициализация `ApiClient` + `MutationQueue` + `NetworkMonitor` (env: `VITE_API_BASE`, `VITE_HEALTH_URL`).
  - Регистрация 9 экранов: `lock`, `home`, 6 модулей-заглушек, `offline`.
  - Подписка `net.subscribe`: пробрасывает online-статус в очередь мутаций + баннер `.offline-banner`.
  - Глобальный `keydown` — Back(10009)/Exit → back(); OK → click активного элемента; стрелки → `findNearestFocusable`.
  - Старт с экрана `lock` (`router.navigate('lock')`).
  - Debug-хук `window.__hga` для ручной отладки в консоли dev-сервера.
- `openExitModal()` — модалка на Back из корневого экрана.
- `updateOfflineBanner()` — фиксированный красный баннер сверху при отсутствии связи.

#### apps/tv-app/src/core/keys.ts
- `KEY` — коды клавиш пульта (Left/Right/Up/Down/OK/Back=10009/Exit/цветные), `docs/06-tizen.md:39`.
- `keyToDirection()` — стрелки → 'left'|'right'|'up'|'down'.
- `registerTizenKeys()` — регистрация доп. клавиш через `tizen.tvinputdevice`, безопасна в браузере.

#### apps/tv-app/src/core/focus-engine.ts
- Spatial navigation по геометрии (`docs/06-tizen.md:50`).
- `getFocusableElements()` — все `[data-focusable="true"]`.
- `rectOf()` + `isInDirection()` + `score()` — оценка «ближе всего в направлении».
- `findNearestFocusable(current, dir)` — L59-80: точка входа для D-pad.
- `focusFirst()`, `focusById()` — утилиты для роутера.

#### apps/tv-app/src/core/router.ts
- Класс `Router` с историей экранов (`stack: HistoryEntry[]`).
- `register(id, render)` L34, `navigate(id, params)` L38, `replace()` L54, `back()` L62.
- Восстановление фокуса при возврате: `captureFocusOnTop()` L84, `focusById(lastFocusId)`.
- На `back()` в корне стека — вызывает `onExit` (см. exit-модалку в `main.ts`).

#### apps/tv-app/src/core/i18n.ts
- Мини-i18n: словари RU/EN из JSON, `t(key, params)` с подстановкой `{name}`.
- `getLang()`/`setLang()`/`toggleLang()` — переключение + `localStorage`.
- `onLangChange(cb)` — подписка для перерисовки экранов.

#### apps/tv-app/src/i18n/{ru,en}.json
- Плоские словари. Ключи `menu.*`, `screen.stub.*`, `exit.*`, `booking.*`.

#### apps/tv-app/src/screens/home.ts
- Главное меню — 6 плиток модулей + переключатель языка + приветствие с моковой бронью.
- Плитка = `<button data-focusable="true" data-screen="…">`; клик → `navigate(screen)`.
- Перерисовка на смену языка через `onLangChange`.

#### apps/tv-app/src/screens/stub.ts
- Универсальный экран «В разработке» — используется для 6 модулей до реализации.

#### apps/tv-app/src/screens/lock.ts
- Lock/Welcome-экран (`docs/07-roadmap.md:59`). Приветствие + кнопка «Войти» → `router.replace('home')`.
- В Спринте 1.2 будет заменён/расширен экранной клавиатурой для ввода PIN/кода брони.

#### apps/tv-app/src/screens/offline.ts
- Полноэкранный «нет сети» (`docs/06-tizen.md:131`, ADR-006).
- Кнопка «Проверить ещё раз» вызывает `deps.retry()` (health-probe).
- При восстановлении сети (`onOnline` → true) экран сам делает `goBack()`.

#### apps/tv-app/src/core/api-client.ts
- `ApiClient` — REST-клиент (`docs/05-api.md`).
- `get()`: If-None-Match/304 + кэш в `localStorage` (`hga.cache.<key>`); при 304 отдаёт закэшированный `data` (`fromCache: true`).
- `post()`: пробрасывает `Idempotency-Key` (ADR-006).
- Единый `ApiError { kind: 'network'|'timeout'|'http'|'parse', status }` + AbortController-таймаут (8с).
- `readCachedOnly()` — оффлайн-чтение (для будущих экранов, чтобы не блокировать UI спиннером).

#### apps/tv-app/src/core/mutation-queue.ts
- Персистентная очередь мутаций в `localStorage` (`hga.mutations.queue`).
- `enqueue(path, body)` → генерит `id` + `idempotencyKey`, вызывает `POST` через `ApiClient`.
- Экспоненциальный backoff (1с → 30с), максимум 8 попыток; 4xx = non-retriable (fail сразу).
- `setOnline(true)` — триггерит обработку; `subscribe(cb)` — для UI-индикаторов.

#### apps/tv-app/src/core/network.ts
- `NetworkMonitor`: подписка на `online`/`offline` события окна + опциональный health-probe (`healthUrl` каждые 15с).
- `subscribe(cb)` сразу отдаёт текущее состояние. `probe()` вручную вызывается кнопкой из экрана offline.

#### apps/tv-app/src/i18n/{ru,en}.json
- Добавлены ключи: `lock.*`, `offline.*`.

#### apps/tv-app/src/styles/main.css
- Дизайн-токены (CSS-переменные) — темная тема, safe-area 5% (overscan, `docs/06-tizen.md:118`).
- Базовый шрифт 24px, крупные плитки, фокус-рамка `outline` через `box-shadow` + масштаб (`docs/06-tizen.md:113`).
- Классы: `.home`, `.tile`, `.stub`, `.modal-backdrop`, `.btn*`, `.lang-toggle`.

#### apps/tv-app/src/data/mocks.ts
- Моки на время отсутствия backend: `mockBooking` (гость+номер), `mockMenu` (3 блюда).
- Уйдут при подключении реального API (Фаза 1, `docs/07-roadmap.md:61`).

---

## 4. Журнал изменений (Changelog)

> Одна запись на PR/мерж в `main` или `develop`. Самые новые — сверху.
> Что писать: дата, что изменилось, где (пути), что обновить в разделах 1–3 выше.

### 2026-08-09 — закрытие Спринта 1.1: сеть, offline, Lock
- Сетевой слой: `core/api-client.ts` (ETag+304 кэш, Idempotency-Key, таймаут, единый `ApiError`), `core/mutation-queue.ts` (persist в localStorage, backoff 1с→30с, до 8 попыток, 4xx = non-retriable), `core/network.ts` (`NetworkMonitor` — onLine + опц. health-probe).
- Новые экраны: `screens/lock.ts` (Welcome-экран, вход на home), `screens/offline.ts` (полноэкранный «нет сети» с автовыходом при восстановлении).
- Фиксированный баннер `.offline-banner` в `main.ts` — показывается при потере связи, i18n RU/EN.
- `main.ts` теперь стартует с экрана `lock`, интегрирует `ApiClient`+`MutationQueue`+`NetworkMonitor`, читает env `VITE_API_BASE`/`VITE_HEALTH_URL`.
- i18n словари дополнены `lock.*`, `offline.*` (RU/EN).
- Сборка: JS 18.22 KB / gzip 6.88 KB (бюджет 250 KB, 6% использовано).
- Спринт 1.1 закрыт полностью (без бэкенда — очередь работает, но реальный POST появится в Спринте 1.2).
- Ветка: `claude/repo-exploration-d5088t`.

### 2026-08-09 — каркас `apps/tv-app` (Спринт 1.1, часть)
- Инициализирован pnpm-workspace: `pnpm-workspace.yaml`, корневой `package.json`, `.gitignore`.
- Создан каркас TV-приложения в `apps/tv-app/`:
  - Vite + TypeScript (target ES2017), Tizen-манифест `config.xml`.
  - Ядро: фокус-движок (spatial navigation), роутер со стеком экранов и восстановлением фокуса, обработка клавиш пульта (D-pad, Back=10009, Exit).
  - i18n RU/EN с `t(key, {params})` и `localStorage`-переключателем.
  - Главное меню (6 плиток) + универсальный экран-заглушка для модулей.
  - Модалка подтверждения выхода на Back из корня.
  - Моки: `mockBooking`, `mockMenu` (уйдут при подключении API).
- Сборка проверена: `pnpm --filter tv-app build` → JS 9.49 КБ / gzip 3.96 КБ (бюджет 250 КБ).
- Ветка: `claude/repo-exploration-d5088t`.
- Что дальше (Спринт 1.2): экран Lock (PIN), backend auth+booking, замена моков на API.

### 2026-08-09 — инициализация NAVIGATION.md
- Добавлен этот файл (`NAVIGATION.md`) как единая точка навигации по проекту.
- Изменений в коде нет — репозиторий по-прежнему в статусе документации (см. `README.md`).
- Ветка: `claude/repo-exploration-d5088t`.

---

## 5. Правила поддержки этого файла (обязательно)

1. **Каждый PR, который добавляет/удаляет/переименовывает файлы или папки в `apps/`, `packages/`, `infra/`, обязан**:
   - обновить таблицу в разделе 1 (статус ✅/⏳/❌ для затронутых папок);
   - добавить или обновить запись в разделе 3 (файловый индекс) для новых/значимо изменённых файлов;
   - добавить запись в раздел 4 (Changelog) — дата, суть изменения, затронутые пути.
2. Ревьюер PR должен проверять обновление `NAVIGATION.md` наравне с кодом — PR без обновления навигации для нетривиальных изменений не мержится.
3. Индексируем **не каждую строку**, а логические блоки/функции/секции — файл должен оставаться читаемым за 1–2 минуты.
4. Если файл разрастётся (после Фазы 2-3), можно разбить раздел 3 по приложениям (`NAVIGATION.md` → ссылки на `apps/tv-app/NAVIGATION.md` и т.д.) — но верхнеуровневая карта (раздел 1) остаётся в корне.
