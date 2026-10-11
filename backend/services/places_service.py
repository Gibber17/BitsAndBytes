import os

import httpx

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.priceLevel",
    "places.websiteUri",
    "places.googleMapsUri",
])

PRICE_RANK = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}

async def _zip_to_place(client: httpx.AsyncClient, zip_code: str) -> dict | None:
    """Look up city/state/coordinates for a US ZIP. Returns None if not found."""
    try:
        r = await client.get(f"https://api.zippopotam.us/us/{zip_code}")
        if r.status_code != 200:
            return None
        p = r.json()["places"][0]
        return {
            "city": p["place name"],
            "state": p["state abbreviation"],
            "lat": float(p["latitude"]),
            "lng": float(p["longitude"]),
        }
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None


async def search_restaurants(zip_code: str, cuisine: str | None = None) -> list[dict]:
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not set")

    cuisine = (cuisine or "").strip()

    async with httpx.AsyncClient(timeout=10) as client:
        loc = await _zip_to_place(client, zip_code)

        if loc:
            query = f"{cuisine} restaurants in {loc['city']}, {loc['state']} {zip_code}".strip()
        else:
            query = f"{cuisine} restaurants in {zip_code}".strip()

        body = {"textQuery": query, "pageSize": 20}
        if loc:
            body["locationBias"] = {
                "circle": {
                    "center": {"latitude": loc["lat"], "longitude": loc["lng"]},
                    "radius": 8000.0,  # meters
                }
            }

        resp = await client.post(
            SEARCH_URL,
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
        )
        resp.raise_for_status()

    results = []
    for p in resp.json().get("places", []):
        rank = PRICE_RANK.get(p.get("priceLevel"))
        results.append({
            "id": p.get("id"),
            "name": p.get("displayName", {}).get("text", "Unknown"),
            "address": p.get("formattedAddress"),
            "lat": (p.get("location") or {}).get("latitude"),
            "lng": (p.get("location") or {}).get("longitude"),
            "rating": p.get("rating"),
            "price_level": rank,
            "price": f"Est. {'$' * rank}" if rank else None,
            "meal_price": None,
            "url": p.get("websiteUri") or p.get("googleMapsUri"),
        })
    return results
