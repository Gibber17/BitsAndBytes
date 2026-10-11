import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getSavedRestaurants,
  removeSavedRestaurant,
  saveRestaurant,
  searchFood,
  type Place,
  type SavedRestaurant,
} from "../lib/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet marker icon fix for Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
    /* storage unavailable */
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

  // Load the user's saved restaurants once
  useEffect(() => {
    getSavedRestaurants()
      .then(setSavedRestaurants)
      .catch((e: unknown) => {
        setSaveError(e instanceof Error ? e.message : "Couldn't load saved restaurants.");
      });
  }, []);

  // A ZIP passed in from the app always wins
  useEffect(() => {
    if (zipProp && isZip(zipProp)) {
      setZip(zipProp);
      setZipState("ready");
    }
  }, [zipProp]);

  // Try to detect the ZIP from the browser's location if we don't have one
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

  // Debounce the cuisine text box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCuisine(cuisine.trim()), 400);
    return () => clearTimeout(t);
  }, [cuisine]);

  // Run the search
  useEffect(() => {
    if (!zip) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    searchFood({ zip, cuisine: debouncedCuisine, maxPrice })
      .then((data) => {
        if (id !== requestId.current) return;
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
    setDebouncedCuisine(next);
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

  return (
    <div className="min-h-full bg-[#f6d9f7] px-4 pb-10 pt-5 text-sm text-[#43102f] sm:px-[31px]">
      <h2 className="mb-2 text-[40px] font-bold leading-[1.1] tracking-tight">Food & Map</h2>
      <p className="mb-4 max-w-[450px] text-[12.5px] text-[#7a4c6c]">
        Explore local food spots near you with verified offers and interactive mapping.
      </p>

      {/* ZIP Selection Header */}
      {zipState === "detecting" && (
        <p className="mb-4 text-[12px] text-[#7a4c6c]">Finding places near you…</p>
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

      {showZipForm && (
        <form
          onSubmit={submitZip}
          className="mb-5 flex max-w-[520px] flex-wrap items-center gap-2 rounded-[28px] bg-[#fdf6ee] p-4"
        >
          <input
            value={zipDraft}
            onChange={(e) => setZipDraft(e.target.value.replace(/\D/g, ""))}
            placeholder="ZIP code"
            maxLength={5}
            inputMode="numeric"
            className={`${inputClass} w-[120px] bg-white`}
          />
          <button
            type="submit"
            disabled={!isZip(zipDraft)}
            className="h-11 rounded-full bg-[#43102f] px-6 text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            Save
          </button>
        </form>
      )}

      {/* Interactive Leaflet Map Display */}
      {zip && (
        <div className="mb-6 h-[400px] w-full overflow-hidden rounded-[28px] border-2 border-[#43102f] shadow-md">
          <MapContainer
            center={[28.6024, -81.2001]}
            zoom={14}
            scrollWheelZoom={false}
            className="z-0 h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Example marker for UCF / central area */}
            <Marker position={[28.6024, -81.2001]}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-[#3E1230]">UCF Campus Center</h3>
                  <p className="text-xs text-gray-600">Central Hub</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          placeholder="Filter by cuisine (optional)"
          className={`${inputClass} w-[230px]`}
        />
        <div className="relative">
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={`${inputClass} w-[130px] cursor-pointer appearance-none pr-9`}
          >
            <option value="">Any price</option>
            <option value="1">$</option>
            <option value="2">$$</option>
            <option value="3">$$$</option>
          </select>
          <ChevronIcon className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7a4c6c]" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUICK_CUISINES.map((c) => {
          const active = cuisine.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => pickCuisine(c)}
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

      {saveError && (
        <p role="alert" className="mb-4 max-w-[520px] text-[12.5px] text-[#9b2b43]">
          {saveError}
        </p>
      )}

      {/* Loading */}
      {loading && <p className="mb-4 text-[12px] text-[#7a4c6c]">Searching…</p>}

      {/* Error */}
      {error && !loading && (
        <div role="alert" className="mb-4 max-w-[520px] rounded-[28px] bg-[#fdf6ee] p-5">
          <p className="font-semibold">Couldn&apos;t load places.</p>
          <p className="mt-1 text-[12.5px] text-[#7a4c6c]">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 h-9 rounded-full bg-[#43102f] px-5 text-[12px] font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {loaded && !loading && !error && results.length === 0 && (
        <div className="max-w-[520px] rounded-[28px] bg-[#fdf6ee] p-6 text-center">
          <p className="font-semibold">No places found.</p>
          <p className="mt-1 text-[12.5px] text-[#7a4c6c]">
            Try clearing the cuisine or price filter, or change your ZIP code.
          </p>
        </div>
      )}

      {/* Results Grid */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {results.map((p, index) => {
          const key = restaurantKey(p);
          const isSaved = savedRestaurants.some((saved) => restaurantKey(saved) === key);

          return (
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
          );
        })}
      </ul>
    </div>
  );
}