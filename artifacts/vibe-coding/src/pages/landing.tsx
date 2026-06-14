import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Monitor, Sun, Moon, Mic, MicOff, ArrowUp, Plus, ChevronDown, Zap } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const NAV_LINKS = ["Шаблоны", "Тарифы", "Примеры", "Блог"];

const TABS = [
  { icon: "🌐", label: "Сайт-лендинг" },
  { icon: "⚡", label: "Приложение" },
  { icon: "🛒", label: "Интернет-магазин" },
  { icon: "🪪", label: "Визитка" },
];

const CHIP_PROMPTS = [
  { emoji: "☕", label: "Лендинг для кофейни", text: "Сделай красивый лендинг для маленькой кофейни «Утро в городе»: меню с ценами, фото-блок, кнопка «Забронировать столик»" },
  { emoji: "💅", label: "Визитка мастера маникюра", text: "Страница-визитка для мастера маникюра Алёны: портфолио работ, прайс, кнопка записи в WhatsApp, пастельные цвета" },
  { emoji: "🍕", label: "Меню для доставки еды", text: "Страница меню для доставки пиццы: карточки блюд с фото и ценами, кнопка «Заказать», яркий красный дизайн" },
  { emoji: "💍", label: "Сайт-приглашение на свадьбу", text: "Сайт-приглашение на свадьбу Ивана и Марии: дата 14 сентября, программа дня, форма подтверждения присутствия, романтичный дизайн" },
];

type ThemeMode = "monitor" | "sun" | "moon";

function ZeusLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#lg1)" />
      <polygon points="27,6 16,26 23,26 21,42 32,22 25,22" fill="white" opacity="0.95" />
    </svg>
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
    navigate("/app");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goToApp();
    }
  };

  const cycleTheme = (mode: ThemeMode) => setThemeMode(mode);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + "px";
    }
  }, [prompt]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@1&display=swap');
        .zeus-italic { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-style: italic; }
      `}</style>

      {/* FIXED HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 flex h-14 items-center justify-between px-6 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <ZeusLogo size={26} />
          <span className="font-bold text-base tracking-tight text-white">Zeus AI</span>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-sm text-white/50 hover:text-white/90 transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <div className="hidden sm:flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5">
            {(
              [
                { mode: "monitor" as ThemeMode, Icon: Monitor },
                { mode: "sun" as ThemeMode, Icon: Sun },
                { mode: "moon" as ThemeMode, Icon: Moon },
              ] as const
            ).map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => cycleTheme(mode)}
                className={`p-1.5 rounded-md transition-all ${
                  themeMode === mode
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-sm text-white/60 hover:text-white transition-colors">
            Войти
          </a>
          <button
            onClick={() => goToApp()}
            className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 transition-all"
          >
            Начать бесплатно
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center pt-14 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="mt-8 w-[800px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,_73,_209,_0.18)_0%,_rgba(59,_130,_246,_0.08)_45%,_transparent_70%)] blur-[1px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-3xl mx-auto py-20 gap-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:border-white/20 transition-colors cursor-default">
            <span className="px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold tracking-wide uppercase">NEW</span>
            <span>Голосовой ввод уже работает</span>
            <span className="text-white/40">→</span>
          </div>

          {/* Hero heading */}
          <h1 className="text-[56px] sm:text-[72px] md:text-[88px] leading-[1.05] font-bold tracking-tight text-white">
            <span className="block font-normal text-white/90">Не просто придумай —</span>
            <span className="block">
              <span className="zeus-italic font-normal" style={{ fontSize: "1.1em" }}>Zeus</span>
              <span className="font-bold"> соберёт</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-white/45 leading-relaxed max-w-xl">
            Создавай сайты и приложения за минуты — просто опиши словами.
            <br />
            Всё включено: код, превью и публикация.
          </p>

          {/* TABS */}
          <div className="flex flex-wrap justify-center gap-2">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeTab === i
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-white/8 text-white/40 hover:border-white/15 hover:text-white/60"
                }`}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* INPUT BOX */}
          <div className="w-full max-w-2xl rounded-2xl bg-white/[0.05] border border-white/10 hover:border-white/18 focus-within:border-white/25 transition-colors shadow-2xl shadow-black/40">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Опиши, что хочешь создать…"
              rows={3}
              className="w-full bg-transparent text-white placeholder-white/25 text-base p-5 pb-2 resize-none outline-none font-sans leading-relaxed"
              style={{ minHeight: 80, maxHeight: 220 }}
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-2">
              {/* Left: + and model */}
              <div className="flex items-center gap-2">
                <button className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/6 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 transition-all">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/6 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 transition-all text-xs font-medium">
                  <Zap className="h-3 w-3 text-violet-400" />
                  Zeus 1.0
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </div>

              {/* Right: mic + send */}
              <div className="flex items-center gap-2">
                {speech.isSupported && (
                  <button
                    onClick={() => speech.toggle(prompt)}
                    title={speech.isListening ? "Остановить запись" : "Голосовой ввод"}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                      speech.isListening
                        ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse"
                        : "bg-white/6 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
                <button
                  onClick={() => goToApp()}
                  disabled={!prompt.trim()}
                  title="Отправить"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-violet-900/40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Listening indicator */}
            {speech.isListening && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 px-4 pb-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
                </span>
                Слушаю… говори
              </div>
            )}
          </div>

          {/* CHIP PROMPTS */}
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {CHIP_PROMPTS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => goToApp(chip.text)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-transparent border border-white/8 text-white/40 text-xs hover:border-white/18 hover:text-white/65 hover:bg-white/4 transition-all"
              >
                <span>{chip.emoji}</span>
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-5 text-center text-xs text-white/20 border-t border-white/5">
        Сделано с ⚡ на <span className="text-white/35">Zeus AI</span>
      </footer>
    </div>
  );
}
