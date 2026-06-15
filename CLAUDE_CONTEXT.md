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

- **5 типов проекта:**

  | Тип | Описание |
  |-----|----------|
  | `landing` | Многосекционный лендинг: navbar, hero, features, pricing, testimonials, footer |
  | `app` | SPA на React 18 via CDN — useState/useEffect/useReducer, localStorage, несколько экранов |
  | `shop` | Интернет-магазин: каталог, фильтры, корзина, localStorage-персистентность |
  | `card` | Одностраничная визитка (100vh): аватар, соцсети, dark/light toggle |
  | `portfolio` | Личный сайт-портфолио: (1) header/nav с якорями, (2) hero-фото+overlay+hero-stats, (3) grид проектов 4-6 кейсов с реальными фото, (4) skills с анимированными progress-барами (IntersectionObserver), (5) about в 2 колонки, (6) тёмные testimonials (glassmorphism), (7) contact-форма с JS-валидацией + соцсети Lucide, (8) footer |

- **6 визуальных стилей (STYLE_PROMPTS)** — ортогональны типу, применяются поверх SYSTEM_PROMPT:

  | Стиль | Ключевые маркеры CSS |
  |-------|---------------------|
  | `minimal` | Монохром #111 + один акцент; border-radius 4–10px; shadow none/0 1px 2px; нет translateY на картах; AOS fade-in только; section padding 160px max |
  | `bold` | font-weight 900 uppercase; radius 2–8px (почти sharp); offset border-left 4px primary на картах; section alternation включает полный primary-colour block |
  | `glass` | `backdrop-filter: blur(16px)` на ВСЕХ картах; rgba(255,255,255,0.20) фон карт; body gradient mesh; border rgba(255,255,255,0.45) |
  | `dark` | Весь фон #0a0a0f–#111118; neon violet+cyan акценты; `box-shadow: 0 0 30px rgba(neon,0.5)` glow; gradient text на hero headline |
  | `playful` | border-radius 28–32px; offset hard shadow `6px 6px 0px #1a1035`; bouncy cubic-bezier(0.68,-0.55,0.265,1.55); multicolor sections |
  | `elegant` | Serif display (Cormorant Garamond / Playfair Display); gold accent #c9a96e; radius 2–8px; section padding 200px max; AOS 900ms graceful |

---

## Дорожная карта

### Этап 1 — Ядро генерации (ЗАКРЫТ)
- [x] Сквозная генерация + деплой E2B
- [x] Дизайн-движок (CSS vars, шрифты Google, адаптив mobile-first, анимации scroll-reveal)
- [x] Тип-зависимая генерация — 4 типа с отдельными промптами
- [x] UI-выбор типа проекта — таб-кнопки в стиле Blink над полем ввода
- [x] 5-й тип `portfolio` (секции: проекты, навыки, контакт)
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
| `775a2fb` | Fix broken image sources: replace source.unsplash.com with loremflickr/picsum + onerror fallback |
| `e1bd0a5` | Enrich generated sites: mandatory multi-section images + stable unsplash sources |
| `(pending)` | Upgrade visual language: gradient hero, alternating sections, elevation system, hover lift |
| `(pending)` | Add portfolio project type with photo hero, work grid, animated skills, dark testimonials, contact form |
| `(pending)` | Harden generation: responsive breakpoints, perf resource hints, a11y focus/labels, reduced-motion |
| `(pending)` | Mobile-first hardening: safe-area, fluid type, auto-fit grids, sticky mobile CTA, no-CLS, touch targets |

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
**Апгрейд визуального языка — премиум-уровень** (коммит «Upgrade visual language: gradient hero, alternating sections, elevation system, hover lift»)

**Что изменено в `artifacts/api-server/src/lib/openai.ts`:**

#### DESIGN SYSTEM (SYSTEM_PROMPT)
- **Переменные CSS `:root`** — расширены:
  - Цвета: `--color-primary-light` (ультра-светлый тинт), `--color-accent`, `--color-dark: #0f1117`
  - Градиенты: `--gradient-hero` (полупрозрачный primary → dark), `--gradient-primary` (primary→accent), `--gradient-section-dark`
  - Тени (multi-level): `--shadow-sm/md/lg/xl` + `--shadow-glow`
  - Радиусы: `--radius-xl: 18px`, `--radius-2xl: 24px`

