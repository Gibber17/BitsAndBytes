import { useState } from "react";
import Landing from "./pages/landing";
import NotesTab from "./pages/NotesTab";
import FoodTab from "./pages/FoodTab";
import LofiTab from "./pages/LofiTab";
import Login from "./pages/login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";

type View = "landing" | "notes" | "food" | "lofi" | "dashboard" | "login" | "signup";

export default function App() {
  const [view, setView] = useState<View>("landing");

  return (
    // TODO(style): layout/container
    <div>
      {view === "landing" ? (
        <Landing
          onGetStarted={() => setView("notes")}
          onLogin={() => setView("login")}
          onSignUp={() => setView("signup")}
        />
      ) : (
        <>
          <h1>BitsAndBytes</h1>
          <nav>
            <button className="underline cursor-pointer" onClick={() => setView("landing")}>Home</button>
            <button className="underline cursor-pointer" onClick={() => setView("notes")} disabled={view === "notes"}>
              Notes to LaTeX
            </button>
            <button className="underline cursor-pointer" onClick={() => setView("food")} disabled={view === "food"}>
              Find Food
            </button>
            <button className="underline cursor-pointer" onClick={() => setView("dashboard")} disabled={view === "dashboard"}>
              Dashboard
            </button>
            <button className="underline cursor-pointer" onClick={() => setView("lofi")} disabled={view === "lofi"}>
              Lofi Music
            </button>
            {/* TODO(style): push auth buttons to the right side of the nav */}
            <button className="underline cursor-pointer" onClick={() => setView("login")} disabled={view === "login"}>
              Log in
            </button>
            <button className="underline cursor-pointer" onClick={() => setView("signup")} disabled={view === "signup"}>
              Sign up
            </button>
          </nav>
          {view === "notes" && <NotesTab />}
          {view === "food" && <FoodTab />}
          {view === "login" && <Login />}
          {view === "signup" && <SignUp />}
          {view === "dashboard" && (
            <Dashboard
              onOpenNotes={() => setView("notes")}
              onOpenFood={() => setView("food")}
              onOpenLofi={() => setView("lofi")}
            />
          )}
          {/* No {view === "lofi" && <LofiTab />} here; see below */}
        </>
      )}

      {/* Always mounted so the music keeps playing; hidden unless on the lofi page */}
      <div hidden={view !== "lofi"}>
        <LofiTab />
      </div>
    </div>
  );
}