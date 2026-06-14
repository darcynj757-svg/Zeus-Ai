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
  - `POST /api/projects/:id/publish` — публикация текущих файлов на стабильном URL
  - `GET /api/projects/:id/published` — статус публикации (published bool, slug, publicUrl)
  - Инъекция `zeusContext` в промпт перед каждой итерацией

- **Публичный хостинг:** `artifacts/api-server/src/routes/sites.ts`
  - `GET /sites/:slug` → отдаёт `index.html` из `published_sites`
  - `GET /sites/:slug/*filePath` → отдаёт конкретный файл (Express 5: именованный wildcard `*filePath`)
  - Content-Type по расширению: `.html/.css/.js/.json/.svg/.png/.jpg/.ico`
  - SPA-fallback: если файл не найден → возвращает `index.html`
  - Монтируется на `app.use('/sites', sitesRouter)` — ДО `/api`, без аутентификации

- **БД клиент:** `lib/db/src/index.ts`
  - Авто-выбор драйвера: `neon.tech` в URL или `USE_NEON=1` → `neon-serverless`; иначе → `node-postgres`
  - Лог при старте: `[db] driver: neon-serverless` / `[db] driver: node-postgres`

- **Фронтенд:**
  - `artifacts/vibe-coding/src/pages/home.tsx` — `PublishButton` в шапке `Header` (рядом с project select)
    - При загрузке проекта — GET `/api/projects/:id/published`, показывает текущий URL если опубликован
    - Кнопка «Публикация» → POST publish → показывает slug + кнопки Copy / Open / «Обновить»
    - Re-publish: кнопка «Обновить» рядом с копированием, slug не меняется
  - `artifacts/vibe-coding/vite.config.ts` — vite-прокси: `/api` и `/sites` → `http://localhost:8080`

- **4 типа проекта:**

  | Тип | Описание |
  |-----|----------|
  | `landing` | Многосекционный лендинг: navbar, hero, features, pricing, testimonials, footer |
  | `app` | SPA на React 18 via CDN — useState/useEffect/useReducer, localStorage, несколько экранов |
  | `shop` | Интернет-магазин: каталог, фильтры, корзина, localStorage-персистентность |
  | `card` | Одностраничная визитка (100vh): аватар, соцсети, dark/light toggle |

---

## Дорожная карта

### Этап 1 — Ядро генерации (ЗАКРЫТ)
- [x] Сквозная генерация + деплой E2B
- [x] Дизайн-движок (CSS vars, шрифты Google, адаптив mobile-first, анимации scroll-reveal)
- [x] Тип-зависимая генерация — 4 типа с отдельными промптами
- [x] UI-выбор типа проекта — таб-кнопки в стиле Blink над полем ввода
- [ ] Опционально: 5-й тип `portfolio` (секции: проекты, навыки, контакт)
- [ ] Tooltip с кратким описанием типа при наведении

### Этап 2 — Качество (ЗАКРЫТ ✅)
- [x] **Plan Mode** — Zeus показывает план перед генерацией
- [x] **Память проекта `zeus.md`** — накопленный бренд-контекст между итерациями
- [x] **Надёжность деплоя E2B** — ретраи, таймауты, graceful fallback
- [x] **Итеративное редактирование** — патчит ТОЛЬКО затронутый файл
- [x] **Апгрейд качества генерации** — реальные фото, Lucide-иконки, AOS + Animate.css, рихтый JS-интерактив

### Этап 3 — Платформа (ЗАКРЫТ ✅)
- [x] Роутинг моделей: Lite (gpt-4o-mini) / Power (gpt-4o)
- [x] Чекпоинты-снапшоты с возможностью отката к предыдущей версии
- [x] **Neon-ready Postgres** — авто-выбор драйвера по DATABASE_URL (node-postgres ↔ neon-serverless)
- [x] **Постоянный хостинг (Publish)** — стабильный `/sites/:slug` URL без E2B, upsert по projectId, slug не меняется при re-publish

### Этап 4 — DevOps (следующий)
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
| `eb4f78a` | Add support for Neon serverless Postgres database connections |
| `4c0db09` | Add persistent hosting for generated sites |
| `4c0db09` | Improve website generation quality with real images and animations |
| `(pending)` | Fix broken image sources: replace source.unsplash.com with loremflickr/picsum + onerror fallback |

---

## Правила работы

- **Атомарные коммиты:** одна фича = один коммит с осмысленным сообщением на английском.
- **Пуш на GitHub делает пользователь вручную** — агент только создаёт коммит.
- **Не ломать:**
  - Строгий JSON-формат ответа OpenAI: `{ files: [{path, content}], message }` — любое отклонение ломает парсер.
  - Модель `gpt-4o`, `temperature: 0.2`, `max_tokens: 16000` — не менять без согласования.
  - Деплой E2B — `python3 -m http.server 3000`, без build-шага, файлы работают в браузере напрямую (CDN).
  - `sandbox.ts` не трогать без явной задачи по деплою.
  - Express 5 wildcard в router: `/*named` (именованный) — НЕ `/*` (вызывает PathError в path-to-regexp@8).
- **Правило обновления:** в конце каждого рабочего шага обновлять этот файл:
  1. Отметить выполненные пункты `[x]`
  2. Дописать новый коммит в журнал
  3. Обновить блок «ТОЧКА ВХОДА ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ»
  4. Закоммитить `CLAUDE_CONTEXT.md` вместе с кодом изменений

---

## ТОЧКА ВХОДА ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ

