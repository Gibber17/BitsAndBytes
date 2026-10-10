// Optional: the sidebar from the design. Render it next to your tab content in App.tsx:
//
//   <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
//     <Sidebar active={tab} onNavigate={setTab} userName="..." userEmail="..." />
//     <main className="min-w-0 flex-[999_1_560px]">{/* current tab */}</main>
//   </div>

import type { ReactNode } from "react";

export type Tab = "dashboard" | "notes" | "lofi" | "food";

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  userName?: string;
  userEmail?: string;
}

const LINKS: { tab: Tab; label: string; icon: ReactNode }[] = [
  {
    tab: "dashboard",
    label: "Home",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </>
    ),
  },
  {
    tab: "notes",
    label: "Notes",
    icon: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
  },
  {
    tab: "lofi",
    label: "Lofi",
    icon: (
      <>
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <rect x="3" y="14" width="5" height="7" rx="2" />
        <rect x="16" y="14" width="5" height="7" rx="2" />
      </>
    ),
  },
  {
    tab: "food",
    label: "Map",
    icon: (
      <>
        <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
];

export default function Sidebar({ active, onNavigate, userName, userEmail }: Props) {
  return (
    <nav
      aria-label="Main"
      className="flex max-w-full flex-[1_1_220px] flex-col gap-4 bg-[#F2C9EF] px-4 py-5 text-[#3E1230] sm:gap-8 sm:px-5 sm:py-8"
    >
      <button onClick={() => onNavigate("dashboard")} className="flex cursor-pointer items-center gap-3 text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#3E1230] text-[#F7DCF9]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
          </svg>
        </span>
        <span className="font-['League_Spartan'] text-[22px] font-bold leading-none">
          Knight
          <br />
          Space Hub
        </span>
      </button>

      <ul className="flex flex-row flex-wrap gap-2 sm:flex-col">
        {LINKS.map((l) => {
          const current = l.tab === active;
          return (
            <li key={l.tab}>
              <button
                onClick={() => onNavigate(l.tab)}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-[15px] font-bold uppercase tracking-[0.04em] transition-colors ${
                  current ? "bg-[#3E1230] text-[#FDF8F2]" : "hover:bg-[#F7DCF9]"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {l.icon}
                </svg>
                {l.label}
              </button>
            </li>
          );
        })}
      </ul>

      {userName && (
        <div className="mt-auto hidden items-center gap-3 rounded-[18px] bg-[#F7DCF9] p-3 text-sm sm:flex">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#E2A9EE] font-bold">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <strong className="truncate">{userName}</strong>
            {userEmail && <span className="truncate text-[#6B3A5C]">{userEmail}</span>}
          </span>
        </div>
      )}
    </nav>
  );
}