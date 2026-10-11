import { useEffect, useState } from "react";
import Sidebar, { type Tab } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import NotesTab from "./pages/NotesTab";
import FoodTab from "./pages/FoodTab";
import LofiTab from "./pages/LofiTab";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { getCurrentUser, signOutAccount, type AuthUser } from "./lib/api";

type View = "app" | "landing" | "login" | "signup";

function App() {
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

  // Auth & Landing screens rendered without sidebar
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
  }

  // Main application view with Sidebar
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
      <Sidebar
        active={tab}
        onNavigate={setTab}
        userName={user?.first_name || user?.email || "Student"}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="min-w-0 flex-[999_1_560px]">
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
        {tab === "food" && <FoodTab />}
      </main>
    </div>
  );
}

export default App;