### Последний выполненный шаг
**Критический фикс — источники изображений** (коммит «Fix broken image sources: replace source.unsplash.com with loremflickr/picsum + onerror fallback»)

**⚠️ ВАЖНО: source.unsplash.com СЛОМАН — возвращает HTTP 503**
Никогда не использовать `source.unsplash.com` в промптах или коде — он задеприкейчен и отдаёт 503 для всех запросов.

**Что сделано (файл `artifacts/api-server/src/lib/openai.ts`):**
- **CDN WHITELIST** обновлён: убран `source.unsplash.com`, добавлен `loremflickr.com`; разрешены: `loremflickr.com`, `images.unsplash.com`, `picsum.photos`
- **IMAGES секция** переписана:
  - Hero/тематические фото → `https://loremflickr.com/<W>/<H>/<keyword>` (один keyword, без пробелов, возвращает 200)
  - Карточки/нейтральные → `https://picsum.photos/seed/<seed>/<W>/<H>` (без изменений)
  - Допускается `https://images.unsplash.com/photo-<ID>` с конкретными photo-id
  - Обязательный `onerror` фоллбэк на каждом `<img>`: `onerror="this.onerror=null;this.src='https://picsum.photos/seed/'+Math.random()+'/800/600'"`
- **TYPE_PROMPTS** (landing, shop) — hero фото обновлены с `source.unsplash.com` на `loremflickr.com`
- **EDIT_SYSTEM_PROMPT** — QUALITY PRESERVATION обновлён: не вводить source.unsplash.com, сохранять onerror фоллбэки
- **QUALITY BAR** — добавлен чеклист onerror фоллбэка

**E2E тест ПРОЙДЕН** (проект id=3, «Brava Coffee» лендинг, tier=power):
- deployError=null ✓
- E2B previewUrl HTTP 200 ✓
- `source.unsplash.com` в index.html — отсутствует ✓
- `loremflickr.com` в index.html — присутствует ✓
  - `https://loremflickr.com/1600/900/coffee` → HTTP 200 (подтверждено curl -L) ✓
- `onerror` фоллбэк на img-тегах — присутствует ✓
- picsum.photos для карточек — присутствует ✓

### Следующий шаг — Этап 4 (DevOps)

**Возможные задачи (по приоритету):**
1. **Биллинг/лимиты** — лимит X генераций/публикаций на пользователя (нужна auth)
2. **Кастомные домены** — привязка к `published_sites`: поле `customDomain`, CNAME-инструкция
3. **Изоляция E2B-песочниц** — firewall, network policies
4. **Автомасштабирование E2B-пулов** — пул прогретых песочниц

**Инварианты (не менять):**
- JSON `{ files: [{path, content}], message }` — парсер не трогать
- E2B: `python3 -m http.server 3000`, без build-шага
- `zeusContext` подмешивать при любом режиме генерации
- Express 5 wildcards — только именованные (`/*name`)
- Vite proxy: `/api` и `/sites` → port 8080
- Воркфлоу: два отдельных воркфлоу — `API Server` (port 8080) + `Web Frontend` (port 18572)
- **⚠️ Изображения: `source.unsplash.com` = 503, ЗАПРЕЩЁН.** Использовать только:
  - `loremflickr.com/<W>/<H>/<keyword>` — hero и тематические фото
  - `picsum.photos/seed/<seed>/<W>/<H>` — нейтральные/карточки
  - `images.unsplash.com/photo-<ID>` — только с конкретными photo-id
  - Каждый `<img>` обязан иметь `onerror` фоллбэк на picsum

---

## Протокол онбординга нового Replit-аккаунта (ОБЯЗАТЕЛЬНО)

Эти правила обязательны для любого агента, работающего с этим проектом после импорта.

**1. Единственный источник правды — GitHub.**
Репо `darcynj757-svg/Zeus-Ai`, ветка `origin/main` — это рабочая версия. Всё остальное (локальные коммиты, checkpoint-коммиты Replit) подчинено ей.

**2. Сразу после импорта — синхронизировать HEAD с origin/main.**
```bash
git fetch origin
git reset --hard origin/main
```
Локальный `HEAD` должен совпадать с `origin/main`. Никогда не оставлять технические / checkpoint-коммиты (типа "Saved progress", "Add integrations", "Add audio and chat integrations for AI features") наслоенными поверх `origin/main`.

**3. Если `git status` показывает `ahead` — откатить.**
Лишние коммиты поверх `origin/main` нужно убрать через `git reset --hard origin/main`. Не пушить их.

**4. Зависимости, миграции и порты — без коммитов.**
```bash
pnpm install --frozen-lockfile        # восстановить node_modules
pnpm --filter @workspace/db run push  # drizzle-миграции
```
Порты: frontend `18572`, api `8080`, mockup-sandbox `8081`. Конфиг в `.replit`. Чинить без создания git-коммитов.

**5. OpenAI и E2B — только наши секреты.**
- Использовать `OPENAI_API_KEY` из Replit Secrets (наш ключ).
- Использовать `E2B_API_KEY` из Replit Secrets (наш ключ).
- **НЕ подключать встроенную Replit AI Integration** (`blueprint:javascript_openai_ai_integrations` и т.п.) — она сломает движок генерации (подменяет `baseURL`) и биллится с кредитов Replit.

**6. Дисциплина коммитов.**
- Каждая фича — отдельный атомарный коммит с осмысленным сообщением.
- После каждого изменения обновлять `CLAUDE_CONTEXT.md`.
- **Не пушить** — пользователь пушит вручную.
