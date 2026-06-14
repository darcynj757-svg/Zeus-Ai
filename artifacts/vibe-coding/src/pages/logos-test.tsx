/* Временная страница выбора логотипа — удалить после выбора */

/**
 * Вспомогательный компонент: лавровый лист (один).
 * cx, cy — центр листа; angle — угол поворота в градусах (0 = вверх).
 */
function Leaf({ cx, cy, angle, op = 0.82 }: { cx: number; cy: number; angle: number; op?: number }) {
  return (
    <ellipse
      cx={cx} cy={cy}
      rx={5} ry={11}
      fill={`rgba(255,255,255,${op})`}
      transform={`rotate(${angle} ${cx} ${cy})`}
    />
  );
}

/**
 * Вариант A — монолинейный анфас.
 * Голова — высокий овал (обводка). Борода — геометрический
 * эллипс, обрезанный по кругу, с 3 рядами волн.
 * Лавровый венок — 8 листов-эллипсов над головой.
 */
function LogoA({ size = 60 }: { size?: number }) {
  const R = 48; const CX = 50; const CY = 50;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gA" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d28d9"/><stop offset="1" stopColor="#2563eb"/>
        </linearGradient>
        <clipPath id="circA"><circle cx={CX} cy={CY} r={R}/></clipPath>
      </defs>
      <circle cx={CX} cy={CY} r={R} fill="url(#gA)"/>

      {/* ── Лавровый венок — 8 листьев в дуге ── */}
      {/* Листья расположены симметрично над головой (y ≈ 8..18) */}
      <Leaf cx={26} cy={18} angle={-40}/>
      <Leaf cx={34} cy={11} angle={-22}/>
      <Leaf cx={43} cy={7}  angle={-8}/>
      <Leaf cx={50} cy={6}  angle={0}/>
      <Leaf cx={57} cy={7}  angle={8}/>
      <Leaf cx={66} cy={11} angle={22}/>
      <Leaf cx={74} cy={18} angle={40}/>
      {/* Полоса венка */}
      <path d="M 26 22 Q 38 10 50 8 Q 62 10 74 22"
        stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" fill="none"/>

      {/* ── Голова — высокий вытянутый овал (монолиния) ── */}
      <ellipse cx={50} cy={33} rx={17} ry={21}
        stroke="white" strokeWidth="2.5" fill="none"/>

      {/* Нависшие брови */}
      <path d="M 35 26 C 38 22 43 21 46 24" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M 54 24 C 57 21 62 22 65 26" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>

      {/* Глаза */}
      <circle cx={40} cy={31} r={3}   fill="white"/>
      <circle cx={60} cy={31} r={3}   fill="white"/>

      {/* Нос — прямой греческий */}
      <path d="M 50 32 L 47 43 M 47 43 Q 44 46 41 43 M 47 43 L 53 43 Q 56 46 59 43"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      {/* Рот — прямой (серьёзный) */}
      <line x1="43" y1="49" x2="57" y2="49" stroke="white" strokeWidth="2" strokeLinecap="round"/>

      {/* ── Борода — эллипс, обрезанный по кругу ── */}
      <g clipPath="url(#circA)">
        <ellipse cx={50} cy={77} rx={34} ry={27}
          stroke="white" strokeWidth="2.5" fill="rgba(255,255,255,0.05)"/>
        {/* Волна 1 (верх бороды) */}
        <path d="M 28 66 Q 34 60 40 66 Q 46 72 52 66 Q 58 60 64 66 Q 70 72 74 66"
          stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Волна 2 */}
        <path d="M 22 78 Q 28 72 34 78 Q 40 84 46 78 Q 52 72 58 78 Q 64 84 70 78 Q 76 72 80 78"
          stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Волна 3 (низ бороды) */}
        <path d="M 26 91 Q 32 85 38 91 Q 44 97 50 91 Q 56 85 62 91 Q 68 97 74 91"
          stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      </g>

      {/* Молния */}
      <path d="M 88 8 L 84 18 L 90 18 L 86 28"
        stroke="rgba(255,235,50,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/**
 * Вариант B — профиль вправо (греческая камея/монета).
 * Силуэт = заполненная белая фигура с чётко выступающим носом.
 * Борода — отдельный белый эллипс на затылочно-нижней стороне.
 * Лавровые листья ряд вдоль затылка.
 */
