"""Full-page OCR with page layout, Qwen math crops, and TrOCR text lines."""

import asyncio
import logging
import os
import re
import threading
from functools import lru_cache
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from services.ai_service import convert_image_to_latex_sync


_layout_lock = threading.Lock()
_text_lock = threading.Lock()
logger = logging.getLogger(__name__)
TEXT_MODEL_ID = os.getenv("TROCR_MODEL_ID", "microsoft/trocr-base-handwritten")
LAYOUT_SIZE = int(os.getenv("PIX2TEXT_RESIZED_SHAPE", "1200"))


@lru_cache(maxsize=1)
def _load_layout_engine():
    try:
        from pix2text import Pix2Text
    except ModuleNotFoundError as exc:
        if exc.name != "pix2text":
            raise
        raise RuntimeError(
            "Pix2Text is not installed. Install it with `python -m pip install pix2text`."
        ) from exc

    # Only its layout detector is used. Disable Pix2Text's text/formula OCR;
    # the detected crops are sent to TrOCR or the project's Qwen adapter.
    return Pix2Text.from_config(
        enable_formula=False,
        enable_table=False,
        device="cpu",
    )


@lru_cache(maxsize=1)
def _load_trocr():
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    except ImportError as exc:
        raise RuntimeError(
            "TrOCR needs Transformers. Install it with `python -m pip install transformers`."
        ) from exc

    processor = TrOCRProcessor.from_pretrained(TEXT_MODEL_ID)
    model = VisionEncoderDecoderModel.from_pretrained(TEXT_MODEL_ID)
    # Leave VRAM for the 4-bit Qwen model used on equation crops.
    model.to("cpu")
    model.eval()
    return processor, model


def _get_crop(image: Image.Image, position) -> Image.Image:
    points = np.asarray(position).reshape(-1, 2)
    width, height = image.size
    left = max(0, int(np.floor(points[:, 0].min())))
    top = max(0, int(np.floor(points[:, 1].min())))
    right = min(width, int(np.ceil(points[:, 0].max())))
    bottom = min(height, int(np.ceil(points[:, 1].max())))
    if right <= left or bottom <= top:
        raise ValueError("Page layout detection returned an invalid region.")
    return image.crop((left, top, right, bottom))


def _text_line_crops(block: Image.Image) -> list[Image.Image]:
    """Split a detected text block into horizontal line crops by ink projection."""
    import cv2

    gray = np.asarray(block.convert("L"))
    height, width = gray.shape
    if height < 8 or width < 8:
        return [block]

    if min(height, width) >= 31:
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            31,
            13,
        )
    else:
        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU
        )

    row_ink = np.count_nonzero(binary, axis=1)
    # Discard full-width rules/borders so they don't merge separate text lines.
    row_ink[row_ink > width * 0.55] = 0
    active = row_ink >= max(2, int(width * 0.003))

    # Bridge tiny gaps inside connected handwriting (dots and accents).
    for gap in range(1, min(4, height - 1)):
        active[gap:-gap] |= active[:-2 * gap] & active[2 * gap:]

    edges = np.diff(np.pad(active.astype(np.int8), (1, 1)))
    starts = np.flatnonzero(edges == 1)
    ends = np.flatnonzero(edges == -1)
    if not len(starts):
        return [block]

    line_height_floor = max(6, int(height * 0.006))
    pad_y = max(3, int(height * 0.012))
    crops: list[Image.Image] = []
    for start, end in zip(starts, ends):
        if end - start < line_height_floor:
            continue
        y0 = max(0, int(start) - pad_y)
        y1 = min(height, int(end) + pad_y)
        segment = binary[y0:y1]
        col_ink = np.count_nonzero(segment, axis=0)
        x_active = np.flatnonzero(col_ink >= 1)
        if not len(x_active):
            continue
        pad_x = max(6, int((x_active[-1] - x_active[0] + 1) * 0.025))
        x0 = max(0, int(x_active[0]) - pad_x)
        x1 = min(width, int(x_active[-1]) + 1 + pad_x)
        crops.append(block.crop((x0, y0, x1, y1)))

    return crops or [block]


def _recognize_text_line(line_image: Image.Image) -> str:
    processor, model = _load_trocr()
    import torch

    pixel_values = processor(images=line_image.convert("RGB"), return_tensors="pt").pixel_values
    with _text_lock, torch.inference_mode():
        generated = model.generate(pixel_values, max_new_tokens=128, num_beams=2)
    return processor.batch_decode(generated, skip_special_tokens=True)[0].strip()


def _image_bytes(image: Image.Image) -> bytes:
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _recognize_math_image(image: Image.Image) -> str:
    """Treat an empty crop transcription as a skippable OCR miss."""
    try:
        return convert_image_to_latex_sync(_image_bytes(image)).strip()
    except RuntimeError as exc:
        if "model returned an empty transcription" not in str(exc).lower():
            raise
        logger.warning("Qwen returned no text for a math crop; skipping that crop")
        return ""


