# CLAUDE_CONTEXT.md — Память AI-ассистента по проекту Zeus AI

> Обновляй этот файл в конце каждого шага: отмечай выполненные пункты [x], дописывай в журнал коммитов, указывай следующий шаг.

---

## О проекте

Zeus AI — аналог Replit: AI-платформа, генерирует сайты/приложения из текстового промпта (модель gpt-4o) и деплоит их в песочницу E2B.

**GitHub:** darcynj757-svg/Zeus-Ai

---

## Архитектура и ключевые файлы

- **Движок генерации:** `artifacts/api-server/src/lib/openai.ts`
  - `TYPE_PROMPTS` — промпты для 4 типов проекта (landing / app / shop / card)
  - `getTypePrompt(projectType)` — выбирает нужный промпт (fallback → landing)
  - `generateWithOpenAI` / `streamWithOpenAI` — вызов gpt-4o, строгий JSON-ответ `{ files: [{path, content}], message }`
  - `generatePlan(prompt, projectType)` — Plan Mode, возвращает `{title, sections[], techNotes}`
  - `generateZeusMd(files, projectType)` — извлекает бренд-контекст, сохраняет в `project.zeusContext`
  - `SYSTEM_PROMPT` — общий дизайн-движок (CSS vars, типографика, адаптив, анимации, семантика)

- **Песочницы:** `artifacts/api-server/src/lib/sandbox.ts`
  - E2B-интеграция, запуск `python3 -m http.server 3000` внутри изолированной среды
  - `withRetry(fn, 3, 1500ms)` + `Promise.race` 60s таймаут + `DeployError` с кодом причины

- **API маршруты:** `artifacts/api-server/src/routes/projects.ts`
  - `POST /api/projects/:id/generate` — генерация + деплой (SSE + JSON fallback)
  - `POST /api/projects/plan` — Plan Mode
  - Инъекция `zeusContext` в промпт перед каждой итерацией

- **БД клиент:** `lib/db/src/index.ts`
  - Авто-выбор драйвера по DATABASE_URL: `neon.tech` в хосте или `USE_NEON=1` → `drizzle-orm/neon-serverless` + `@neondatabase/serverless` Pool + `ws`; иначе → `drizzle-orm/node-postgres` + `pg.Pool`
  - При старте выводит в лог: `[db] driver: neon-serverless` или `[db] driver: node-postgres`
  - `drizzle.config.ts` и схема (`postgresql`) не менялись — работают с обоими драйверами

- **Фронтенд:**
  - `artifacts/vibe-coding/src/pages/landing.tsx` — главная страница; выбор типа проекта реализован таб-кнопками в стиле Blink (горизонтальный ряд иконка+метка, встроен в верхнюю часть input-блока над textarea); `projectType` пишется в `sessionStorage` под ключом `zeus_project_type`
  - `artifacts/vibe-coding/src/pages/home.tsx` — рабочая зона; читает `zeus_project_type` из `sessionStorage`, передаёт в `createProject({ data: { projectType } })`, далее API → `getTypePrompt(projectType)`

- **4 типа проекта:**

  | Тип | Описание |
  |-----|----------|
  | `landing` | Многосекционный лендинг: navbar, hero, features, pricing, testimonials, footer |
  | `app` | SPA на React 18 via CDN — useState/useEffect/useReducer, localStorage, несколько экранов |
  | `shop` | Интернет-магазин: каталог, фильтры, корзина, localStorage-персистентность |
  | `card` | Одностраничная визитка (100vh): аватар, соцсети, dark/light toggle |

---

## Дорожная карта

### Этап 1 — Ядро генерации (почти готово)
- [x] Сквозная генерация + деплой E2B
- [x] Дизайн-движок (CSS vars, шрифты Google, адаптив mobile-first, анимации scroll-reveal)
- [x] Тип-зависимая генерация — 4 типа с отдельными промптами
- [x] UI-выбор типа проекта — таб-кнопки в стиле Blink над полем ввода
- [ ] Опционально: 5-й тип `portfolio` (секции: проекты, навыки, контакт)
- [ ] Tooltip с кратким описанием типа при наведении

### Этап 2 — Качество
- [x] **Plan Mode** — Zeus сначала показывает план (секции/компоненты), пользователь утверждает, потом генерирует
- [x] **Память проекта `zeus.md`** — накопленный бренд-контекст между итерациями
- [x] **Надёжность деплоя E2B** — ретраи, таймауты, graceful fallback
- [x] **Итеративное редактирование** — патчит ТОЛЬКО затронутый файл, не регенерит всё

