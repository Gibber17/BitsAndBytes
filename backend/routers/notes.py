import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from services.auth import record_note_conversion, require_authenticated_session
from services.ai_service import convert_image_to_latex
from services.hybrid_ocr_service import convert_page_to_markdown

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def _read_image(file: UploadFile) -> bytes:
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

    return image_bytes


@router.post("/convert")
async def convert_notes(request: Request, file: UploadFile = File(...)):
    await require_authenticated_session(request)
    image_bytes = await _read_image(file)

    try:
        recognized_notes = await convert_page_to_markdown(image_bytes)
    except FileNotFoundError as exc:
        logger.exception("Hybrid handwritten OCR model files are missing")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Hybrid page recognition failed")
        message = str(exc)
        status_code = 503 if "not installed" in message else 502
        raise HTTPException(status_code=status_code, detail=message) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Hybrid page recognition failed")
        raise HTTPException(
            status_code=502,
            detail="Handwritten page recognition failed. Check the backend log and try again.",
        ) from exc

    await record_note_conversion(request, file.filename)

    return {
        "latex": recognized_notes,
        "filename": file.filename,
        "format": "markdown-with-latex",
    }


@router.post("/convert-expression")
async def convert_expression(request: Request, file: UploadFile = File(...)):
    await require_authenticated_session(request)
    image_bytes = await _read_image(file)

    try:
        latex = await convert_image_to_latex(image_bytes)
    except Exception:
        logger.exception("LaTeX image conversion failed")
        raise HTTPException(
            status_code=502,
            detail="Note conversion failed. Please try again."
        )

    await record_note_conversion(request, file.filename)

    return {
        "latex": latex,
        "filename": file.filename
    }
