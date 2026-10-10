import logging

from fastapi import APIRouter, HTTPException, Query

from services.places_service import search_restaurants

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/search")
async def search_food(
    zip_code: str = Query(pattern=r"^\d{5}$"),
    cuisine: str | None = Query(default=None, max_length=40),
    max_price_level: int | None = Query(default=None, ge=1, le=4),
):
    try:
        restaurants = await search_restaurants(zip_code=zip_code, cuisine=cuisine)
    except Exception:
        logger.exception("Restaurant search failed")  # full error shows in the terminal
        raise HTTPException(status_code=502, detail="Unable to retrieve food results.")

    # Keep places at or under the chosen level; keep places with unknown price.
    if max_price_level is not None:
        restaurants = [
            r for r in restaurants
            if r.get("price_level") is None or r["price_level"] <= max_price_level
        ]

    # Known prices first (cheapest first), then by rating; unknown prices last.
    restaurants.sort(
        key=lambda r: (
            r.get("price_level") is None,
            r.get("price_level") or 0,
            -(r.get("rating") or 0),
        )
    )

    return {"zip_code": zip_code, "results": restaurants}