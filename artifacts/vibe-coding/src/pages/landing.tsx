import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Monitor, Sun, Moon, Mic, MicOff, ArrowUp, Plus, ChevronDown } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const NAV_LINKS = ["Шаблоны", "Тарифы", "Примеры", "Блог"];

const TABS: Array<{ icon: string; label: string; type: "landing" | "app" | "shop" | "card" | "portfolio"; desc: string }> = [
  { icon: "🌐", label: "Сайт-лендинг",    type: "landing",   desc: "Многосекционный сайт: hero, преимущества, цены, отзывы, footer" },
  { icon: "⚡", label: "Приложение",       type: "app",       desc: "SPA на React с состоянием, localStorage и несколькими экранами" },
  { icon: "🛒", label: "Интернет-магазин", type: "shop",      desc: "Каталог товаров с фильтрами, корзиной и оформлением заказа" },
  { icon: "🪪", label: "Визитка",          type: "card",      desc: "Одностраничная визитка: контакты, соцсети, кнопка «Связаться»" },
  { icon: "🎨", label: "Портфолио",        type: "portfolio", desc: "Личный сайт специалиста: проекты, навыки, отзывы, форма контакта" },
];

const CHIP_PROMPTS = [
  { emoji: "☕", label: "Лендинг для кофейни", text: "Сделай красивый лендинг для маленькой кофейни «Утро в городе»: меню с ценами, фото-блок, кнопка «Забронировать столик»" },
  { emoji: "💅", label: "Визитка мастера маникюра", text: "Страница-визитка для мастера маникюра Алёны: портфолио работ, прайс, кнопка записи в WhatsApp, пастельные цвета" },
  { emoji: "🍕", label: "Меню для доставки еды", text: "Страница меню для доставки пиццы: карточки блюд с фото и ценами, кнопка «Заказать», яркий красный дизайн" },
  { emoji: "💍", label: "Сайт-приглашение на свадьбу", text: "Сайт-приглашение на свадьбу Ивана и Марии: дата 14 сентября, программа дня, форма подтверждения присутствия, романтичный дизайн" },
];

type ThemeMode = "monitor" | "sun" | "moon";

/* Полный горизонтальный логотип (лицо + текст) */
function ZeusLogoFull({ height = 32 }: { height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Zeus AI"
      style={{ height: height, width: "auto", display: "block" }}
    />
  );
}

