interface Props {
  onGetStarted: () => void; // Sign up / Get started buttons
  onLogIn: () => void; // Log in buttons
}

// Put your drawing at frontend/public/images/knight-moon.jpg
const MASCOT_SRC = "/images/knight-moon.jpg";

const FEATURES = [
  {
    title: "Notes, converted",
    body: "Snap a photo of your handwritten notes. Our AI turns them into LaTeX you can edit, copy and keep.",
    bg: "bg-[#F7DCF9]",
    icon: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
  },
  {
    title: "Lofi to focus",
    body: "Pick a track and layer in rain, ocean or white noise until the mix feels right.",
    bg: "bg-[#E9B8EF]",
    icon: (
      <>
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <rect x="3" y="14" width="5" height="7" rx="2" />
        <rect x="16" y="14" width="5" height="7" rx="2" />
      </>
    ),
  },
  {
    title: "Food deals nearby",
    body: "A map of student food deals around campus, so a snack break doesn't wreck your budget.",
    bg: "bg-[#F7DCF9]",
    icon: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
];

const STEPS = [
  { title: "Sign up", body: "Create an account with your school email." },
  { title: "Open your dashboard", body: "Your notes, music and nearby deals all start from one home screen." },
  { title: "Settle in", body: "Upload notes, press play, and get to work." },
];

export default function LandingPage({ onGetStarted, onLogIn }: Props) {
  return (
    <div className="min-h-screen bg-[#F7DCF9] text-[#3E1230]">
      {/* Top nav */}
      <header className="mx-auto flex max-w-[1184px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8">
        <a href="#top" className="flex items-center gap-3 no-underline">
          <span className="relative h-12 w-12 flex-none overflow-hidden rounded-2xl bg-[#E2D2F9]">
            {/* Cropped to just the knight's helmet */}
            <img
              src={MASCOT_SRC}
              alt=""
              className="absolute left-[-84px] top-[-45px] w-[220px] max-w-none"
            />
          </span>
          <span className="font-['League_Spartan'] text-[22px] font-bold leading-none">
            Knight
            <br />
            Study Space
          </span>
        </a>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
          <a href="#features" className="hidden min-h-11 items-center px-3.5 text-[15px] font-bold no-underline sm:inline-flex">
            Features
          </a>
          <a href="#how" className="hidden min-h-11 items-center px-3.5 text-[15px] font-bold no-underline sm:inline-flex">
            How it works
          </a>
          <button
            onClick={onLogIn}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#3E1230] px-5 text-[15px] font-bold hover:bg-[#F2C9EF]"
          >
            Log in
          </button>
          <button
            onClick={onGetStarted}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#3E1230] px-[22px] text-[15px] font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E]"
          >
            Sign up
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section
        id="top"
        className="mx-auto flex max-w-[1184px] flex-wrap items-center gap-12 px-4 pb-[72px] pt-6 sm:px-8 sm:pt-10"
      >
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <p className="self-start rounded-full bg-[#FDF8F2] px-4 py-2 text-sm font-bold tracking-[0.08em]">
            BUILT BY STUDENTS, FOR STUDENTS
          </p>
          <h1 className="font-['League_Spartan'] text-5xl font-bold leading-[0.95] tracking-[-0.02em] sm:text-[76px]">
            Your whole study night, in one place.
          </h1>
          <p className="max-w-[520px] text-[19px] leading-normal text-[#6B3A5C]">
            Turn handwritten notes into clean files, put on some lofi, and find cheap food near campus when you need a
            break.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onGetStarted}
              className="inline-flex min-h-14 cursor-pointer items-center gap-2.5 rounded-full bg-[#3E1230] px-7 text-[17px] font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E]"
            >
              Get started — it's free
              <ArrowIcon />
            </button>
            <button
              onClick={onLogIn}
              className="inline-flex min-h-14 cursor-pointer items-center rounded-full border-[1.5px] border-[#3E1230] px-7 text-[17px] font-bold hover:bg-[#F2C9EF]"
            >
              Log in
            </button>
          </div>
        </div>

        <div className="relative min-w-0 flex-[1_1_420px]">
          <img
            src={MASCOT_SRC}
            alt="Knight mascot resting on a crescent moon among stars"
            className="block aspect-[1427/1111] w-full rounded-[40px] border-[6px] border-[#FDF8F2] object-cover"
          />
          <span className="absolute -left-2 bottom-7 inline-flex items-center gap-2.5 rounded-[20px] bg-[#3E1230] px-[18px] py-3 text-[15px] font-bold text-[#FDF8F2] sm:-left-4">
            <svg {...stroke} width={18} height={18}>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Late-night study mode
          </span>
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-h" className="rounded-t-[48px] bg-[#FDF8F2]">
        <div className="mx-auto flex max-w-[1184px] flex-col gap-10 px-4 py-20 sm:px-8">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p className="text-sm font-bold tracking-[0.12em] text-[#8A2A6E]">WHAT'S INSIDE</p>
            <h2 id="features-h" className="font-['League_Spartan'] text-4xl font-bold leading-none sm:text-5xl">
              Everything you reach for during a study session
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
            {FEATURES.map((f) => (
              <article key={f.title} className={`flex flex-col gap-3.5 rounded-[28px] p-7 ${f.bg}`}>
                <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#3E1230] text-[#FDF8F2]">
                  <svg {...stroke} width={26} height={26}>
                    {f.icon}
                  </svg>
                </span>
                <h3 className="font-['League_Spartan'] text-[28px] font-bold">{f.title}</h3>
                <p className="text-base leading-normal text-[#3E1230]/85">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-h" className="bg-[#FDF8F2]">
        <div className="mx-auto flex max-w-[1184px] flex-col gap-8 px-4 pb-20 sm:px-8">
          <h2 id="how-h" className="font-['League_Spartan'] text-[40px] font-bold">
            How it works
          </h2>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-[#3E1230] font-['League_Spartan'] text-[22px] font-bold">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <strong className="text-lg">{s.title}</strong>
                  <span className="text-[15px] leading-normal text-[#6B3A5C]">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing call to action */}
      <section aria-label="Get started" className="bg-[#FDF8F2] px-4 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6 rounded-[40px] bg-[#3E1230] p-8 text-[#FDF8F2] sm:p-12">
          <div className="flex flex-[1_1_360px] flex-col gap-2">
            <h2 className="font-['League_Spartan'] text-4xl font-bold leading-none sm:text-[44px]">
              Ready for tonight's study session?
            </h2>
            <p className="text-[17px] text-[#E9C8E6]">It takes a minute to set up.</p>
          </div>
          <button
            onClick={onGetStarted}
            className="inline-flex min-h-14 cursor-pointer items-center gap-2.5 rounded-full bg-[#F2C9EF] px-7 text-[17px] font-bold text-[#3E1230] transition-colors hover:bg-[#FDF8F2]"
          >
            Create your account
            <ArrowIcon />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[1.5px] border-[#EBC4E4] bg-[#FDF8F2]">
        <div className="mx-auto flex max-w-[1184px] flex-wrap justify-between gap-3 px-4 py-6 text-sm text-[#6B3A5C] sm:px-8">
          {/* TODO(content): add your team or club name */}
          <span>© 2026 Knight Study Space · [TEAM / CLUB NAME]</span>
          <span className="flex gap-5">
            <a href="#features" className="underline">Features</a>
            <a href="#how" className="underline">How it works</a>
            <button onClick={onLogIn} className="cursor-pointer underline">Log in</button>
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Icons ---------- */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ArrowIcon() {
  return (
    <svg {...stroke} width={18} height={18} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}