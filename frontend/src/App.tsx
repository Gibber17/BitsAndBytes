import { useState } from "react";
import Sidebar, { type Tab } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import NotesTab from "./pages/NotesTab";
import LofiTab from "./pages/LofiTab";
// Import FoodTab if you have it, or leave it as a component/placeholder
// import FoodTab from "./pages/FoodTab";

function App() {
  // Which page/tab is showing
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="flex min-h-screen flex-wrap bg-[#F7DCF9]">
      <Sidebar 
        active={tab} 
        onNavigate={setTab} 
        userName="Nora" 
        userEmail="[SCHOOL EMAIL]" 
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
        {tab === "food" && (
          // TODO: replace with the map page once it exists
          <p className="p-10 text-[#3E1230]">Map coming soon.</p>
        )}
      </main>
    </div>
  );
}

export default App;
