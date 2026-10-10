"""Local Qwen2.5-VL inference service for handwritten math images."""

import asyncio
import os
import re
import threading
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError


MODEL_ID = os.getenv("QWEN_MODEL_ID", "Qwen/Qwen2.5-VL-3B-Instruct")
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ADAPTER_DIR = Path(os.getenv(
    "QWEN_ADAPTER_PATH",
    str(PROJECT_ROOT / "qwen25vl-3b-mathwriting"),
))
MAX_IMAGE_TOKENS = int(os.getenv("QWEN_MAX_IMAGE_TOKENS", "256"))
MAX_NEW_TOKENS = int(os.getenv("QWEN_MAX_NEW_TOKENS", "256"))
PROMPT = (
    "Transcribe the handwritten mathematical expression as LaTeX. "
    "Return only the LaTeX, with no explanation or delimiters."
)
_generation_lock = threading.Lock()


@lru_cache(maxsize=1)
def _load_model():
    required_adapter_files = ("adapter_config.json", "adapter_model.safetensors")
    missing_files = [name for name in required_adapter_files
                     if not (ADAPTER_DIR / name).is_file()]
    if missing_files:
        raise FileNotFoundError(
            f"LoRA adapter folder {ADAPTER_DIR} is missing "
            f"{', '.join(missing_files)}. Set QWEN_ADAPTER_PATH to the completed "
            "training output folder (the one containing adapter_config.json and "
            "adapter_model.safetensors)."
        )

    import torch
    from peft import PeftModel
    from transformers import (
        AutoProcessor,
        BitsAndBytesConfig,
        Qwen2_5_VLForConditionalGeneration,
    )

    if not torch.cuda.is_available():
        raise RuntimeError("Qwen inference requires a CUDA GPU in this configuration.")

    use_bf16 = torch.cuda.is_bf16_supported()
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
    quant_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    base = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        MODEL_ID,
        torch_dtype=compute_dtype,
        quantization_config=quant_config,
        device_map={"": torch.cuda.current_device()},
        attn_implementation="sdpa",
    )
    model = PeftModel.from_pretrained(base, str(ADAPTER_DIR))
    model.eval()

    processor = AutoProcessor.from_pretrained(
        str(ADAPTER_DIR),
        min_pixels=256 * 28 * 28,
        max_pixels=MAX_IMAGE_TOKENS * 28 * 28,
    )
    return model, processor, torch


def _clean_latex(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:latex|tex)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    text = text.strip()
    for left, right in (("$$", "$$"), (r"\[", r"\]"), (r"\(", r"\)")):
        if text.startswith(left) and text.endswith(right):
            text = text[len(left):-len(right)].strip()
            break
    return text


def _convert_sync(image_bytes: bytes) -> str:
    model, processor, torch = _load_model()
    try:
        image = Image.open(BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc

    messages = [{
        "role": "user",
        "content": [
            {"type": "image"},
            {"type": "text", "text": PROMPT},
        ],
    }]
    prompt = processor.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = processor(
        text=[prompt], images=[image], padding=True, return_tensors="pt"
    )
    inputs = inputs.to(model.device)

    # A single laptop GPU cannot safely run overlapping generations.
    with _generation_lock, torch.inference_mode():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            use_cache=True,
        )
    new_tokens = output_ids[:, inputs["input_ids"].shape[1]:]
    decoded = processor.batch_decode(
        new_tokens, skip_special_tokens=True, clean_up_tokenization_spaces=True
    )[0]
    latex = _clean_latex(decoded)
    if not latex:
        raise RuntimeError("The model returned an empty transcription.")
    return latex


async def convert_image_to_latex(image_bytes: bytes) -> str:
    """Run blocking GPU inference in a worker thread so FastAPI stays responsive."""
    return await asyncio.to_thread(_convert_sync, image_bytes)