- **HERO (обязательная premium-обработка для КАЖДОГО типа):**
  1. `min-height: 100vh`, background photo layer (`<img>` position:absolute, z-index:0)
  2. Gradient overlay z-index:1: `var(--gradient-hero)` — `linear-gradient(135deg, rgba(primary, 0.75) → rgba(dark, 0.88))` **НЕ просто чёрный**
  3. Content z-index:2: headline 48–80px + Animate.css, подзаголовок, 2 CTA кнопки
  4. **Overlapping strip** внизу: `.hero-stats` с `margin-top:-40px; position:relative; z-index:10` — карточка «заходит» на следующую секцию

- **ЧЕРЕДОВАНИЕ ФОНОВ СЕКЦИЙ (обязательное правило):**
  - features → `var(--color-surface)` (тёплый off-white)
  - about → `var(--color-bg)` (белый)
  - gallery → `var(--color-primary-light)` (ультра-лёгкий тинт primary)
  - pricing → `var(--color-bg)`
  - testimonials → `var(--gradient-section-dark)` + белый текст (**тёмная секция**)
  - cta → `var(--gradient-primary)` (**gradient секция**)
  - footer → `var(--color-dark)`
  - Правило: NO two adjacent sections share the same background; ≥1 dark + ≥1 gradient section

- **CARD ELEVATION SYSTEM:**
  - `border-radius: var(--radius-xl)` (18px minimum)
  - `box-shadow: var(--shadow-md)` в покое
  - hover: `translateY(-6px)` + `box-shadow: var(--shadow-xl)`
  - На тёмных секциях: `background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12)`

- **GRADIENT BUTTONS:**
  - Primary: `background: var(--gradient-primary)` + hover: `filter: brightness(1.08)` + `shadow-glow`
  - Active press: `transform: scale(0.97)`

- **ВЕРТИКАЛЬНЫЙ РИТМ:** `padding: clamp(80px, 10vw, 120px) 0` на каждой секции

- **QUALITY BAR** — расширен шестью новыми проверками:
  □ HERO: фото + gradient overlay (NOT plain black) + overlapping strip
  □ SECTION BACKGROUNDS: смежные секции разные, ≥1 dark, ≥1 gradient/tinted
  □ SHADOW VARIABLES: --shadow-sm/md/lg/xl в :root + использование на картах
  □ CARD HOVER: translateY(-6px) + shadow-xl + transition на всех картах
  □ CARD RADIUS: ≥16px (var(--radius-xl))
  □ GRADIENT BUTTONS: primary CTA использует var(--gradient-primary)

- **TYPE_PROMPTS** — все переписаны с явными секциями, цветами фонов, стилями карточек:
  - **landing**: 9 секций с точными bg-цветами и hero-strip
  - **shop**: premium hero + overlapping bestseller strip + dark testimonials + gradient CTA
  - **app**: визуальные стандарты дизайн-системы (sticky header, card elevation, bg alternation)
  - **card**: glassmorphism тёмный фон + плавающий аватар + CSS mesh gradient

**E2E тест ПРОЙДЕН** (проект id=6, «Coffix Premium» лендинг, tier=power):

| Проверка | Результат |
|---|---|
| photo `<img>` count (excl 60px avatars) | **6** (≥5) ✅ |
| onerror на всех photo-img | ✅ (img0–5 имеют, img6–7 — 60px аватарки) |
| `source.unsplash.com` | ❌ отсутствует ✅ |
| `images.unsplash.com` использован | ✅ (6 photo-img) |
| `--shadow-sm/md/lg/xl` в CSS | ✅ все 4 определены |
| `linear-gradient` в CSS | ✅ 3 инстанса (hero, primary, dark) |
| hero overlay — brand colour, не чёрный | ✅ `rgba(181,101,29, 0.75)` |
| `--gradient-hero` и `--gradient-primary` | ✅ оба определены |
| hover `translateY` в CSS | ✅ |
| border-radius ≥16px | ✅ `--radius-xl` определён и используется |
| Чередование фонов секций | ✅ 6 разных: surface/bg/primary-light/dark/gradient/dark |
| Тёмная секция | ✅ testimonials = `var(--gradient-section-dark)` |
| Gradient CTA секция | ✅ cta = `var(--gradient-primary)` |
| `images.unsplash.com/photo-1509042239860` curl | **HTTP 200, image/jpeg** ✅ |
| `images.unsplash.com/photo-1611532736597` curl | **HTTP 200, image/jpeg** ✅ |
| `images.unsplash.com/photo-1504674900247` curl | **HTTP 200, image/jpeg** ✅ |
| E2B deployError | `null` ✅ |
| E2B previewUrl HTTP | **200** ✅ |

