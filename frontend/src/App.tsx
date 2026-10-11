import { useState, useRef, useEffect } from "react";
import Sidebar, { type Tab } from "./components/Sidebar";
import MiniPlayer from "./components/MiniPlayer";
import Dashboard from "./pages/Dashboard";
import NotesTab from "./pages/NotesTab";
import FoodTab from "./pages/FoodTab";
import LofiTab from "./pages/LofiTab";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { getCurrentUser, signOutAccount, type AuthUser } from "./lib/api";
import FoodTab from "./pages/FoodTab";
import { lofiTracks } from "./data/LofiTracks";

type View = "app" | "landing" | "login" | "signup";

function App() {
  // Start on the landing page
  const [view, setView] = useState<View>("landing");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setView("app");
        }
      })
      .catch(() => {
        // A missing or expired local session simply leaves the user on the landing page.
      });
  }, []);

  function handleAuthSuccess(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    setView("app");
  }

  async function handleLogout() {
    try {
      await signOutAccount();
    } finally {
      setUser(null);
      setView("landing");
      setTab("dashboard");
    }
  }

  // --- Global Lofi Player State ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  const currentTrack = lofiTracks[currentIndex];

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
  }, [playing, currentIndex]);

  // Keep volume updated
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Reset progress when the track changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentIndex]);

  // --- Shared player controls (used by LofiTab and MiniPlayer) ---
  const handleSelectTrack = (i: number) => {
    setError("");
    setCurrentIndex(i);
    setPlaying(true);
  };

  const handleTogglePlay = () => {
    setError("");
    setPlaying((p) => !p);
  };

  const handleNext = () => {
    setError("");
    setCurrentIndex((i) => (i + 1) % lofiTracks.length);
  };

  const handlePrev = () => {
    setError("");
    setCurrentIndex((i) => (i - 1 + lofiTracks.length) % lofiTracks.length);
  };

  const handleSeek = (val: number) => {
    if (audioRef.current) audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  // --- Landing, login and signup screens (no sidebar) ---
  if (view === "landing") {
    return (
      <Landing
        onGetStarted={() => setView("signup")}
        onLogIn={() => setView("login")}
      />
    );
  }

  if (view === "login") {
    return <Login onSuccess={handleAuthSuccess} onShowSignup={() => setView("signup")} />;
  }
  if (view === "signup") {
    return <SignUp onSuccess={handleAuthSuccess} onShowLogin={() => setView("login")} />;
    return (
      <Login
        onSuccess={() => {
          setTab("dashboard");
          setView("app");
        }}
        onSwitchToSignUp={() => setView("signup")}
        onBack={() => setView("landing")}
      />
    );
  }

  if (view === "signup") {
    return (
      <SignUp
        onSuccess={() => {
          setTab("dashboard");
          setView("app");
        }}
        onSwitchToLogin={() => setView("login")}
        onBack={() => setView("landing")}
      />
    );
  }

  // --- Main application view with Sidebar ---
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
      {/* Persistent Background Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        loop={lofiTracks.length === 1}
        onEnded={handleNext}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setError("Couldn't load this track. Check the audio URL.");
        }}
      />

      <Sidebar
        active={tab}
        onNavigate={setTab}
        userName={user?.first_name || user?.email || "Student"}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* pb-24 keeps page content from being hidden behind the mini player */}
      <main className={`min-w-0 flex-[999_1_560px] ${tab !== "lofi" ? "pb-24" : ""}`}>
        {tab === "dashboard" && (
          <Dashboard
            onOpenNotes={() => setTab("notes")}
            onOpenFood={() => setTab("food")}
            onOpenLofi={() => setTab("lofi")}
            user={user}
          />
        )}
        {tab === "notes" && <NotesTab />}
        {tab === "lofi" && <LofiTab />}
        {tab === "lofi" && (
          <LofiTab
            track={currentTrack}
            currentIndex={currentIndex}
            playing={playing}
            volume={volume}
            currentTime={currentTime}
            duration={duration}
            error={error}
            onSelectTrack={handleSelectTrack}
            onTogglePlay={handleTogglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onSeek={handleSeek}
            onVolumeChange={setVolume}
          />
        )}
        {tab === "food" && <FoodTab />}
      </main>

      {/* Mini player on every tab except Lofi, which has full controls */}
      {tab !== "lofi" && (
        <MiniPlayer
          track={currentTrack}
          playing={playing}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onOpenLofi={() => setTab("lofi")}
        />
      )}
    </div>
  );
}

export default App;
