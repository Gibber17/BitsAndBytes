from fastapi import APIRouter, HTTPException, Query
from services.places_service import search_restaurants

router = APIRouter()


@router.get("/search")
async def search_food(
    zip_code: str = Query(pattern=r"^\d{5}$"),
    cuisine: str | None = None,
    max_price: float | None = Query(default=None, ge=0),
):
    try:
        restaurants = await search_restaurants(
            zip_code=zip_code,
            cuisine=cuisine,
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve food results."
        )

    # Only filter by an exact price when the data actually provides one.
    if max_price is not None:
        restaurants = [
            restaurant
            for restaurant in restaurants
            if restaurant.get("meal_price") is not None
            and restaurant["meal_price"] <= max_price
        ]

    restaurants.sort(
        key=lambda restaurant: (
            restaurant.get("meal_price") is None,
            restaurant.get("meal_price") or 0
        )
    )

    return {
        "zip_code": zip_code,
        "results": restaurants,
    }