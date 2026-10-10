import NotesTab from "./components/NotesTab.tsx";
import FoodTab from "./components/FoodTab.tsx";
import { useState } from "react";

export default function App() {
  const [tab, setTab] = useState<"notes" | "food">("notes");

  return (
    // TODO(style): layout/container
    <div>
      <h1>BitsAndBytes</h1>
      <nav>
        <button onClick={() => setTab("notes")} disabled={tab === "notes"}>
          Notes to LaTeX
        </button>
        <button onClick={() => setTab("food")} disabled={tab === "food"}>
          Find Food
        </button>
      </nav>
      {tab === "notes" ? <NotesTab /> : <FoodTab />}
    </div>
  );
}