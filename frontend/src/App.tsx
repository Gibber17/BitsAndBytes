import { useState } from "react";
import Sidebar, { type Tab } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import NotesTab from "./pages/NotesTab";
import LofiTab from "./pages/LofiTab";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import FoodTab from "./pages/FoodTab";

type View = "app" | "landing" | "login" | "signup";

function App() {
  const [view, setView] = useState<View>("app");
  const [tab, setTab] = useState<Tab>("dashboard");

  // Auth & Landing screens rendered without sidebar
  if (view === "landing") {
    return (
      <Landing
        onGetStarted={() => setView("app")}
        onLogIn={() => setView("login")}
      />
    );
  }

  if (view === "login") return <Login />;
  if (view === "signup") return <SignUp />;

  // Main application view with Sidebar
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
      <Sidebar
        active={tab}
        onNavigate={setTab}
        userName="Nora"
        userEmail="nora@example.com"
      />

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
        {tab === "food" && <FoodTab />}
      </main>
    </div>
  );
}

export default App;