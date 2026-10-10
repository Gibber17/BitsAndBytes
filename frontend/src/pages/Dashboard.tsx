interface Props {
  onOpenNotes: () => void;
  onOpenFood: () => void;
  onOpenLofi: () => void;
}

// TODO(data): replace these samples with real data from the backend
const RECENT_NOTES = [
  { id: "1", title: "Sample: Calculus review", date: "2026-10-08" },
  { id: "2", title: "Sample: Physics lecture 4", date: "2026-10-05" },
];

const SAVED_PLACES = [
  { id: "1", name: "Sample: Pizza Place", cuisine: "Pizza" },
  { id: "2", name: "Sample: Noodle House", cuisine: "Ramen" },
];

export default function Dashboard({ onOpenNotes, onOpenFood, onOpenLofi }: Props) {
  return (
    // TODO(style): layout/container
    <div>
      <h2>Dashboard</h2>
      {/* TODO(auth): show the logged-in user's name or email */}
      <p>Welcome back!</p>

      {/* TODO(style): stat cards row */}
      <section>
        <h3>Overview</h3>
        <p>Notes converted: {RECENT_NOTES.length}</p>
        <p>Saved restaurants: {SAVED_PLACES.length}</p>
      </section>

      {/* TODO(style): quick action cards */}
      <section>
        <h3>Quick actions</h3>
        <button className="underline cursor-pointer" onClick={onOpenNotes}>
          Convert notes
        </button>
        <button className="underline cursor-pointer" onClick={onOpenFood}>
          Find food
        </button>
        <button className="underline cursor-pointer" onClick={onOpenLofi}>
          Play lofi
        </button>
      </section>

      {/* TODO(style): list or table */}
      <section>
        <h3>Recent conversions</h3>
        {RECENT_NOTES.length === 0 ? (
          <p>No conversions yet.</p>
        ) : (
          <ul>
            {RECENT_NOTES.map((n) => (
              <li key={n.id}>
                {n.title} ({n.date})
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* TODO(style): list or card grid */}
      <section>
        <h3>Saved restaurants</h3>
        {SAVED_PLACES.length === 0 ? (
          <p>Nothing saved yet.</p>
        ) : (
          <ul>
            {SAVED_PLACES.map((p) => (
              <li key={p.id}>
                {p.name} ({p.cuisine})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}