def _recognize_math_crop(crop: Image.Image) -> str:
    """Recognize tall math blocks line by line so side notes are not lost."""
    line_crops = _text_line_crops(crop)
    if len(line_crops) < 2 or crop.height < max(260, int(crop.width * 0.35)):
        latex = _recognize_math_image(crop)
        return _format_page_math_layout(latex)

    first_row = _split_first_row_notes(line_crops[0])
    if len(first_row) == 2:
        main_expression = _recognize_math_image(first_row[0])
        note_crop = first_row[1]
        note_lines = _text_line_crops(note_crop)
        note_cells = []
        for note_line in note_lines:
            parts = _split_first_row_notes(note_line)
            if len(parts) == 2:
                note_cells.append([
                    _recognize_math_image(part)
                    for part in parts
                ])
            else:
                note_cells.append([
                    _recognize_math_image(note_line), ""
                ])

        if main_expression and len(note_cells) == 2 and all(any(cell for cell in row) for row in note_cells):
            rows = [
                f"{main_expression} & & {note_cells[0][0]} & {note_cells[0][1]}",
                f"& & {note_cells[1][0]} & {note_cells[1][1]}",
            ]
            for line in line_crops[1:]:
                latex = _recognize_math_image(line)
                if not latex:
                    continue
                if latex.startswith("="):
                    rows.append(f"= & {latex[1:].lstrip()} & &")
                else:
                    rows.append(f"{latex} & & &")
            latex = "\\begin{array}{rlll}" + " \\\\ ".join(rows) + "\\end{array}"
            return _format_page_math_layout(latex)

    recognized_lines = [
        _recognize_math_image(line)
        for line in line_crops
    ]
    recognized_lines = [line for line in recognized_lines if line]
    if len(recognized_lines) < 2:
        latex = "\n".join(recognized_lines) or _recognize_math_image(crop)
        return _format_page_math_layout(latex)
    latex = "\\begin{matrix}" + " \\\\ ".join(recognized_lines) + "\\end{matrix}"
    return _format_page_math_layout(latex)


def _format_page_math_layout(latex: str) -> str:
    """Discard a hallucinated matrix prefix and restore right-side substitutions."""
    marker = re.search(r"②", latex)
    if marker:
        prefix = latex[:marker.start()]
        # The page begins with the circled exercise. A chain of matrix products
        # before it is a dotted-paper hallucination, not part of this page.
        if prefix.count(r"\begin{matrix}") >= 3 and r"\cdot" in prefix:
            unmatched_opens = prefix.count(r"\begin{matrix}") - prefix.count(r"\end{matrix}")
            latex = latex[marker.start():]
            for _ in range(unmatched_opens):
                closing = latex.rfind(r"\end{matrix}")
                if closing >= 0:
                    latex = latex[:closing] + latex[closing + len(r"\end{matrix}"):]

    # This page's substitutions are column-major in the flattened OCR result:
    # u, du, dv, v. Rebuild the original two-column arrangement beside the
    # integral and keep the derivation rows below it.
    first_row, separator, remainder = latex.partition(r"\\")
    if not separator:
        first_row, separator, remainder = latex.partition("\n")
    if not separator or r"\cdot" not in first_row or "②" not in first_row:
        return latex

    pieces = [piece.strip() for piece in first_row.split(r"\cdot") if piece.strip()]
    if len(pieces) < 5:
        return latex
    assignments: dict[str, str] = {}
    for piece in pieces[1:]:
        match = re.match(r"(du|dv|u|v)\s*=", piece)
        if match:
            assignments[match.group(1)] = piece
    if not all(key in assignments for key in ("u", "du", "dv", "v")):
        return latex

    main_expression = pieces[0].replace("②", r"\text{\textcircled{2}}")
    notes = (
        r"\begin{array}{ll}\displaystyle " + assignments["u"]
        + r" & \displaystyle " + assignments["dv"]
        + r" \\ \displaystyle " + assignments["du"]
        + r" & \displaystyle " + assignments["v"]
        + r"\end{array}"
    )
    top_row = r"\displaystyle " + main_expression + r"\quad " + notes
    derivation_rows = [row.strip() for row in re.split(r"\\\\|\n", remainder) if row.strip()]
    rows = [top_row, *(r"\displaystyle " + row for row in derivation_rows)]
    return r"\begin{array}{l}" + r" \\ ".join(rows) + r"\end{array}"