### Этап 3 — Платформа
- [x] Роутинг моделей: Lite (gpt-4o-mini) / Power (gpt-4o)
- [x] Чекпоинты-снапшоты с возможностью отката к предыдущей версии
- [x] **Neon-ready Postgres** — авто-выбор драйвера по DATABASE_URL (node-postgres ↔ neon-serverless)
- [ ] Деплой/хостинг готового приложения пользователя (кастомный домен)

### Этап 4 — DevOps (позже)
- [ ] Изоляция песочниц (firewall, сетевые политики)
- [ ] Автомасштабирование E2B-пулов
- [ ] Биллинг и лимиты на генерацию
- [ ] Поддержка кастомных доменов

---

## Журнал коммитов

| Хэш | Сообщение |
|-----|-----------|
| `4b75555` | Add project memory file for AI assistant (CLAUDE_CONTEXT.md) |
| `d6da99c` | Update the layout of project type selection to match Blink's style |
| `d942a77` | Add visual project type selection cards to the main page |
| `b3523be` | Saved progress at the end of the loop |
| `8af8e0f` | Tailor website generation to specific project types |
| `163da0a` | Add Plan Mode to preview project structure before code generation |
| `3e15dc0` | Add zeus.md project memory for brand-consistent iterations |
| `40fc903` | Add reliable deployment with retries and error handling |
| `21c85d4` | Add checkpoint snapshots with rollback functionality |
| `(pending)` | Add Neon serverless Postgres support |

---

## Правила работы

- **Атомарные коммиты:** одна фича = один коммит с осмысленным сообщением на английском.
- **Пуш на GitHub делает пользователь вручную** — агент только создаёт коммит.
- **Не ломать:**
  - Строгий JSON-формат ответа OpenAI: `{ files: [{path, content}], message }` — любое отклонение ломает парсер.
  - Модель `gpt-4o`, `temperature: 0.2`, `max_tokens: 16000` — не менять без согласования.
  - Деплой E2B — `python3 -m http.server 3000`, без build-шага, файлы работают в браузере напрямую (CDN).
  - `sandbox.ts` не трогать без явной задачи по деплою.
- **Правило обновления:** в конце каждого рабочего шага обновлять этот файл:
  1. Отметить выполненные пункты `[x]`
  2. Дописать новый коммит в журнал
  3. Обновить блок «ТОЧКА ВХОДА ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ»
  4. Закоммитить `CLAUDE_CONTEXT.md` вместе с кодом изменений

---

## ТОЧКА ВХОДА ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ

### Последний выполненный шаг
**Этап 3, шаг 3 — Neon-ready Postgres** (коммит «Add Neon serverless Postgres support»)

**Что сделано:**
- `lib/db/package.json`: добавлены `@neondatabase/serverless ^1.1.0` и `ws ^8.21.0`
- `lib/db/src/index.ts`: авто-выбор драйвера по DATABASE_URL:
  - если хост содержит `neon.tech` или `USE_NEON=1` → `drizzle-orm/neon-serverless` + `@neondatabase/serverless` Pool + `ws` WebSocket
  - иначе → `drizzle-orm/node-postgres` + `pg.Pool` (текущее поведение без изменений)
  - лог при старте: `[db] driver: neon-serverless` / `[db] driver: node-postgres`
- `drizzle.config.ts`, схема, миграции — не изменялись; dialect `postgresql` работает с обоими драйверами
- Все инварианты сохранены: JSON-парсер, модельный роутинг, E2B, zeusContext, retries, edit, чекпоинты

**Живые тесты пройдены (Replit Helium Postgres → node-postgres):**
- `[db] driver: node-postgres` появляется в логе при старте ✓
- Создан проект + генерация lite → 3 файла в таблице `files`, 1 строка в `projects` ✓
- `deployError: NULL`, `previewUrl` отдаёт HTTP 200 ✓

### Чтобы включить Neon
1. Зайти в Replit Secrets → заменить `DATABASE_URL` на строку подключения Neon (`postgresql://user:pass@xxx.neon.tech/dbname?sslmode=require`)
2. Перезапустить воркфлоу — в логе появится `[db] driver: neon-serverless`
3. Применить схему: `pnpm --filter @workspace/db run push`

### Следующий шаг — Этап 3, шаг 4 (Деплой/хостинг)

**Задача:** Деплой/хостинг готового приложения пользователя — постоянный URL вместо временного E2B-превью (кастомный домен или Replit Deploy).

**Инварианты (не менять):**
- JSON `{ files: [{path, content}], message }` — парсер не трогать
- E2B: `python3 -m http.server 3000`, без build-шага
- `zeusContext` подмешивать при любом режиме генерации
- Воркфлоу: `PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=5000 BASE_PATH=/ pnpm --filter @workspace/vibe-coding run dev`
- `tier` передавать из UI во все запросы generate/edit/plan
