"""Local account and cookie-session endpoints backed by an XML user store."""

import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import xml.etree.ElementTree as StdET

import defusedxml.ElementTree as ET
from defusedxml.common import DefusedXmlException
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/auth", tags=["Authentication"])
USERS_FILE = Path(__file__).resolve().parents[1] / "users.xml"
SESSION_COOKIE = "study_session"
SESSION_DAYS = 14
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
MAX_AUTH_EVENTS = 100
file_lock = asyncio.Lock()


class SignupPayload(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=1024)


class SigninPayload(BaseModel):
    email: str | None = Field(default=None, max_length=254)
    username: str | None = Field(default=None, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class SavedRestaurantPayload(BaseModel):
    id: str | None = Field(default=None, max_length=256)
    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    rating: float | None = Field(default=None, ge=0, le=5)
    price: str | None = Field(default=None, max_length=80)
    url: str | None = Field(default=None, max_length=1000)
    verifiedOffer: str | None = Field(default=None, max_length=500)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp(value: datetime | None = None) -> str:
    return (value or _now()).isoformat(timespec="seconds")


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)


def _load_users() -> StdET.Element:
    if not USERS_FILE.exists():
        return StdET.Element("users")
    try:
        return ET.parse(USERS_FILE).getroot()
    except (ET.ParseError, DefusedXmlException, OSError) as exc:
        raise HTTPException(status_code=500, detail="The XML user store could not be read.") from exc


def _save_users(root: StdET.Element) -> None:
    temporary_file = USERS_FILE.with_suffix(".tmp")
    try:
        StdET.ElementTree(root).write(temporary_file, encoding="utf-8", xml_declaration=True)
        os.replace(temporary_file, USERS_FILE)
    except OSError as exc:
        temporary_file.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="The XML user store could not be saved.") from exc


def _find_user(root: StdET.Element, identifier: str):
    normalized = identifier.casefold()
    for user in root.findall("user"):
        email = user.findtext("email", "")
        username = user.findtext("username", "")
        if email.casefold() == normalized or username.casefold() == normalized:
            return user
    return None


def _record_event(user: StdET.Element, action: str) -> str:
    occurred_at = _timestamp()
    events = user.find("auth_events")
    if events is None:
        events = StdET.SubElement(user, "auth_events")
    StdET.SubElement(events, "event", {"action": action, "at": occurred_at})
    for old_event in list(events)[:-MAX_AUTH_EVENTS]:
        events.remove(old_event)

    field = {"signup": "created_at", "signin": "last_signin_at", "logout": "last_logout_at"}[action]
    field_node = user.find(field)
    if field_node is None:
        field_node = StdET.SubElement(user, field)
    field_node.text = occurred_at

    if action == "signin":
        count_node = user.find("signin_count")
        if count_node is None:
            count_node = StdET.SubElement(user, "signin_count")
        try:
            count_node.text = str(int(count_node.text or "0") + 1)
        except ValueError:
            count_node.text = "1"
    return occurred_at


def _public_user(user: StdET.Element) -> dict[str, str]:
    return {
        "id": user.get("id", ""),
        "first_name": user.findtext("first_name", ""),
        "last_name": user.findtext("last_name", ""),
        "email": user.findtext("email") or user.findtext("username", ""),
        "created_at": user.findtext("created_at", ""),
        "last_signin_at": user.findtext("last_signin_at", ""),
    }


def _note_data(user: StdET.Element) -> tuple[int, list[dict[str, str]]]:
    conversions = user.find("note_conversions")
    if conversions is None:
        return 0, []
    try:
        count = int(conversions.get("count", "0"))
    except ValueError:
        count = 0
    recent = [
        {"id": note.get("id", ""), "title": note.get("title", "Converted notes"), "created_at": note.get("at", "")}
        for note in reversed(conversions.findall("note"))
    ][:5]
    return count, recent


def _saved_restaurants(user: StdET.Element) -> list[dict[str, str | float | None]]:
    restaurants = user.find("saved_restaurants")
    if restaurants is None:
        return []
    return [
        {
            "id": restaurant.get("id", ""),
            "name": restaurant.findtext("name", ""),
            "address": restaurant.findtext("address") or None,
            "rating": _optional_float(restaurant.findtext("rating")),
            "price": restaurant.findtext("price") or None,
            "url": restaurant.findtext("url") or None,
            "verifiedOffer": restaurant.findtext("verified_offer") or None,
        }
        for restaurant in restaurants.findall("restaurant")
    ]


