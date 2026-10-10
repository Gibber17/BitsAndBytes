import { useState } from "react";
import { searchFood, type Place } from "../lib/api";

export default function FoodTab() {
  const [zip, setZip] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setLoading(true);
    setError("");
    try {
      setResults(await searchFood({ zip, cuisine, maxPrice }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    // TODO(style): layout/container
    <div>
      {/* TODO(style): search form row */}
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="ZIP code"
      />
      <input
        value={cuisine}
        onChange={(e) => setCuisine(e.target.value)}
        placeholder="Cuisine"
      />
      <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
        <option value="">Any price</option>
        <option value="1">$</option>
        <option value="2">$$</option>
        <option value="3">$$$</option>
      </select>
      {/* TODO(style): primary button + disabled state */}
      <button onClick={handleSearch} disabled={!zip || loading}>
        {loading ? "Searching..." : "Search"}
      </button>

      {/* TODO(style): error message */}
      {error && <p>{error}</p>}

      {/* TODO(style): results grid */}
      <ul>
        {results.map((p) => (
          // TODO(style): result card
          <li key={p.name + p.address}>
            <h3>{p.name}</h3>
            <p>{p.address}</p>
            {/* TODO(style): make verified offers look clearly different from estimated prices */}
            <p>
              {p.verifiedOffer
                ? `VERIFIED OFFER: ${p.verifiedOffer}`
                : p.price ?? "Price unavailable"}
            </p>
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer">
                View menu / offer
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}