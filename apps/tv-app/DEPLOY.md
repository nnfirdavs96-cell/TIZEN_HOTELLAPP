# Установка Hotel Guest App на реальный Samsung TV

Инструкция для запуска TV-приложения на настоящем телевизоре Samsung.
Для моделей **2020+ (Tizen 5.5 / 6 / 7 / 8 / 9)** — всё работает без ограничений.

> Быстрый путь: **Tizen Studio (GUI)** — проще для первого раза.
> Путь для CI/повторов: **Tizen CLI** — команды в конце.

---

## 0. Что понадобится

| Что | Зачем |
|-----|-------|
| Компьютер (Windows / macOS / Linux) | Здесь ставится Tizen Studio |
| **Tizen Studio** (с TV Extension) | Сборка `.wgt`, сертификат, установка на ТВ |
| **Samsung Account** | Для Samsung-сертификата (нужен, чтобы ТВ принял приложение) |
| ТВ и компьютер в **одной Wi-Fi/LAN сети** | Установка идёт по сети |
| IP-адрес компьютера | Вводится на ТВ в режиме разработчика |

Скачать Tizen Studio: https://developer.tizen.org/development/tizen-studio/download
При установке через **Package Manager** добавь: `TV Extensions` → `TV Extensions-x.x`.

---

## 1. Включить режим разработчика на ТВ

1. На ТВ открой **Apps** (Приложения).
2. На пульте набери цифры **1 2 3 4 5** — откроется окно *Developer Mode*.
3. Переключи **Developer Mode → On**.
4. В поле **Host PC IP** введи **IP твоего компьютера** (где Tizen Studio).
5. Нажми OK и **перезагрузи ТВ** (выключи-включи).

> IP компьютера: Windows — `ipconfig`; macOS/Linux — `ifconfig` или `ip addr`.
> Это адрес вида `192.168.x.x` в той же сети, что и ТВ.

---

## 2. Собрать веб-часть

Из корня репозитория:

```bash
pnpm install
pnpm --filter tv-app build
```

Результат — папка `apps/tv-app/dist/`, уже содержащая всё для упаковки:
`index.html`, `assets/`, `config.xml`, `icon.png`.

> Сборка кладёт `config.xml` и `icon.png` в `dist/` автоматически
> (скрипт `scripts/prepare-wgt.mjs`).

---

## 3. Создать сертификат (один раз)

Без подписи ТВ не установит приложение.

1. Tizen Studio → **Tools → Certificate Manager**.
2. **+** → **Samsung** (не Tizen!) → *Create a new certificate*.
3. Тип профиля: **TV**.
4. Войди в **Samsung Account**.
5. **Author certificate** — придумай пароль, сохрани.
6. **Distributor certificate** — на шаге *DUID* нужно указать твой ТВ:
   - Подключись к ТВ (см. шаг 4), тогда Device Manager покажет DUID автоматически,
   - либо возьми DUID из окна Developer Mode на ТВ.
7. Готово — профиль активен (Certificate Manager показывает его как *Active*).

> DUID привязывает сертификат к конкретному ТВ — это норма для dev-установки.
> Для парка ТВ в отеле (Фаза 4) используется партнёрский/дистрибьюторский
> сертификат или Samsung Business (SSSP) — см. `docs/06-tizen.md`.

---

## 4. Подключить ТВ к Tizen Studio

1. Tizen Studio → **Tools → Device Manager**.
2. **+ (Remote Device)** → введи **IP твоего ТВ** (не компьютера!), порт `26101`.
3. Переключи соединение в **On**. На ТВ может выскочить запрос — разреши.
4. ТВ появится в списке со статусом подключён.

> IP телевизора: на ТВ *Настройки → Общие → Сеть → Состояние сети*,
> либо оно же видно в окне Developer Mode.

---

## 5А. Установка через Tizen Studio (GUI) — рекомендуется

1. **File → Import → Tizen → Tizen Project**.
2. Укажи папку `apps/tv-app/dist` (там уже `config.xml`) → Finish.
3. Правый клик по проекту → **Run As → Tizen Web Application**.
4. Выбери свой ТВ как цель.

Приложение соберётся в `.wgt`, подпишется активным сертификатом,
установится и запустится на ТВ. Готово — управляй пультом (D-pad + OK).

---

## 5Б. Установка через Tizen CLI (для повторов/CI)

`<tizen-studio>/tools/ide/bin/tizen` — добавь в `PATH`.

```bash
cd apps/tv-app/dist

# 1) упаковать и подписать (профиль из Certificate Manager, обычно "TV")
tizen package -t wgt -s TV -- .

# 2) узнать target id (имя устройства)
tizen install --help   # или: sdb devices
# подключить target, если нужно:
#   sdb connect <IP_ТВ>:26101

# 3) установить на ТВ
tizen install -n HotelGuest.wgt -t <target-id>
```

Запуск приложения:
```bash
tizen run -p HotelGuest.tvapp -t <target-id>
```

---

## 6. Что увидишь на ТВ

1. Экран **Lock** — «Добро пожаловать», кнопка «Войти» (OK на пульте).
2. Экран **входа** — переключение «Код брони / PIN», экранная клавиатура.
   - **Демо-креды** (mock-режим, без backend): код `ABC123` или PIN `4821`.
3. **Главное меню** — 6 плиток модулей (навигация стрелками).
4. «Регистрация» → детали брони → счёт → оформить выезд → успех.
5. Кнопка **Назад** на пульте — возврат; на главном — диалог выхода.

> Сейчас приложение работает в **mock-режиме** (без сервера).
> Чтобы подключить реальный backend — собери с `VITE_API_BASE`:
> ```bash
> VITE_API_BASE="http://<IP_сервера>:3000" pnpm --filter tv-app build
> ```
> (backend поднимается по `apps/api` — см. корневой README / docs).

---

## Частые проблемы

| Симптом | Причина / решение |
|---------|-------------------|
| ТВ не подключается в Device Manager | ТВ и ПК в разных сетях; неверный IP; не перезагрузил ТВ после Developer Mode; фаервол блокирует порт `26101` |
| «Certificate is invalid» при установке | DUID сертификата не совпадает с ТВ — пересоздай distributor-сертификат с DUID этого ТВ |
| Чёрный экран после запуска | Открой **Web Inspector** (в Device Manager кнопка *Inspect*) и смотри консоль; часто — пустой `VITE_API_BASE` не проблема (есть mock), проверь ошибки JS |
| Пульт не двигает фокус | Проверь, что элементы `data-focusable` видны; фокус-движок сам ищет ближайший — см. `src/core/focus-engine.ts` |
| Приложение не на весь экран | `config.xml` уже `screen-orientation="landscape"` + `viewmodes="maximized"` — переустанови `.wgt` |

---

## Параметры пакета (`config.xml`)

- **id:** `HotelGuest.tvapp` · **package:** `HotelGuest` (ровно 10 символов — требование Tizen).
- **required_version:** `4.0` (минимум по проекту; твой ТВ 2025 — заведомо выше, совместимо).
- **privileges:** `internet`, `tv.inputdevice` (клавиши пульта), `network.get`.