def _restaurant_id(payload: SavedRestaurantPayload) -> str:
    if payload.id:
        return payload.id
    key = "|".join((payload.name.casefold(), (payload.address or "").casefold(), (payload.url or "").casefold()))
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:24]


def _write_restaurant(parent: StdET.Element, payload: SavedRestaurantPayload, restaurant_id: str) -> None:
    restaurant = StdET.SubElement(parent, "restaurant", {"id": restaurant_id})
    StdET.SubElement(restaurant, "name").text = payload.name.strip()
    for field, value in (
        ("address", payload.address),
        ("rating", str(payload.rating) if payload.rating is not None else None),
        ("price", payload.price),
        ("url", payload.url),
        ("verified_offer", payload.verifiedOffer),
    ):
        if value:
            StdET.SubElement(restaurant, field).text = value
    StdET.SubElement(restaurant, "saved_at").text = _timestamp()


def _optional_float(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _require_user(root: StdET.Element, token: str | None):
    if not token:
        raise HTTPException(status_code=401, detail="You are not signed in.")
    user, session = _find_session(root, token)
    if user is None or session is None or _session_expired(session):
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return user


async def require_authenticated_session(request: Request) -> None:
    """Reject unauthenticated uploads before starting the expensive OCR model."""
    async with file_lock:
        _require_user(_load_users(), request.cookies.get(SESSION_COOKIE))


async def record_note_conversion(request: Request, filename: str | None) -> None:
    """Record one successfully converted upload for its signed-in owner."""
    async with file_lock:
        users = _load_users()
        user = _require_user(users, request.cookies.get(SESSION_COOKIE))
        conversions = user.find("note_conversions")
        if conversions is None:
            conversions = StdET.SubElement(user, "note_conversions", {"count": "0"})
        try:
            conversions.set("count", str(int(conversions.get("count", "0")) + 1))
        except ValueError:
            conversions.set("count", "1")
        title = Path(filename or "Converted notes").name.strip() or "Converted notes"
        StdET.SubElement(
            conversions,
            "note",
            {"id": secrets.token_hex(8), "title": title, "at": _timestamp()},
        )
        for old_note in list(conversions.findall("note"))[:-50]:
            conversions.remove(old_note)
        _save_users(users)


def _session_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _find_session(root: StdET.Element, token: str):
    wanted_digest = _session_digest(token)
    for user in root.findall("user"):
        for session in user.findall("session"):
            if hmac.compare_digest(session.findtext("token_hash", ""), wanted_digest):
                return user, session
    return None, None


def _session_expired(session: StdET.Element) -> bool:
    try:
        expiry = datetime.fromisoformat(session.findtext("expires_at", ""))
        return expiry <= _now()
    except ValueError:
        return True


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _clear_legacy_session_cookie(response: Response) -> None:
    # Older sessions used a path that excluded /api/notes uploads.
    response.delete_cookie(
        SESSION_COOKIE,
        path="/api/auth",
        httponly=True,
        samesite="lax",
        secure=SESSION_COOKIE_SECURE,
    )


def _normalize_email(value: str) -> str:
    email = value.strip().casefold()
    if "@" not in email or email.startswith("@") or email.endswith("@") or any(ch.isspace() for ch in email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return email


@router.post("/signup", status_code=201)
async def signup(payload: SignupPayload):
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    email = _normalize_email(payload.email)
    if not first_name or not last_name:
        raise HTTPException(status_code=422, detail="First and last name are required.")

    salt = secrets.token_bytes(16)
    password_hash = await asyncio.to_thread(_hash_password, payload.password, salt)

    async with file_lock:
        users = _load_users()
        if _find_user(users, email) is not None:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        user = StdET.SubElement(users, "user", {"id": secrets.token_hex(16)})
        StdET.SubElement(user, "first_name").text = first_name
        StdET.SubElement(user, "last_name").text = last_name
        StdET.SubElement(user, "email").text = email
        StdET.SubElement(user, "salt").text = salt.hex()
        StdET.SubElement(user, "password_hash").text = password_hash.hex()
        _record_event(user, "signup")
        _save_users(users)

    return {"status": "success", "message": "Account created successfully", "user": _public_user(user)}


@router.post("/signin")
async def signin(payload: SigninPayload, response: Response):
    identifier = (payload.email or payload.username or "").strip()
    if not identifier:
        raise HTTPException(status_code=422, detail="Email and password are required.")

    async with file_lock:
        users = _load_users()
        user = _find_user(users, identifier)
        salt_text = user.findtext("salt", "") if user is not None else ""
        hash_text = user.findtext("password_hash", "") if user is not None else ""

    if user is None:
        await asyncio.to_thread(_hash_password, payload.password, b"\x00" * 16)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    try:
        salt = bytes.fromhex(salt_text)
        stored_hash = bytes.fromhex(hash_text)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="The XML user store has an invalid account record.") from exc

    candidate_hash = await asyncio.to_thread(_hash_password, payload.password, salt)
    if not hmac.compare_digest(candidate_hash, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = secrets.token_urlsafe(32)
    async with file_lock:
        users = _load_users()
        user = _find_user(users, identifier)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        for old_session in list(user.findall("session")):
            if _session_expired(old_session):
                user.remove(old_session)
        session = StdET.SubElement(user, "session")
        StdET.SubElement(session, "token_hash").text = _session_digest(token)
        StdET.SubElement(session, "expires_at").text = _timestamp(_now() + timedelta(days=SESSION_DAYS))
        _record_event(user, "signin")
        _save_users(users)
        user_data = _public_user(user)

    _set_session_cookie(response, token)
    _clear_legacy_session_cookie(response)
    return {"status": "success", "message": "Signed in successfully", "user": user_data}


@router.get("/me")
async def current_user(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="You are not signed in.")

    async with file_lock:
        users = _load_users()
        user, session = _find_session(users, token)
        if user is None or session is None or _session_expired(session):
            raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
        user_data = _public_user(user)

    # Refresh older sessions onto the site-wide cookie path so uploads receive it too.
    _set_session_cookie(response, token)
    _clear_legacy_session_cookie(response)
    return {"user": user_data}


@router.get("/dashboard")
async def dashboard_data(request: Request):
    async with file_lock:
        user = _require_user(_load_users(), request.cookies.get(SESSION_COOKIE))
        notes_count, recent_notes = _note_data(user)
        return {
            "user": _public_user(user),
            "notes_converted": notes_count,
            "recent_notes": recent_notes,
            "saved_restaurants": _saved_restaurants(user),
        }


@router.get("/saved-restaurants")
async def get_saved_restaurants(request: Request):
    async with file_lock:
        user = _require_user(_load_users(), request.cookies.get(SESSION_COOKIE))
        return {"restaurants": _saved_restaurants(user)}


@router.post("/saved-restaurants", status_code=201)
async def save_restaurant(payload: SavedRestaurantPayload, request: Request):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Restaurant name is required.")
    restaurant_id = _restaurant_id(payload)
    async with file_lock:
        users = _load_users()
        user = _require_user(users, request.cookies.get(SESSION_COOKIE))
        restaurants = user.find("saved_restaurants")
        if restaurants is None:
            restaurants = StdET.SubElement(user, "saved_restaurants")
        for existing in list(restaurants.findall("restaurant")):
            if existing.get("id") == restaurant_id:
                restaurants.remove(existing)
        _write_restaurant(restaurants, payload, restaurant_id)
        _save_users(users)
        saved = next(item for item in _saved_restaurants(user) if item["id"] == restaurant_id)
    return {"restaurant": saved}


@router.delete("/saved-restaurants/{restaurant_id}")
async def unsave_restaurant(restaurant_id: str, request: Request):
    async with file_lock:
        users = _load_users()
        user = _require_user(users, request.cookies.get(SESSION_COOKIE))
        restaurants = user.find("saved_restaurants")
        if restaurants is not None:
            for existing in list(restaurants.findall("restaurant")):
                if existing.get("id") == restaurant_id:
                    restaurants.remove(existing)
                    _save_users(users)
                    break
    return {"status": "success"}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        async with file_lock:
            users = _load_users()
            user, session = _find_session(users, token)
            if user is not None and session is not None:
                user.remove(session)
                _record_event(user, "logout")
                _save_users(users)

    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=SESSION_COOKIE_SECURE)
    _clear_legacy_session_cookie(response)
    return {"status": "success", "message": "Signed out successfully"}
