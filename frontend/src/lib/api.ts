const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function convertNotes(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file); // field name must match your FastAPI param
  const res = await fetch(`${API}/api/notes/convert`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).latex;
}

export interface Place {
  name: string;
  address?: string;
  rating?: number;
  price?: string;           // estimated or unknown
  url?: string;
  verifiedOffer?: string;   // only set for confirmed deals
}

export async function searchFood(p: {
  zip: string;
  cuisine: string;
  maxPrice: string;
}): Promise<Place[]> {
  const qs = new URLSearchParams({ zip_code: p.zip });
  if (p.cuisine) qs.set("cuisine", p.cuisine);
  if (p.maxPrice) qs.set("max_price_level", p.maxPrice); // Updated to match food.py

  const res = await fetch(`${API}/api/food/search?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).results;
}
