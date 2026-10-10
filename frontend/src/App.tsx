import { useState } from "react";
import Landing from "./pages/Landing";
import Sidebar, { type Tab } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import NotesTab from "./pages/NotesTab";
import LofiTab from "./pages/LofiTab";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";

function App() {
  // Which page is showing. "dashboard" means you land on the dashboard first.
  const [tab, setTab] = useState<Tab>("dashboard");

  function handleSavePdf() {
    window.print()
  }

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
            <button className="underline cursor-pointer" onClick={() => setView("signup")}>
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
    <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
      <Sidebar active={tab} onNavigate={setTab} userName="Nora" userEmail="[SCHOOL EMAIL]" />

      <main className="min-w-0 flex-[999_1_560px]">
        {tab === "dashboard" && (
          <Dashboard
            onOpenNotes={() => setTab("notes")}
            onOpenFood={() => setTab("food")}
            onOpenLofi={() => setTab("lofi")}
          />
        )}
        {tab === "notes" && <NotesTab />}
        {tab === "lofi" && <LofiTab />}
        {tab === "food" && (
          // TODO: replace with the map page once it exists
          <p className="p-10 text-[#3E1230]">Map coming soon.</p>
        )}
      </main>
    </div>
  );
}

export default App;