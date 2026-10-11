import type { Track } from "../data/LofiTracks";

interface MiniPlayerProps {
  track: Track;
  playing: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenLofi?: () => void;
}

export default function MiniPlayer({
  track,
  playing,
  onTogglePlay,
  onNext,
  onPrev,
  onOpenLofi,
}: MiniPlayerProps) {
  return (
    <div
      role="region"
      aria-label="Lofi mini player"
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-center gap-3 rounded-full bg-[#43102f] py-2 pl-5 pr-2 text-white shadow-lg"
    >
      <button
        onClick={onOpenLofi}
        aria-label="Open Lofi tab"
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="truncate text-[12px] font-bold">{track.title}</span>
        <span className="truncate text-[10px] opacity-80">{track.artist}</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous track"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-transform active:scale-95"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="5" x2="5" y2="19" />
            <polygon points="19 5 9 12 19 19" fill="currentColor" />
          </svg>
        </button>

        <button
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#f0c8ec] text-[#43102f] transition-transform active:scale-95"
        >
          {playing ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="3" width="5" height="18" rx="1" />
              <rect x="14" y="3" width="5" height="18" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="6 3 20 12 6 21" />
            </svg>
          )}
        </button>

        <button
          onClick={onNext}
          aria-label="Next track"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-transform active:scale-95"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="5" x2="19" y2="19" />
            <polygon points="5 5 15 12 5 19" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}