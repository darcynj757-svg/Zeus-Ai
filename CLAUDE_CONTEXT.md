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
  - Backend: `generatePlan(prompt, projectType)` в `openai.ts` → gpt-4o → JSON `{title, sections[], techNotes}`
  - API: `POST /api/projects/plan` в `projects.ts`
  - Frontend: переключатель "Plan Mode" в заголовке чата; план отображается карточкой с кнопками "Сгенерировать" / "Изменить запрос"; при подтверждении план вшивается в промпт генерации
- [x] **Память проекта `zeus.md`** — накопленный бренд-контекст между итерациями
  - DB: колонка `zeus_context text` в `projectsTable`
  - `generateZeusMd(files, projectType)` в `openai.ts` → gpt-4o → извлекает palette/fonts/tone/sections → возвращает Markdown
  - Инъекция контекста в `userMessageContent` перед каждой итерацией (если `project.zeusContext` не null)
  - Асинхронное сохранение в DB после генерации (не блокирует SSE/JSON ответ)
- [x] **Надёжность деплоя E2B** — ретраи, таймауты, graceful fallback
  - `withRetry(fn, 3, 1500ms)` с экспоненциальным backoff + jitter в `sandbox.ts`
  - Общий таймаут 60s через `Promise.race` + `TIMEOUT` код ошибки
  - Структурированный `DeployError` с кодом (`SANDBOX_CREATE` / `FILE_WRITE` / `SERVER_START` / `PORT_TIMEOUT` / `TIMEOUT`)
  - SSE: статусы «попытка N/3» при retry; `done`-событие содержит `deployError` (не блокирует пользователя)
  - Frontend: `toast.warning` при `deployError`, статус «Готово (деплой не удался)» вместо зависания
- [x] **Итеративное редактирование** — "измени цвет кнопок на красный" патчит ТОЛЬКО затронутый файл, не регенерит всё

### Этап 3 — Платформа
- [ ] Роутинг моделей: Lite (gpt-4o-mini) / Economy / Power (gpt-4o)
- [ ] Чекпоинты-снапшоты с возможностью отката к предыдущей версии
- [ ] Managed Postgres (Neon) вместо SQLite
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
| `(pending)` | Add iterative editing to patch only changed files |

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
**Этап 2 полностью закрыт — Итеративное редактирование** (коммит «Add iterative editing to patch only changed files»)

**Что сделано:**
- `artifacts/api-server/src/lib/openai.ts`: добавлена `editProject(existingFiles, instruction, zeusContext)` — gpt-4o, temp 0.2, max_tokens 16000, возвращает ТОЛЬКО изменённые файлы
- `artifacts/api-server/src/routes/projects.ts`: добавлен `POST /api/projects/:id/edit` — читает файлы из DB, вызывает `editProject`, upsert по path, деплоит через `deployToSandbox` с retries, возвращает `{message, patchedFiles, filesBefore, allFiles, previewUrl, deployError}`
- `artifacts/vibe-coding/src/pages/home.tsx`: добавлена панель «Редактировать» внизу чата (видна после генерации), инпут + кнопка «Патч», `handleEdit` вызывает `/edit`, обновляет превью, toast с информацией о кол-ве патченых файлов

**Живой тест пройден:**
- Сгенерирован BrightDesk лендинг: `filesBefore = ['index.html', 'script.js', 'style.css']`
- Патч «измени цвет кнопок на красный»: `patchedFiles = ['style.css']` — только 1 из 3 файлов
- `index.html`, `script.js` — не тронуты
- E2B вернул previewUrl, deployError = null

### Следующий шаг — Этап 3 (Платформа)

**Приоритетные задачи:**

1. **Роутинг моделей** — переключатель Lite / Power в UI:
   - Lite: `gpt-4o-mini` (быстро, дёшево, для простых правок)
   - Power: `gpt-4o` (полная мощь, для первой генерации и сложных задач)
   - Добавить параметр `model` в `generateWithOpenAI`, `editProject`, эндпоинты
   - UI: переключатель в `ChatPanel` заголовке

2. **Чекпоинты / снапшоты** — возможность откатить проект к предыдущей версии:
   - Новая таблица `snapshots` (projectId, files JSON, createdAt, label)
   - `POST /api/projects/:id/snapshot` — создать снапшот
   - `POST /api/projects/:id/restore/:snapshotId` — восстановить
   - Авто-снапшот перед каждой генерацией/edit
   - UI: кнопка «История» с выпадающим списком снапшотов

**Инварианты (не менять):**
- JSON `{ files: [{path, content}], message }` — парсер не трогать
- E2B: `python3 -m http.server 3000`, без build-шага
- `zeusContext` подмешивать при любом режиме генерации
- Воркфлоу запускается командой: `PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=18572 BASE_PATH=/ pnpm --filter @workspace/vibe-coding run dev`
