import { useEffect, useRef, useState } from "react";

interface Track {
  title: string;
  artist: string;
  src: string; // file under frontend/public, e.g. "/music/track1.mp3"
}

// TODO(content): replace with tracks you have the rights to use
const TRACKS: Track[] = [
  { title: "Track One", artist: "Artist Name", src: "/music/track1.mp3" },
  { title: "Track Two", artist: "Artist Name", src: "/music/track2.mp3" },
  { title: "Track Three", artist: "Artist Name", src: "/music/track3.mp3" },
];

export default function LofiTab() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState("");

  const track = TRACKS[index];

  // Start or stop playback whenever play state or track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => {
        setPlaying(false);
        setError("Couldn't play this track. Check the file path.");
      });
    } else {
      audio.pause();
    }
  }, [playing, index]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function next() {
    setError("");
    setIndex((i) => (i + 1) % TRACKS.length);
  }

  function prev() {
    setError("");
    setIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  }

  return (
    // TODO(style): layout/container
    <div>
      <h2>Lofi Music</h2>

      <audio
        ref={audioRef}
        src={track.src}
        loop={TRACKS.length === 1}
        onEnded={next}
        onError={() => {
          setPlaying(false);
          setError("Couldn't load this track. Check the file path.");
        }}
      />

      {/* TODO(style): now playing / album art area */}
      <p>
        Now playing: {track.title} — {track.artist}
      </p>

      {/* TODO(style): player controls */}
      <button onClick={prev}>Previous</button>
      <button onClick={() => setPlaying((p) => !p)}>
        {playing ? "Pause" : "Play"}
      </button>
      <button onClick={next}>Next</button>

      {/* TODO(style): volume slider */}
      <div>
        <label htmlFor="lofi-volume">Volume</label>
        <input
          id="lofi-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {/* TODO(style): error message */}
      {error && <p role="alert">{error}</p>}

      <h3>Playlist</h3>
      {/* TODO(style): track list, highlight the current track */}
      <ul>
        {TRACKS.map((t, i) => (
          <li key={t.src}>
            <button
              onClick={() => {
                setError("");
                setIndex(i);
                setPlaying(true);
              }}
              disabled={i === index}
            >
              {t.title} — {t.artist}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}