---

## R-P-A: Responsive / Performance / Accessibility правила движка

Эти правила добавлены в общий `SYSTEM_PROMPT` (применяются ко ВСЕМ 5 типам проектов).

### R1 — RESPONSIVE (3 обязательных брейкпоинта)
- `body { overflow-x: hidden; }` — никакого горизонтального скролла
- Base CSS (без @media): 1 колонка, мобильные размеры
- `@media (min-width: 481px)` — крупный мобайл
- `@media (min-width: 768px)` — планшет: 2-column гриды, горизонтальная навигация
- `@media (min-width: 1024px)` — десктоп: полные многоколоночные сетки
- **BURGER MENU** — обязательный, keyboard-accessible:
  - `<button class="hamburger" aria-label="…" aria-expanded="false" aria-controls="nav-menu">`
  - JS: toggle `.nav-open`, `aria-expanded`, swap lucide icon menu↔x
  - Клавиатура: Enter/Space открывают, Escape закрывает

### R2 — PERFORMANCE (resource hints + img sizing)
- `<link rel="preconnect">` для каждого CDN в `<head>` ДО первого CSS-файла:
  - fonts.googleapis.com, fonts.gstatic.com crossorigin, images.unsplash.com, cdn.jsdelivr.net, unpkg.com
- Каждый `<img>` обязан иметь **оба** атрибута `width` и `height` (предотвращает CLS)
- `loading="lazy"` на всех img кроме hero; hero: `loading="eager" fetchpriority="high"`
- `decoding="async"` на всех `<img>`

### R3 — ACCESSIBILITY (focus, labels, aria)
- Глобальный `:focus-visible` в style.css с `outline: 3px solid var(--color-primary)`
- `.sr-only` класс для screen-reader-only меток
- Каждый `<input>/<textarea>` — видимый `<label>` или `.sr-only` label
- Icon-only кнопки/ссылки: `aria-label="…"`
- Контраст текста: WCAG AA (≥4.5:1)

### R4 — REDUCED MOTION (обязательный @media блок)
- В конце style.css:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- В script.js AOS инициализируется с проверкой:
  ```js
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  AOS.init({ duration: prefersReduced ? 0 : 700, once: true, offset: 80 });
  ```

---

## M1–M6: Mobile Hardening правила движка

Добавлено в `SYSTEM_PROMPT` как отдельный блок **MOBILE HARDENING** (после R4), применяется ко ВСЕМ типам.

### M1 — SAFE-AREA (notch / home-bar)
- Viewport meta: `viewport-fit=cover` — обязателен
- `html, body { margin: 0; padding: 0; }`
- Фиксированные/sticky элементы: `padding: max(var(--space-4), env(safe-area-inset-top/bottom/left/right))`
- Применяется к: header, footer, `.sticky-cta`

### M2 — FLUID TYPOGRAPHY (clamp везде)
- Все заголовки и крупные отступы — строго через `clamp()`
- Hero headline: `clamp(2rem, 7vw, 5rem)`, section heading: `clamp(1.6rem, 4vw, 2.5rem)`
- Section padding: `clamp(60px, 10vw, 120px) clamp(1rem, 5vw, 4rem)`
- Запрещено: фиксированный `px` для font-size заголовков

### M3 — FLUID GRIDS (auto-fit/auto-fill)
- Все сетки карточек: `display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap:clamp(1rem, 3vw, 2rem)`
- Автосхлопывание в 1 колонку без @media
- Запрещено: `repeat(3, 1fr)` — ломается на мобиле
- Разные минимумы: features 260px, products 240px, testimonials 300px, pricing 280px

### M4 — STICKY MOBILE CTA (только shop и app)
- HTML: `<div class="sticky-cta">` фиксирован снизу, виден только на мобиле
- CSS: `display:none` на десктопе, `display:flex; position:fixed; bottom:0; padding-bottom:max(…,env(safe-area-inset-bottom))` на ≤767px
- JS: обновляет текст/состояние при добавлении в корзину
- `main { padding-bottom: 80px }` на мобиле чтобы контент не скрывался

