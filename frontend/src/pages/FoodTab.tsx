import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getSavedRestaurants,
  removeSavedRestaurant,
  saveRestaurant,
  searchFood,
  type Place,
  type SavedRestaurant,
} from "../lib/api";

const ZIP_KEY = "knight.zip";
const QUICK_CUISINES = ["Pizza", "Coffee", "Burgers", "Mexican", "Asian", "Dessert"];

const isZip = (z: string) => /^\d{5}$/.test(z);

function readSavedZip(): string {
  try {
    const z = localStorage.getItem(ZIP_KEY) ?? "";
    return isZip(z) ? z : "";
  } catch {
    return "";
  }
}

function saveZip(z: string) {
  try {
    localStorage.setItem(ZIP_KEY, z);
  } catch {
    /* storage unavailable; fine */
  }
}

function restaurantKey(place: Place) {
  return [place.name, place.address ?? "", place.url ?? ""]
    .map((part) => part.trim().toLocaleLowerCase())
    .join("|");
}

// Browser location -> ZIP code (free OpenStreetMap lookup, no API key)
function detectZip(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("Reverse lookup failed");
          const data = await res.json();
          const zip = String(data?.address?.postcode ?? "").match(/\d{5}/)?.[0];
          if (!zip) throw new Error("No ZIP found");
          resolve(zip);
        } catch (e) {
          reject(e);
        }
      },
      (err) => reject(err),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PinIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CheckIcon = ({ className = "h-3 w-3" }: { className?: string }) => (
  <svg className={className} {...iconProps} strokeWidth={3}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

const ExternalIcon = ({ className = "h-3 w-3" }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

const ChevronIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const inputClass =
  "h-11 rounded-full border border-[#c86fb8] bg-[#fdf6ee] px-4 text-[12.5px] text-[#43102f] outline-none placeholder:text-[#7a4c6c]/70 focus-visible:ring-2 focus-visible:ring-[#43102f]";

type ZipState = "detecting" | "ready" | "needed";

// Pass `zip` from your app state if you have it: <FoodTab zip={user.zip} />
export default function FoodTab({ zip: zipProp }: { zip?: string }) {
  const [zip, setZip] = useState(() => (zipProp && isZip(zipProp) ? zipProp : readSavedZip()));
  const [zipState, setZipState] = useState<ZipState>(zip ? "ready" : "detecting");
  const [editingZip, setEditingZip] = useState(false);
  const [zipDraft, setZipDraft] = useState("");

  const [cuisine, setCuisine] = useState("");
  const [debouncedCuisine, setDebouncedCuisine] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [results, setResults] = useState<Place[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<SavedRestaurant[]>([]);
  const [savingKey, setSavingKey] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    getSavedRestaurants()
      .then(setSavedRestaurants)
      .catch((e: unknown) => {
        setSaveError(e instanceof Error ? e.message : "Couldn't load saved restaurants.");
      });
  }, []);

  // 1a. A ZIP passed in from the app always wins
  useEffect(() => {
    if (zipProp && isZip(zipProp)) {
      setZip(zipProp);
      setZipState("ready");
    }
  }, [zipProp]);

  // 1b. No ZIP yet: detect it from the browser's location (asks permission once)
  useEffect(() => {
    if (zip) return;
    let cancelled = false;
    detectZip()
      .then((z) => {
        if (cancelled) return;
        saveZip(z);
        setZip(z);
        setZipState("ready");
      })
      .catch(() => {
        if (!cancelled) setZipState("needed");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Wait a moment after typing a cuisine before searching
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCuisine(cuisine.trim()), 400);
    return () => clearTimeout(t);
  }, [cuisine]);

  // 3. Search automatically whenever the ZIP or a filter changes
  useEffect(() => {
    if (!zip) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    searchFood({ zip, cuisine: debouncedCuisine, maxPrice })
      .then((data) => {
        if (id !== requestId.current) return; // a newer search replaced this one
        setResults(data);
        setLoaded(true);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [zip, debouncedCuisine, maxPrice, reloadKey]);

  function submitZip(e: FormEvent) {
    e.preventDefault();
    if (!isZip(zipDraft)) return;
    saveZip(zipDraft);
    setZip(zipDraft);
    setZipState("ready");
    setEditingZip(false);
    setZipDraft("");
  }

  function pickCuisine(c: string) {
    const next = cuisine.toLowerCase() === c.toLowerCase() ? "" : c;
    setCuisine(next);
    setDebouncedCuisine(next); // skip the typing delay for one-tap chips
  }

  async function toggleSavedRestaurant(place: Place) {
    const key = restaurantKey(place);
    const existing = savedRestaurants.find((saved) => restaurantKey(saved) === key);
    setSavingKey(key);
    setSaveError("");
    try {
      if (existing) {
        await removeSavedRestaurant(existing.id);
        setSavedRestaurants((current) => current.filter((saved) => saved.id !== existing.id));
      } else {
        const saved = await saveRestaurant(place);
        setSavedRestaurants((current) => [...current.filter((item) => item.id !== saved.id), saved]);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't update saved restaurants.");
    } finally {
      setSavingKey("");
    }
  }

  const showZipForm = zipState === "needed" || editingZip;
  const showSkeleton = (zipState === "detecting" || loading) && results.length === 0 && !error;

  return (
    <div className="min-h-full bg-[#f6d9f7] px-4 pb-10 pt-5 text-sm text-[#43102f] sm:px-[31px]">
      <h2 className="mb-2 text-[40px] font-bold leading-[1.1] tracking-tight">Food</h2>
      <p className="mb-4 max-w-[350px] text-[12.5px] text-[#7a4c6c]">
        Places to eat near you, with verified offers and estimated prices.
      </p>

      {/* Where we're searching */}
      {zipState === "detecting" && (
        <p className="mb-4 text-[12px] text-[#7a4c6c]" aria-live="polite">
          Finding places near you…
        </p>
      )}

      {zipState === "ready" && !editingZip && (
        <p className="mb-4 flex items-center gap-1.5 text-[12px] text-[#7a4c6c]">
          <PinIcon className="h-3.5 w-3.5 text-[#c86fb8]" />
          Showing places near <b className="text-[#43102f]">{zip}</b>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => {
              setZipDraft(zip);
              setEditingZip(true);
            }}
            className="font-bold text-[#9b3fc4] underline-offset-2 hover:underline"
          >
            Change
          </button>
        </p>
      )}

      {/* Fallback: only appears if we couldn't work out the ZIP, or the user taps "Change" */}
      {showZipForm && (
        <form
          onSubmit={submitZip}
          className="mb-5 flex max-w-[520px] flex-wrap items-center gap-2 rounded-[28px] bg-[#fdf6ee] p-4"
        >
          <p className="w-full text-[12.5px] text-[#7a4c6c]">
            {editingZip
              ? "Enter a different ZIP code."
              : "We couldn't detect your location. Enter your ZIP once and we'll remember it."}
          </p>
          <input
            value={zipDraft}
            onChange={(e) => setZipDraft(e.target.value.replace(/\D/g, ""))}
            placeholder="ZIP code"
            maxLength={5}
            inputMode="numeric"
            aria-label="ZIP code"
            className={`${inputClass} w-[120px] bg-white`}
          />
          <button
            type="submit"
            disabled={!isZip(zipDraft)}
            className="h-11 rounded-full bg-[#43102f] px-6 text-[12.5px] font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            Save
          </button>
          {editingZip && (
            <button
              type="button"
              onClick={() => setEditingZip(false)}
              className="h-11 rounded-full px-4 text-[12.5px] font-bold text-[#7a4c6c] hover:underline"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {/* Optional filters (they apply automatically, no Search button) */}
      {zip && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="Filter by cuisine (optional)"
              aria-label="Cuisine"
              className={`${inputClass} w-[230px]`}
            />
            <div className="relative">
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Maximum price"
                className={`${inputClass} w-[130px] cursor-pointer appearance-none pr-9`}
              >
                <option value="">Any price</option>
                <option value="1">$</option>
                <option value="2">$$</option>
                <option value="3">$$$</option>
                <option value="4">$$$$</option>
              </select>
              <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a4c6c]" />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Quick cuisine filters">
            {QUICK_CUISINES.map((c) => {
              const active = cuisine.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => pickCuisine(c)}
                  aria-pressed={active}
                  className={`h-8 rounded-full border px-4 text-[11.5px] font-bold transition-colors ${
                    active
                      ? "border-[#43102f] bg-[#43102f] text-white"
                      : "border-[#c86fb8] hover:bg-[#f0c8ec]/60"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-5 max-w-[520px] rounded-[28px] bg-[#fdf6ee] p-5 text-center"
        >
          <p className="font-semibold">Couldn&apos;t load places.</p>
          <p className="mt-1 text-[12.5px] text-[#7a4c6c]">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 h-8 rounded-full bg-[#43102f] px-4 text-[11.5px] font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {saveError && <p role="alert" className="mb-4 max-w-[520px] text-[12.5px] text-[#9b2b43]">{saveError}</p>}

      {/* Empty */}
      {loaded && !loading && !error && results.length === 0 && (
        <div className="max-w-[520px] rounded-[28px] bg-[#fdf6ee] p-6 text-center">
          <p className="font-semibold">No places found.</p>
          <p className="mt-1 text-[12.5px] text-[#7a4c6c]">
            Try clearing the cuisine or price filter, or change your ZIP code.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <p className="mb-3 text-[12px] text-[#7a4c6c]" aria-live="polite">
          Showing {results.length} {results.length === 1 ? "place" : "places"}
        </p>
      )}

      {/* Loading skeleton (first load only) */}
      {showSkeleton && (
        <ul
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-label="Loading places"
        >
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-[190px] animate-pulse rounded-[28px] bg-[#fdf6ee]/70 motion-reduce:animate-none"
            />
          ))}
        </ul>
      )}

      {/* Results grid (dims slightly while a filter change reloads) */}
      <ul
        aria-busy={loading}
        className={`grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
          loading && results.length > 0 ? "opacity-60" : ""
        }`}
      >
        {results.map((p, index) => (
          <li
            key={`${p.name}-${p.address ?? "unknown"}-${p.url ?? index}`}
            className={`flex flex-col rounded-[28px] border-2 bg-[#fdf6ee] p-5 ${
              p.verifiedOffer ? "border-[#43102f]" : "border-transparent"
            }`}
          >
            {/* Verified offers vs. estimated prices */}
            {p.verifiedOffer ? (
              <>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#43102f] px-3 py-1 text-[10.5px] font-bold text-white">
                  <CheckIcon />
                  Verified offer
                </span>
                <p className="mt-3 text-[13.5px] font-semibold text-[#9b3fc4]">
                  {p.verifiedOffer}
                </p>
              </>
            ) : (
              <>
                <span className="inline-flex w-fit items-center rounded-full border border-dashed border-[#c86fb8] px-3 py-1 text-[10.5px] font-semibold text-[#7a4c6c]">
                  {p.price ?? "Price unavailable"}
                </span>
                {p.price && (
                  <p className="mt-1.5 text-[10.5px] text-[#7a4c6c]">
                    Estimated from Google&apos;s price level, not a confirmed offer.
                  </p>
                )}
              </>
            )}

            <h3 className="mt-3 text-[17px] font-semibold leading-tight">{p.name}</h3>

            {p.address && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-[#7a4c6c]">
                <PinIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-[#c86fb8]" />
                {p.address}
              </p>
            )}

            {(() => {
              const key = restaurantKey(p);
              const isSaved = savedRestaurants.some((saved) => restaurantKey(saved) === key);
              return (
                <button
                  type="button"
                  onClick={() => void toggleSavedRestaurant(p)}
                  disabled={savingKey === key}
                  aria-pressed={isSaved}
                  className={`mt-4 self-start rounded-full px-4 py-2 text-[11.5px] font-bold transition-colors disabled:opacity-60 ${
                    isSaved
                      ? "bg-[#43102f] text-white"
                      : "border border-[#c86fb8] text-[#43102f] hover:bg-[#f0c8ec]/60"
                  }`}
                >
                  {savingKey === key ? "Saving…" : isSaved ? "Saved ✓" : "Save restaurant"}
                </button>
              );
            })()}

            <div className="mt-auto pt-4">
              <div className="flex items-center justify-between border-t border-[#f0c8ec] pt-3 text-[12px]">
                {p.rating != null ? (
                  <span className="font-bold text-[#c2710c]">{p.rating}★</span>
                ) : (
                  <span className="text-[#7a4c6c]">No rating</span>
                )}
                {p.url && (
                  <a
                    className="inline-flex items-center gap-1.5 font-bold text-[#9b3fc4] underline-offset-2 hover:underline"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View menu / offer
                    <ExternalIcon />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
