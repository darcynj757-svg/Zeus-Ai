import { useLocation } from "wouter";
import { Mic } from "lucide-react";

const EXAMPLE_PROMPTS = [
  {
    emoji: "☕",
    title: "Лендинг для кофейни",
    text: "Сделай красивый лендинг для маленькой кофейни «Утро в городе»: меню с ценами, фото-блок, кнопка «Забронировать столик»",
  },
  {
    emoji: "💅",
    title: "Визитка мастера маникюра",
    text: "Страница-визитка для мастера маникюра Алёны: портфолио работ, прайс, кнопка записи в WhatsApp, пастельные цвета",
  },
  {
    emoji: "🍕",
    title: "Меню для доставки еды",
    text: "Страница меню для доставки пиццы: карточки блюд с фото и ценами, кнопка «Заказать», яркий красный дизайн",
  },
  {
    emoji: "💍",
    title: "Приглашение на свадьбу",
    text: "Сайт-приглашение на свадьбу Ивана и Марии: дата 14 сентября, программа дня, форма подтверждения присутствия, романтичный дизайн",
  },
];

function ZeusLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zeusGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#zeusGrad)" />
      <polygon
        points="27,6 16,26 23,26 21,42 32,22 25,22"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}

export default function Landing() {
  const [, navigate] = useLocation();

  const goToApp = (initialPrompt?: string) => {
    if (initialPrompt) {
      sessionStorage.setItem("zeus_initial_prompt", initialPrompt);
    }
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white flex flex-col">
      <header className="sticky top-0 z-50 bg-[#07070f]/90 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZeusLogo size={36} />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Zeus AI
          </span>
        </div>
        <button
          onClick={() => goToApp()}
          className="text-sm font-medium px-4 py-1.5 rounded-full bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 transition-all"
        >
          Открыть редактор
        </button>
      </header>

      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-700/15 blur-[120px]" />
            <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-blue-700/10 blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-900/40 border border-violet-500/30 text-violet-300 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400"></span>
              </span>
              Работает прямо сейчас
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Опиши идею словами —
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Zeus соберёт сайт за тебя
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
              Никакого кода. Просто скажи, что хочешь — получишь готовую страницу.
              <br className="hidden sm:block" />
              <span className="text-gray-300">
                Как будто у тебя есть знакомый программист, который не спит и не просит денег.
              </span>
            </p>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => goToApp()}
                className="group relative inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/40 transition-all hover:scale-105 hover:shadow-violet-700/50"
              >
                <span>Поехали</span>
                <span className="text-xl group-hover:translate-x-0.5 transition-transform">⚡</span>
              </button>
              <p className="text-xs text-gray-500">
                Без регистраций, смс и танцев с бубном
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-14 text-gray-100">
            Как это работает
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <Mic className="h-7 w-7 text-violet-400" />,
                title: "Расскажи идею",
                desc: "Напиши или надиктуй голосом, что нужно сделать. Можно на обычном языке — без технических слов.",
              },
              {
                step: "2",
                icon: (
                  <svg className="h-7 w-7 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                ),
                title: "Zeus пишет код",
                desc: "Искусственный интеллект генерирует HTML, CSS и JavaScript за пару секунд. Ты видишь каждую строчку.",
              },
              {
                step: "3",
                icon: (
                  <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                ),
                title: "Смотришь результат",
                desc: "Живой превью прямо в браузере. Не нравится что-то — скажи словами, Zeus переделает.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-violet-500/30 transition-colors"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {step}
                </div>
                <div className="mt-3 w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  {icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-20 bg-white/[0.015]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-gray-100">
              Попробуй прямо сейчас
            </h2>
            <p className="text-center text-gray-400 mb-12">
              Кликни на любую карточку — Zeus сразу начнёт работать
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example.title}
                  onClick={() => goToApp(example.text)}
                  className="group text-left p-5 rounded-2xl bg-white/[0.04] border border-white/8 hover:border-violet-500/40 hover:bg-violet-900/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{example.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-100 group-hover:text-violet-300 transition-colors mb-1">
                        {example.title}
                      </div>
                      <div className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {example.text}
                      </div>
                    </div>
                    <span className="text-violet-500 group-hover:text-violet-300 text-xl transition-all group-hover:translate-x-1">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-sm text-gray-500">
        Сделано с ⚡ на <span className="text-violet-400 font-medium">Zeus AI</span>
      </footer>
    </div>
  );
}