### M5 — NO CLS (aspect-ratio + hero cap)
- Hero на мобиле: `max-height: 70vh; overflow: hidden`
- Все section/card/gallery изображения: `aspect-ratio: 16/9` (hero), `4/3` (cards), `1/1` (avatars)
- Вместе с `width`+`height` атрибутами (R2) — ноль CLS

### M6 — TOUCH TARGETS + iOS ZOOM PREVENTION
- Все кликабельные элементы: `min-height: 44px; min-width: 44px`
- Смежные интерактивные зоны: `gap/margin ≥ 8px`
- Все `<input>`, `<textarea>`, `<select>`: `font-size: 16px !important` (предотвращает авто-зум на iOS)

### E2E тест M1–M6 v2 (проект id=10, «TeaHouse» shop, tier=power) — 2026-06-15 ✅ ВСЕ ПРОШЛИ

| Проверка | Результат | Примечание |
|---|---|---|
| `deployError` | `null` ✅ | |
| `previewUrl` HTTP | **200** ✅ | |
| M1 `viewport-fit=cover` в `<meta>` | ✅ | новый HTML BOILERPLATE раздел |
| M1 `env(safe-area-inset-top)` на header | ✅ | 4 вхождения safe-area в CSS |
| M1 `env(safe-area-inset-bottom)` на footer/.sticky-cta | ✅ | |
| M2 `clamp()` в CSS | **13×** ✅ | |
| M3 `auto-fit` в CSS | ✅ | |
| M4 `.mobile-cta` / `.sticky-cta` | ✅ | с safe-area bottom |
| M5 `aspect-ratio: 16/9` на hero img | ✅ | 4 aspect-ratio в CSS |
| M5 `aspect-ratio: 4/3` на card/product | ✅ | |
| M5 `aspect-ratio: 1/1` на avatar | ✅ | |
| M5 `max-height: 70vh` hero на мобиле | ✅ | |
| M6 `min-height: 44px` на кнопках | ✅ | из CSS reset блока |
| M6 `font-size: 16px` на inputs | ✅ | из CSS reset блока |
| `box-sizing: border-box` | ✅ | |
| `overflow-x: hidden` на body | ✅ | |
| `max-width: 100%` на img | ✅ | |
| R2 preconnect теги | **5** ✅ | |
| R2 imgs w+h | **16/16** ✅ | |
| R3 `:focus-visible` | ✅ | |
| R4 `prefers-reduced-motion` | ✅ | |

> **Вывод:** После внедрения HTML BOILERPLATE секции (точный viewport meta) и MANDATORY CSS RESET блока в начало DESIGN SYSTEM — все M1/M5/M6 правила применяются в 100% генераций. Модель копирует блоки дословно.

### E2E тест M1–M6 v1 (проект id=8, «SpiceHouse» shop) — УСТАРЕЛ
> До патча: M1/M5/M6 — ⚠️ пропускались. M2/M3/R1–R4 работали.

### E2E тест R-P-A (проект id=3, «BodyForge» лендинг, tier=power)

| Проверка | Результат |
|---|---|
| `@media` брейкпоинтов (включая reduced-motion) | **4** (481/768/1024 + reduced-motion) ✅ |
| PRECONNECT теги в `<head>` | **5** (fonts.googleapis, gstatic crossorigin, unsplash, jsdelivr, unpkg) ✅ |
| `@media (prefers-reduced-motion)` в CSS | ✅ |
| `:focus-visible` в CSS | ✅ |
| IMG с `width` + `height` атрибутами | **10/10** ✅ |
| IMG с `onerror` fallback | **10/10** ✅ |
| IMG с `loading` атрибутом | **10/10** ✅ |
| IMG с `decoding=async` | **9/10** (hero — eager/high-priority) ✅ |
| Burger: HTML `class="hamburger"` | ✅ |
| Burger: `aria-expanded` + `aria-controls` | ✅ |
| Burger: JS toggle | ✅ |
| `prefersReduced` в script.js | ✅ |
| `overflow-x: hidden` в CSS | ✅ |
| Видимые `<label>` для формы | **3** (имя, email, сообщение) ✅ |
| E2B `deployError` | `null` ✅ |
| E2B `previewUrl` HTTP | **200** ✅ |

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