function LogoB({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gB" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d28d9"/><stop offset="1" stopColor="#2563eb"/>
        </linearGradient>
        <clipPath id="circB"><circle cx="50" cy="50" r="48"/></clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#gB)"/>

      {/* ── Профильный силуэт — смотрит вправо ── */}
      {/*
        Ключевые точки:
          Затылок: x≈22, y 12..68
          Лоб: x≈64, y≈14
          Надбровный хребет: x≈62, y≈26 (выступает вправо)
          Переносица: x≈60, y≈36
          НOСОВОЙ ГОРБИНОК (самая правая точка): x≈78, y≈48
          Подбородок: x≈62, y≈72
          Борода: вниз до y≈96
      */}
      <path d="
        M 22 12
        C 30 4 44 2 54 6
        C 62 10 66 16 64 24
        L 62 28
        C 61 31 60 34 59 36
        L 78 48
        L 58 58
        L 58 62
        C 58 66 60 70 60 74
        C 62 80 62 88 58 93
        C 54 98 44 99 36 97
        C 28 94 22 88 22 82
        L 22 12
        Z
      " fill="white" opacity="0.93" clipPath="url(#circB)"/>

      {/* Глаз — вырез */}
      <ellipse cx="60" cy="28" rx="3.5" ry="3" fill="url(#gB)"/>

      {/* Волны бороды */}
      <path d="M 26 78 Q 32 73 38 78 Q 44 83 50 78 Q 54 73 58 78"
        stroke="url(#gB)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 24 88 Q 30 83 35 88 Q 40 93 46 88 Q 51 83 56 88"
        stroke="url(#gB)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* ── Лавровые листья вдоль затылка ── */}
      <Leaf cx={14} cy={20} angle={-85} op={0.72}/>
      <Leaf cx={14} cy={34} angle={-85} op={0.72}/>
      <Leaf cx={14} cy={48} angle={-85} op={0.72}/>
      <Leaf cx={14} cy={62} angle={-85} op={0.72}/>

      {/* Молния */}
      <path d="M 88 8 L 84 18 L 90 18 L 86 28"
        stroke="rgba(255,235,50,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/**
 * Вариант C — геральдический анфас.
 * Крупный венок-корона из 8 заполненных листьев.
 * Лицо + борода = единый белый силуэт из двух перекрывающихся эллипсов.
 * Детали (брови, глаза, нос, рот, волны) вырезаны цветом фона.
 */
function LogoC({ size = 60 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gC" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d28d9"/><stop offset="1" stopColor="#2563eb"/>
        </linearGradient>
        <clipPath id="circC"><circle cx="50" cy="50" r="48"/></clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#gC)"/>

      {/* ── Венок-корона — 8 крупных листьев ── */}
      <Leaf cx={22} cy={22} angle={-50} op={0.85}/>
      <Leaf cx={30} cy={13} angle={-30} op={0.85}/>
      <Leaf cx={40} cy={8}  angle={-14} op={0.85}/>
      <Leaf cx={50} cy={6}  angle={0}   op={0.85}/>
      <Leaf cx={60} cy={8}  angle={14}  op={0.85}/>
      <Leaf cx={70} cy={13} angle={30}  op={0.85}/>
      <Leaf cx={78} cy={22} angle={50}  op={0.85}/>
      <path d="M 20 26 Q 35 10 50 8 Q 65 10 80 26"
        stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" fill="none"/>

      {/* ── Белый силуэт: лицо + борода ── */}
      {/* Лицо — высокий овал */}
      <ellipse cx={50} cy={36} rx={20} ry={25}
        fill="white" opacity="0.95" clipPath="url(#circC)"/>
      {/* Борода — широкий эллипс ниже */}
      <ellipse cx={50} cy={76} rx={34} ry={26}
        fill="white" opacity="0.95" clipPath="url(#circC)"/>

      {/* ── Детали — вырезаются цветом фона ── */}

      {/* Брови (жирные нависшие дуги) */}
      <path d="M 34 30 C 38 25 43 24 47 27" stroke="url(#gC)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M 53 27 C 57 24 62 25 66 30" stroke="url(#gC)" strokeWidth="4" strokeLinecap="round" fill="none"/>

      {/* Глаза */}
      <ellipse cx="40" cy="35" rx="3.5" ry="3.2" fill="url(#gC)"/>
      <ellipse cx="60" cy="35" rx="3.5" ry="3.2" fill="url(#gC)"/>

      {/* Нос */}
      <path d="M 50 36 L 47 46 M 47 46 Q 44 49 41 46 M 47 46 L 53 46 Q 56 49 59 46"
        stroke="url(#gC)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      {/* Рот — серьёзный */}
      <line x1="42" y1="52" x2="58" y2="52" stroke="url(#gC)" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Волны бороды */}
      <path d="M 20 66 Q 27 60 34 66 Q 41 72 48 66 Q 55 60 62 66 Q 69 72 76 66 Q 81 60 82 66"
        stroke="url(#gC)" strokeWidth="3.2" fill="none" strokeLinecap="round" clipPath="url(#circC)"/>
      <path d="M 18 80 Q 24 74 30 80 Q 36 86 42 80 Q 48 74 54 80 Q 60 86 66 80 Q 72 74 78 80 Q 82 86 84 80"
        stroke="url(#gC)" strokeWidth="3.2" fill="none" strokeLinecap="round" clipPath="url(#circC)"/>
      <path d="M 26 93 Q 32 87 38 93 Q 44 99 50 93 Q 56 87 62 93 Q 68 99 74 93"
        stroke="url(#gC)" strokeWidth="2.4" fill="none" strokeLinecap="round" clipPath="url(#circC)"/>

      {/* Молния */}
      <path d="M 88 8 L 84 18 L 90 18 L 86 28"
        stroke="rgba(255,235,50,0.95)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export default function LogosTest() {
  const logos = [
    {
      id: "A", label: "Вариант A",
      sub: "Анфас · монолиния · высокий овал + тяжёлые брови · геометрическая борода с волнами · венок",
      Logo: LogoA,
    },
    {
      id: "B", label: "Вариант B",
      sub: "Профиль · силуэт монеты/камеи · выступающий нос · борода · лавр вдоль затылка",
      Logo: LogoB,
    },
    {
      id: "C", label: "Вариант C",
      sub: "Анфас · геральдика · лицо+борода = белый силуэт · детали вырезаны · крупный венок",
      Logo: LogoC,
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-14 py-16 px-8"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <h1 className="text-white text-2xl font-bold tracking-tight">Выбор логотипа Zeus AI</h1>

      <div className="flex flex-wrap justify-center gap-12">
        {logos.map(({ id, label, sub, Logo }) => (
          <div key={id} className="flex flex-col items-center gap-5">
            <div className="text-white/50 text-xs font-semibold uppercase tracking-widest">{label}</div>

            {/* 160px — детальный просмотр */}
            <div className="rounded-2xl p-3 bg-white/[0.03] border border-white/8">
              <Logo size={160}/>
            </div>

            {/* 34px — как в шапке */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Logo size={34}/>
              <span className="text-white font-bold text-sm">Zeus AI</span>
            </div>

            <p className="text-white/36 text-[11px] text-center max-w-[200px] leading-relaxed">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-white/18 text-xs">/logos — временная страница, удалить после выбора</p>
    </div>
  );
}
