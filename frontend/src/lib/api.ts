const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  last_signin_at: string;
}

export interface SavedRestaurant extends Place {
  id: string;
}

export interface DashboardData {
  user: AuthUser;
  notes_converted: number;
  recent_notes: { id: string; title: string; created_at: string }[];
  saved_restaurants: SavedRestaurant[];
}

interface AuthResponse {
  detail?: string;
  message?: string;
  user?: AuthUser;
  notes_converted?: number;
  recent_notes?: DashboardData["recent_notes"];
  saved_restaurants?: SavedRestaurant[];
  restaurants?: SavedRestaurant[];
  restaurant?: SavedRestaurant;
}

async function authRequest(path: string, init?: RequestInit): Promise<AuthResponse> {
  const response = await fetch(`${API}/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: AuthResponse = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? body.message ?? "Authentication request failed.");
  return body;
}

export async function signUpAccount(input: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const result = await authRequest("/signup", { method: "POST", body: JSON.stringify(input) });
  if (!result.user) throw new Error("Account was created, but the server returned no user information.");
  return result.user;
}

export async function signInAccount(email: string, password: string): Promise<AuthUser> {
  const result = await authRequest("/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!result.user) throw new Error("Sign in succeeded, but the server returned no user information.");
  return result.user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API}/api/auth/me`, { credentials: "include" });
  if (response.status === 401) return null;
  const body: AuthResponse = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? "Couldn't check your sign-in status.");
  return body.user ?? null;
}

export async function signOutAccount(): Promise<void> {
  await authRequest("/logout", { method: "POST", body: "{}" });
}

export async function getDashboardData(): Promise<DashboardData> {
  const response = await authRequest("/dashboard");
  if (!response.user) throw new Error("The dashboard response did not include a user.");
  return {
    user: response.user,
    notes_converted: response.notes_converted ?? 0,
    recent_notes: response.recent_notes ?? [],
    saved_restaurants: response.saved_restaurants ?? [],
  };
}

export async function getSavedRestaurants(): Promise<SavedRestaurant[]> {
  const response = await authRequest("/saved-restaurants");
  return response.restaurants ?? [];
}

export async function saveRestaurant(restaurant: Place): Promise<SavedRestaurant> {
  const response = await authRequest("/saved-restaurants", {
    method: "POST",
    body: JSON.stringify(restaurant),
  });
  const saved = response.restaurant;
  if (!saved) throw new Error("The restaurant was saved, but no restaurant data was returned.");
  return saved;
}

export async function removeSavedRestaurant(id: string): Promise<void> {
  await authRequest(`/saved-restaurants/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function convertNotes(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file); // field name must match your FastAPI param
  const res = await fetch(`${API}/api/notes/convert`, { method: "POST", body: form, credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail ?? "Page recognition failed.");
  return body.latex;
}

export interface Place {
  id?: string;
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
