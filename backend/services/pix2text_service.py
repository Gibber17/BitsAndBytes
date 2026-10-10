"""Local full-page recognition of handwritten notes, text, and math."""

import asyncio
import os
import threading
from functools import lru_cache
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError


_recognition_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load_pix2text():
    try:
        from pix2text import Pix2Text
    except ModuleNotFoundError as exc:
        # Do not misreport a broken Pix2Text dependency (for example, an
        # incompatible RapidOCR/CnSTD pair) as Pix2Text being uninstalled.
        if exc.name != "pix2text":
            raise
        raise RuntimeError(
            "Pix2Text is not installed. Install it with `python -m pip install pix2text`."
        ) from exc

    # Pix2Text's formula recognizer uses ONNX Runtime, whose CUDA provider is
    # installed separately from PyTorch's CUDA support. Use CUDA only when ORT
    # actually exposes that provider; otherwise avoid a model-init failure.
    device = os.getenv("PIX2TEXT_DEVICE")
    if device is None:
        try:
            import onnxruntime as ort

            device = "cuda" if "CUDAExecutionProvider" in ort.get_available_providers() else "cpu"
        except ImportError:
            device = "cpu"
    return Pix2Text.from_config(device=device)


def _recognize_sync(image_bytes: bytes) -> str:
    try:
        image = Image.open(BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc

    with _recognition_lock:
        recognizer = _load_pix2text()
        result = recognizer.recognize_text_formula(
            image,
            return_text=True,
            resized_shape=int(os.getenv("PIX2TEXT_RESIZED_SHAPE", "1200")),
            mfr_batch_size=1,
            auto_line_break=True,
            embed_sep=(" $", "$ "),
            isolated_sep=("$$\n", "\n$$"),
        )

    text = result.strip() if isinstance(result, str) else ""
    if not text:
        raise RuntimeError("Pix2Text did not find readable text or math on this page.")
    return text


async def convert_page_to_markdown(image_bytes: bytes) -> str:
    """Run local Pix2Text inference in a worker thread."""
    return await asyncio.to_thread(_recognize_sync, image_bytes)
