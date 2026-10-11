import { useEffect, useState } from "react";
import { getDashboardData, type AuthUser, type DashboardData } from "../lib/api";

interface Props {
  onOpenNotes: () => void;
  onOpenFood: () => void;
  onOpenLofi: () => void;
  user: AuthUser | null;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export default function Dashboard({ onOpenNotes, onOpenFood, onOpenLofi, user }: Props) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getDashboardData()
      .then(setDashboard)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Couldn't load your dashboard.");
      });
  }, []);

  const userName = user?.first_name || user?.email || "there";
  const recentNotes = dashboard?.recent_notes ?? [];
  const savedRestaurants = dashboard?.saved_restaurants ?? [];

  const quickActions = [
    { label: "Convert notes", hint: "Handwriting → LaTeX", onClick: onOpenNotes, icon: <NoteIcon /> },
    { label: "Find food", hint: "Deals near campus", onClick: onOpenFood, icon: <PinIcon /> },
    { label: "Play lofi", hint: "Music to study to", onClick: onOpenLofi, icon: <HeadphonesIcon /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 text-[#3E1230] sm:px-12 sm:py-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#8A2A6E]">{today}</p>
          <h2 className="font-['League_Spartan'] text-4xl font-bold leading-none sm:text-[56px]">
            {greeting()}, {userName}!
          </h2>
        </div>
        <button
          onClick={onOpenNotes}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full bg-[#3E1230] px-6 font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E]"
        >
          <PlusIcon />
          Upload notes
        </button>
      </header>

      {/* Stat cards */}
      <section aria-labelledby="overview-h" className="flex flex-col gap-3">
        <h3 id="overview-h" className="sr-only">Overview</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Notes converted" value={dashboard?.notes_converted ?? 0} />
          <StatCard label="Saved restaurants" value={savedRestaurants.length} />
        </div>
      </section>

      {loadError && <p role="status" className="text-sm text-[#6B3A5C]">{loadError}</p>}

      {/* Quick actions */}
      <section aria-labelledby="actions-h" className="flex flex-col gap-3">
        <h3 id="actions-h" className="text-sm font-bold uppercase tracking-[0.12em]">
          Quick actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="group flex min-h-[88px] cursor-pointer items-center gap-4 rounded-[20px] bg-[#E9B8EF] p-4 text-left transition-colors hover:bg-[#3E1230] hover:text-[#FDF8F2]"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#FDF8F2] text-[#3E1230]">
                {a.icon}
              </span>
              <span className="flex flex-col">
                <span className="font-['League_Spartan'] text-xl font-bold">{a.label}</span>
                <span className="text-sm opacity-80">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-6">
        {/* Recent conversions */}
        <section
          aria-labelledby="recent-h"
          className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-[28px] bg-[#FDF8F2] p-6 sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 id="recent-h" className="font-['League_Spartan'] text-[28px] font-bold">
              Recent conversions
            </h3>
            <button onClick={onOpenNotes} className="min-h-11 cursor-pointer text-sm font-bold underline">
              See all
            </button>
          </div>
          {recentNotes.length === 0 ? (
            <EmptyState text="No conversions yet." action="Convert your first notes" onClick={onOpenNotes} />
          ) : (
            <ul className="flex flex-col gap-3">
              {recentNotes.map((n) => (
                <li key={n.id} className="flex items-center gap-3.5 rounded-2xl bg-[#F7DCF9] p-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#FDF8F2]">
                    <NoteIcon />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate">{n.title}</strong>
                    <span className="text-[13px] text-[#6B3A5C]">{formatDate(n.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Saved restaurants */}
        <section
          aria-labelledby="places-h"
          className="flex min-w-0 flex-[2_1_480px] flex-col gap-4 rounded-[28px] bg-[#FDF8F2] p-6 sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 id="places-h" className="font-['League_Spartan'] text-[28px] font-bold">
              Saved restaurants
            </h3>
            <button onClick={onOpenFood} className="min-h-11 cursor-pointer text-sm font-bold underline">
              Open map
            </button>
          </div>
          {savedRestaurants.length === 0 ? (
            <EmptyState text="Nothing saved yet." action="Find food near you" onClick={onOpenFood} />
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {savedRestaurants.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2.5 rounded-[20px] border-[1.5px] border-[#EBC4E4] p-4"
                >
                  <span className="self-start rounded-full bg-[#F7DCF9] px-3 py-1 text-[13px] font-bold">
                    {p.price ?? "Saved restaurant"}
                  </span>
                  <strong className="font-['League_Spartan'] text-[22px]">{p.name}</strong>
                  {p.address && <span className="text-sm text-[#6B3A5C]">{p.address}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-end justify-between gap-4 rounded-[28px] bg-[#FDF8F2] p-6">
      <p className="text-[15px] font-bold text-[#6B3A5C]">{label}</p>
      <p className="font-['League_Spartan'] text-5xl font-bold leading-none">{value}</p>
    </div>
  );
}

function EmptyState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-[#B57AA8] p-5">
      <p className="text-[#6B3A5C]">{text}</p>
      <button onClick={onClick} className="min-h-11 cursor-pointer font-bold underline">
        {action}
      </button>
    </div>
  );
}

/* ---------- Icons ---------- */
const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function NoteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <rect x="3" y="14" width="5" height="7" rx="2" />
      <rect x="16" y="14" width="5" height="7" rx="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps} width={18} height={18} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
