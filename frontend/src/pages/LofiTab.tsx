import { useEffect, useRef, useState } from "react";
import { lofiTracks, type Track } from "../data/LofiTracks";

const TRACKS: Track[] = lofiTracks;

const fmt = (s: number) =>
  Number.isFinite(s) && s > 0
    ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
    : "0:00";

const PlayIcon = ({ className = "h-[9px] w-[9px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="6 3 20 12 6 21" />
  </svg>
);

const PauseIcon = ({ className = "h-[9px] w-[9px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="5" y="3" width="5" height="18" rx="1" />
    <rect x="14" y="3" width="5" height="18" rx="1" />
  </svg>
);

export default function LofiTab() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = TRACKS[index];

  // Start or stop playback whenever play state or track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => {
        setPlaying(false);
        setError("Couldn't play this track. Check the audio URL.");
      });
    } else {
      audio.pause();
    }
  }, [playing, index]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Reset progress when the track changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [index]);

  function next() {
    setError("");
    setIndex((i) => (i + 1) % TRACKS.length);
  }

  function prev() {
    setError("");
    setIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  }

  function seek(value: number) {
    if (audioRef.current) audioRef.current.currentTime = value;
    setCurrentTime(value);
  }

  const volPct = Math.round(volume * 100);

  return (
    <div className="min-h-full bg-[#f6d9f7] px-4 pb-10 pt-5 text-sm text-[#43102f] sm:px-[31px]">
      <h2 className="mb-2 text-[40px] font-bold leading-[1.1] tracking-tight">Lofi</h2>
      <p className="mb-[22px] max-w-[350px] text-[12.5px] text-[#7a4c6c]">
        Pick a track, layer in some rain or ocean, and settle in for a study session.
      </p>

      <audio
        ref={audioRef}
        src={track.audioUrl}
        loop={TRACKS.length === 1}
        onEnded={next}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setError("Couldn't load this track. Check the audio URL.");
        }}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[271px_minmax(0,1fr)]">
        {/* Playlist */}
        <section aria-labelledby="lofi-tracks">
          <h3
            id="lofi-tracks"
            className="mb-2 text-[9.5px] font-bold uppercase tracking-[.12em]"
          >
            Tracks
          </h3>
          <ul className="flex flex-col gap-[9px]">
            {TRACKS.map((t, i) => {
              const active = i === index;
              return (
                <li key={t.id}>
                  <button
                    aria-current={active}
                    onClick={() => {
                      setError("");
                      if (active) {
                        setPlaying((p) => !p);
                      } else {
                        setIndex(i);
                        setPlaying(true);
                      }
                    }}
                    className={`flex h-[50px] w-full items-center gap-[11px] rounded-full border pl-[7px] pr-4 text-left transition-colors ${
                      active
                        ? "border-[#43102f] bg-[#43102f] text-white"
                        : "border-[#c86fb8] hover:bg-[#f0c8ec]/60"
                    }`}
                  >
                    <span className="grid h-[25px] w-[25px] flex-none place-items-center rounded-full border border-current">
                      {active && playing ? <PauseIcon /> : <PlayIcon />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[11.5px] font-bold">{t.title}</span>
                      <span className="truncate text-[9.5px] opacity-85">{t.artist}</span>
                    </span>
                    {active && duration > 0 && (
                      <span className="text-[10.5px] font-medium">{fmt(duration)}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Now playing card */}
        <section className="rounded-[28px] bg-[#fdf6ee] p-4" aria-label="Now playing">
          {/* Album art placeholder (your Track type has no cover field yet) */}
          <div className="grid aspect-[1.43/1] place-items-center overflow-hidden rounded-[18px] bg-[#f0c8ec] p-4 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[#7a4c6c]">
            [Cover art — your book + tea photo]
          </div>

          <p className="mt-3.5 text-[9px] font-bold tracking-[.14em] text-[#7a4c6c]">
            NOW PLAYING
          </p>
          <p className="mb-3 mt-0.5 text-xl font-semibold leading-tight">{track.title}</p>

          {/* Seek bar */}
          <div className="flex items-center gap-2 text-[9.5px] tabular-nums text-[#7a4c6c]">
            <span>{fmt(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer accent-[#43102f]"
            />
            <span>{fmt(duration)}</span>
          </div>

          {/* Controls */}
          <div className="my-4 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              aria-label="Previous track"
              className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#f0c8ec] transition-transform active:scale-95"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="5" x2="5" y2="19" />
                <polygon points="19 5 9 12 19 19" fill="currentColor" />
              </svg>
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#43102f] text-white transition-transform active:scale-95"
            >
              {playing ? (
                <PauseIcon className="h-[15px] w-[15px]" />
              ) : (
                <PlayIcon className="h-[15px] w-[15px]" />
              )}
            </button>
            <button
              onClick={next}
              aria-label="Next track"
              className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#f0c8ec] transition-transform active:scale-95"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="5" x2="19" y2="19" />
                <polygon points="5 5 15 12 5 19" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 text-[10px]">
            <svg className="h-2.5 w-2.5 flex-none" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <polygon points="3 9 8 9 13 5 13 19 8 15 3 15" />
            </svg>
            <label htmlFor="lofi-volume" className="mr-0.5 font-bold">
              Volume
            </label>
            <input
              id="lofi-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-[#43102f]"
            />
            <output className="min-w-[28px] text-right text-[#7a4c6c]">{volPct}%</output>
          </div>

          {/* Error message */}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#f0c8ec] px-3 py-2 text-[11px] font-medium">
              {error}
            </p>
          )}
        </section>
      </div>

      {/* Ambient sound card (cut off in the screenshot) */}
      <section className="mt-[26px] rounded-[28px] bg-[#e8b7e6] px-[26px] pb-[26px] pt-[22px]">
        <h3 className="text-xl font-semibold">Layer in ambient sound</h3>
      </section>
    </div>
  );
}