/* Маленькая иконка — обрезает логотип до лицевой части */
function ZeusLogoIcon({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <img
        src="/logo.png"
        alt="Zeus AI"
        style={{
          height: size,
          width: "auto",
          objectFit: "cover",
          objectPosition: "left center",
        }}
      />
    </div>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [themeMode, setThemeMode] = useState<ThemeMode>("monitor");
  const [activeTab, setActiveTab] = useState(0);
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition((text) => setPrompt(text));

  const goToApp = (initialPrompt?: string) => {
    const p = (initialPrompt ?? prompt).trim();
    if (p) sessionStorage.setItem("zeus_initial_prompt", p);
    sessionStorage.setItem("zeus_project_type", TABS[activeTab].type);
    navigate("/app");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goToApp();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 220) + "px";
    }
  }, [prompt]);

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col antialiased"
      style={{ fontFamily: "'Manrope', 'Inter', system-ui, sans-serif" }}
    >
      {/* FIXED HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 flex h-14 items-center justify-between px-5 md:px-8 bg-[#0a0a0f]/85 backdrop-blur-xl border-b border-white/[0.06]">
        {/* Logo */}
        <div className="flex items-center shrink-0">
          <ZeusLogoFull height={60} />
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-white/45 hover:text-white/85 transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-0.5 bg-white/[0.05] border border-white/[0.08] rounded-lg p-0.5">
            {(
              [
                { mode: "monitor" as ThemeMode, Icon: Monitor },
                { mode: "sun" as ThemeMode, Icon: Sun },
                { mode: "moon" as ThemeMode, Icon: Moon },
              ] as const
            ).map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`p-1.5 rounded-md transition-all ${
                  themeMode === mode
                    ? "bg-white/10 text-white"
                    : "text-white/25 hover:text-white/55"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-sm text-white/55 hover:text-white transition-colors"
          >
            Войти
          </a>
          <button
            onClick={() => goToApp()}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-white text-[#0a0a0f] hover:bg-white/90 transition-all"
          >
            Начать бесплатно
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center pt-14 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden">
          <div
            className="mt-[-60px] w-[900px] h-[600px] rounded-full blur-[2px]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(109,40,217,0.20) 0%, rgba(37,99,235,0.09) 45%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-3xl mx-auto py-16 gap-7">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.10] text-sm text-white/65 hover:border-white/20 transition-colors cursor-default">
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-[12px] font-bold">
              ⚡
            </span>
            <span>· Быстро · просто · без знаний программирования ·</span>
            <span className="text-white/30">→</span>
          </div>

          {/* Hero heading */}
          <h1
            className="text-[40px] sm:text-[56px] md:text-[70px] leading-[1.02] tracking-tight text-white"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700 }}
          >
            <span className="block" style={{ fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
              Zeus AI — превратит вашу идею в готовый проект.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl"
            style={{ color: "rgba(255,255,255,0.40)", fontWeight: 400 }}
          >
            Опишите идею своими словами — Zeus напишет код и покажет готовый результат за минуты.
          </p>

          {/* INPUT BOX */}
          <div className="w-full max-w-2xl rounded-2xl bg-white/[0.05] border border-white/[0.10] hover:border-white/[0.17] focus-within:border-white/[0.24] transition-colors shadow-2xl shadow-black/50">

            {/* TYPE TABS — inside the box, above textarea */}
            <div className="flex items-center gap-1 px-3 pt-3 pb-1 overflow-x-auto no-scrollbar">
              {TABS.map((tab, i) => (
                <button
                  key={tab.type}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap border transition-all duration-150 shrink-0 ${
                    activeTab === i
                      ? "bg-white/[0.10] border-white/[0.20] text-white"
                      : "bg-transparent border-transparent text-white/38 hover:text-white/65 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-sm leading-none">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Опиши, что хочешь создать…"
              rows={3}
              className="w-full bg-transparent text-white placeholder-white/22 text-[15px] p-5 pb-2 resize-none outline-none leading-relaxed"
              style={{
                minHeight: 86,
                maxHeight: 220,
                fontFamily: "'Manrope', sans-serif",
              }}
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-2">
              {/* Left */}
              <div className="flex items-center gap-2">
                <button className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/45 hover:text-white/75 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/45 hover:text-white/75 transition-all text-xs font-medium">
                  <ZeusLogoIcon size={13} />
                  Zeus 1.0
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                {speech.isSupported && (
                  <button
                    onClick={() => speech.toggle(prompt)}
                    title={speech.isListening ? "Остановить запись" : "Голосовой ввод"}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                      speech.isListening
                        ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse"
                        : "bg-white/[0.06] border-white/[0.10] text-white/38 hover:text-white/68 hover:border-white/20"
                    }`}
                  >
                    {speech.isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => goToApp()}
                  disabled={!prompt.trim()}
                  title="Создать"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-25 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-violet-900/40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Listening indicator */}
            {speech.isListening && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 px-4 pb-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                </span>
                Слушаю… говори
              </div>
            )}
          </div>

          {/* CHIP PROMPTS */}
          <div className="flex flex-wrap justify-center gap-2 -mt-1">
            {CHIP_PROMPTS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => goToApp(chip.text)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-transparent border border-white/[0.08] text-white/38 text-xs hover:border-white/[0.17] hover:text-white/62 hover:bg-white/[0.04] transition-all"
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-5 text-center text-xs text-white/18 border-t border-white/[0.05]">
        Сделано с ⚡ на{" "}
        <span className="text-white/32" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
          Zeus
        </span>{" "}
        <span className="text-white/25">AI</span>
      </footer>
    </div>
  );
}
