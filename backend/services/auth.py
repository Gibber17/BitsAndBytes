"""Signup and signin endpoints backed by a local XML user store."""

import asyncio
import hashlib
import hmac
import json
import os
import secrets
import xml.etree.ElementTree as StdET
from pathlib import Path

import defusedxml.ElementTree as ET
from defusedxml.common import DefusedXmlException
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/api/auth", tags=["Authentication"])
USERS_FILE = Path(__file__).resolve().parents[1] / "users.xml"
MAX_REQUEST_BYTES = 8 * 1024
file_lock = asyncio.Lock()

REQUEST_BODY = {
    "requestBody": {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "required": ["password"],
                    "properties": {
                        "username": {"type": "string", "example": "student"},
                        "email": {"type": "string", "example": "student@example.com"},
                        "password": {"type": "string", "example": "correct horse battery staple"},
                    },
                }
            },
            "application/xml": {
                "schema": {
                    "type": "object",
                    "xml": {"name": "credentials"},
                    "properties": {
                        "username": {"type": "string"},
                        "email": {"type": "string"},
                        "password": {"type": "string"},
                    },
                }
            },
        },
    }
}


def _xml_credentials(body: bytes) -> tuple[str, str]:
    try:
        root = ET.fromstring(body)
    except (ET.ParseError, DefusedXmlException) as exc:
        raise HTTPException(status_code=400, detail="Invalid XML request body") from exc

    username = root.findtext("username") or root.findtext("email") or ""
    password = root.findtext("password") or ""
    return username.strip(), password


def _json_credentials(body: bytes) -> tuple[str, str]:
    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON request body") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be an object")

    username = payload.get("username") or payload.get("email") or ""
    password = payload.get("password") or ""
    if not isinstance(username, str) or not isinstance(password, str):
        raise HTTPException(status_code=400, detail="Username and password must be strings")
    return username.strip(), password


async def _get_credentials(request: Request) -> tuple[str, str, bool]:
    body = await request.body()
    if len(body) > MAX_REQUEST_BYTES:
        raise HTTPException(status_code=413, detail="Authentication request is too large")
    if not body.strip():
        raise HTTPException(status_code=400, detail="Request body is required")

    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    is_xml = content_type in {"application/xml", "text/xml"} or body.lstrip().startswith(b"<")
    username, password = (
        _xml_credentials(body) if is_xml else _json_credentials(body)
    )
    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Provide a non-empty username (or email) and password",
        )
    if len(username) > 254 or len(password) > 1024:
        raise HTTPException(status_code=400, detail="Username or password is too long")
    return username, password, is_xml


def _response(is_xml: bool, status_code: int = 200, **fields: str) -> Response:
    if not is_xml:
        return JSONResponse(fields, status_code=status_code)

    root = StdET.Element("response")
    for key, value in fields.items():
        StdET.SubElement(root, key).text = value
    content = StdET.tostring(root, encoding="utf-8", xml_declaration=True)
    return Response(content, status_code=status_code, media_type="application/xml")


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)


def _load_users() -> StdET.Element:
    if not USERS_FILE.exists():
        return StdET.Element("users")
    try:
        return ET.parse(USERS_FILE).getroot()
    except (ET.ParseError, DefusedXmlException, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail="The XML user store could not be read.",
        ) from exc


def _save_users(root: StdET.Element) -> None:
    temporary_file = USERS_FILE.with_suffix(".tmp")
    try:
        StdET.ElementTree(root).write(
            temporary_file,
            encoding="utf-8",
            xml_declaration=True,
        )
        os.replace(temporary_file, USERS_FILE)
    except OSError as exc:
        temporary_file.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="The XML user store could not be saved.",
        ) from exc


def _find_user(root: StdET.Element, username: str):
    normalized = username.casefold()
    for user in root.findall("user"):
        stored_name = user.findtext("username", "")
        if stored_name.casefold() == normalized:
            return user
    return None


@router.post("/signup", openapi_extra=REQUEST_BODY, status_code=201)
async def signup(request: Request):
    username, password, is_xml = await _get_credentials(request)
    salt = secrets.token_bytes(16)
    password_hash = await asyncio.to_thread(_hash_password, password, salt)

    async with file_lock:
        users = _load_users()
        if _find_user(users, username) is not None:
            raise HTTPException(status_code=409, detail="Username already exists")

        user = StdET.SubElement(users, "user")
        StdET.SubElement(user, "username").text = username
        StdET.SubElement(user, "salt").text = salt.hex()
        StdET.SubElement(user, "password_hash").text = password_hash.hex()
        _save_users(users)

    return _response(
        is_xml,
        status_code=201,
        status="success",
        message="Account created successfully",
    )


@router.post("/signin", openapi_extra=REQUEST_BODY)
async def signin(request: Request):
    username, password, is_xml = await _get_credentials(request)

    async with file_lock:
        user = _find_user(_load_users(), username)
        salt_text = user.findtext("salt", "") if user is not None else ""
        hash_text = user.findtext("password_hash", "") if user is not None else ""

    if user is None:
        await asyncio.to_thread(_hash_password, password, b"\x00" * 16)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    try:
        salt = bytes.fromhex(salt_text)
        stored_hash = bytes.fromhex(hash_text)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail="The XML user store contains an invalid account record.",
        ) from exc

    password_hash = await asyncio.to_thread(_hash_password, password, salt)
    if not hmac.compare_digest(password_hash, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return _response(is_xml, status="success", message="Signed in successfully")
