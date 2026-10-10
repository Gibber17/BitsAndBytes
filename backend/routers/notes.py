import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from services.ai_service import convert_image_to_latex

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/convert")
async def convert_notes(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPG, PNG, or WebP image."
        )

    image_bytes = await file.read(MAX_FILE_SIZE + 1)

    if not image_bytes:
        raise HTTPException(status_code=400, detail="File is empty.")

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB.")

    try:
        latex = await convert_image_to_latex(image_bytes)
    except Exception:
        logger.exception("LaTeX image conversion failed")
        raise HTTPException(
            status_code=502,
            detail="Note conversion failed. Please try again."
        )

    return {
        "latex": latex,
        "filename": file.filename
    }