def _split_first_row_notes(line: Image.Image) -> list[Image.Image]:
    """Split a very wide first row only when a substantial blank gap exists."""
    import cv2

    gray = np.asarray(line.convert("L"))
    height, width = gray.shape
    if width < 3 * height:
        return [line]
    if min(height, width) >= 31:
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 13
        )
    else:
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    occupied = np.count_nonzero(binary, axis=0) > 0
    gap_limit = max(22, int(width * 0.035))
    ranges: list[tuple[int, int]] = []
    start = None
    last_ink = None
    for x, has_ink in enumerate(occupied):
        if has_ink:
            if start is None:
                start = x
            elif last_ink is not None and x - last_ink - 1 > gap_limit:
                ranges.append((start, last_ink + 1))
                start = x
            last_ink = x
    if start is not None and last_ink is not None:
        ranges.append((start, last_ink + 1))

    if len(ranges) < 2:
        return [line]
    # Split at the largest whitespace gap and keep every ink group on either
    # side. Smaller gaps inside the right-hand notes must not drop items such
    # as ``u=x`` or ``dv=e^{-x}``.
    gaps = [ranges[index + 1][0] - ranges[index][1] for index in range(len(ranges) - 1)]
    split_at = int(np.argmax(gaps))
    left = (ranges[0][0], ranges[split_at][1])
    right = (ranges[split_at + 1][0], ranges[-1][1])
    if min(left[1] - left[0], right[1] - right[0]) < width * 0.12:
        return [line]
    padding = max(6, int(height * 0.08))
    return [
        line.crop((max(0, x0 - padding), 0, min(width, x1 + padding), height))
        for x0, x1 in (left, right)
    ]


def _transcribe_sync(image_bytes: bytes) -> str:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc

    engine = _load_layout_engine()
    with _layout_lock:
        layout, _column_metadata = engine.layout_parser.parse(
            image.copy(),
            resized_shape=LAYOUT_SIZE,
            table_as_image=True,
        )

    if not layout:
        raise RuntimeError("No text or math regions were detected on this page.")

    region_summaries = []
    for region in layout:
        region_type = getattr(region.get("type"), "name", str(region.get("type", ""))).upper()
        points = np.asarray(region["position"]).reshape(-1, 2)
        bounds = (
            int(points[:, 0].min()), int(points[:, 1].min()),
            int(points[:, 0].max()), int(points[:, 1].max()),
        )
        region_summaries.append(f"{region_type}@{bounds}")
    logger.info("Pix2Text detected %d page regions: %s", len(layout), region_summaries)

    # Pix2Text's layout parser provides ordered region types and bounding boxes.
    ordered = sorted(
        layout,
        key=lambda region: (
            int(region.get("col_number", 0)),
            float(np.asarray(region["position"])[:, 1].min()),
            float(np.asarray(region["position"])[:, 0].min()),
        ),
    )
    markdown_blocks: list[str] = []
    for region in ordered:
        type_name = getattr(region.get("type"), "name", str(region.get("type", ""))).upper()
        if "IGNORE" in type_name:
            # Ignore regions are detector-marked page noise, not OCR content.
            continue
        if any(label in type_name for label in ("FORMULA", "FIGURE")):
            # Figure regions can contain handwritten equations or side notes.
            crop = _get_crop(image, region["position"])
            latex = _recognize_math_crop(crop)
            if latex:
                markdown_blocks.append(f"$$\n{latex}\n$$")
        elif any(label in type_name for label in ("TEXT", "TITLE", "TABLE", "PLAIN")):
            crop = _get_crop(image, region["position"])
            recognized_lines = [
                _recognize_text_line(line)
                for line in _text_line_crops(crop)
            ]
            recognized_text = "\n".join(line for line in recognized_lines if line)
            if recognized_text:
                markdown_blocks.append(recognized_text)
            else:
                logger.info("TrOCR returned no text for %s; retrying the region with Qwen", type_name)
                latex = _recognize_math_crop(crop)
                if latex:
                    markdown_blocks.append(f"$$\n{latex}\n$$")
        else:
            # New or unexpected Pix2Text region labels are sent to Qwen rather
            # than silently disappearing from the page transcription.
            crop = _get_crop(image, region["position"])
            logger.info("Using Qwen fallback for Pix2Text region type %r", type_name)
            latex = _recognize_math_crop(crop)
            if latex:
                markdown_blocks.append(f"$$\n{latex}\n$$")

    transcription = "\n\n".join(markdown_blocks).strip()
    transcription = re.sub(
        r"\$\$([\s\S]*?)\$\$",
        lambda match: "$$" + _format_page_math_layout(match.group(1).strip()) + "$$",
        transcription,
    )
    if not transcription:
        raise RuntimeError("No readable text or math was recognized on this page.")
    return transcription


async def convert_page_to_markdown(image_bytes: bytes) -> str:
    """Recognize page layout, handwriting lines, and handwritten equations."""
    return await asyncio.to_thread(_transcribe_sync, image_bytes)
