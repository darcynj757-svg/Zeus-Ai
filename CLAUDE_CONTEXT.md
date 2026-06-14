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
| `(pending)` | Add persistent hosting for generated sites |
| `(pending)` | Upgrade generation prompt: real images, icons, animations, richer interactivity |

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
**Этап 2 апгрейд — Качество генерации** (коммит «Upgrade generation prompt: real images, icons, animations, richer interactivity»)

**Что сделано:**
Файл `artifacts/api-server/src/lib/openai.ts` — полная перезапись `SYSTEM_PROMPT`, `TYPE_PROMPTS` (landing, app, shop, card) и `EDIT_SYSTEM_PROMPT`.

Добавлены новые обязательные секции в `SYSTEM_PROMPT`:
- **CDN WHITELIST** — разрешённые домены: fonts.google.com, unpkg.com, cdn.jsdelivr.net, cdnjs.cloudflare.com, source.unsplash.com, images.unsplash.com, picsum.photos. Другие — запрещены.
- **IMAGES** — обязательные реальные `<img>` с `source.unsplash.com/1600x900/?TOPIC` для hero и `picsum.photos/seed/SEED/W/H` для карточек; `alt`, `loading="lazy"`, `object-fit: cover` обязательны.
- **ICONS** — Lucide CDN через `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js">`, элементы `<i data-lucide="NAME">`, `lucide.createIcons()` в конце `script.js`.
- **ANIMATIONS** — AOS 2.3.4 (cdn.jsdelivr.net) + Animate.css 4.1.1 (cdnjs); `AOS.init({duration:700,once:true,offset:80})` в `script.js`; `data-aos="fade-up"` на секциях, `data-aos-delay` для stagger карточек; `animate__fadeInDown/Up` на hero headline/subheadline.
- **INTERACTIVITY** — полный набор: hamburger с Lucide menu/x, navbar scroll `.scrolled`, smooth scroll, active nav link, form validation, tabs/accordion, AOS.init + lucide.createIcons всегда в DOMContentLoaded.
- **QUALITY BAR** расширен — 12 чеклистов включая все новые требования.

Обновлены `TYPE_PROMPTS`:
- `landing`: иконки — Lucide (было Unicode/emoji); testimonial аватары — picsum; секции получили data-aos.
- `shop`: product images — `picsum.photos/seed/PRODUCTNAME/400/300` (было «coloured rectangle»); hero — Unsplash; иконки — Lucide.
- `app`: добавлено упоминание Lucide + AOS где уместно.
- `card`: иконки контактов/соцсетей — Lucide; dark/light toggle — Lucide sun/moon.

`EDIT_SYSTEM_PROMPT`: добавлена секция **QUALITY PRESERVATION** — при любом редактировании сохранять img-теги, Lucide, AOS, интерактив.

**E2B — интернет есть**: `Sandbox.create()` без ограничений, все CDN и внешние URL доступны в превью.

**E2E тест ПРОЙДЕН** (проект id=2, «Brava Coffee» лендинг, tier=power):
- deployError=null ✓
- previewUrl активен, HTTP 200 ✓
- `<img src="https://source.unsplash.com/1600x900/?coffee,cozy,cafe">` в index.html ✓
- `<img src="https://picsum.photos/seed/...">` в testimonials ✓
- `unpkg.com/lucide` script подключён ✓
- AOS CSS+JS через cdn.jsdelivr.net ✓
- Animate.css через cdnjs.cloudflare.com ✓
- `data-aos="fade-up"`, `data-aos="zoom-in"` на секциях и карточках ✓
- `animate__animated animate__fadeInDown/Up` на hero ✓
- `AOS.init({ duration: 700, once: true, offset: 80 })` в script.js ✓
- `lucide.createIcons()` в script.js ✓
- Hamburger + smooth scroll в script.js ✓

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
- Воркфлоу: два отдельных артефакт-воркфлоу — `artifacts/api-server: API Server` (port 8080) + `artifacts/vibe-coding: web` (port 18572)
- Легаси комбинированный воркфлоу `Zeus AI Stack` удалён (конфликтовал с EADDRINUSE). Актуальные воркфлоу: `artifacts/vibe-coding: web` + `artifacts/api-server: API Server`.

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
