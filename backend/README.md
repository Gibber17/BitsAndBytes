main.py: starts FastAPI and configures CORS.

routers/notes.py: accepts image uploads.

routers/food.py: accepts food searches.

services/ai_service.py: communicates with the AI model.

services/places_service.py: communicates with your restaurant data provider.

.env: holds API keys locally; never commit it to GitHub.

## Full-page handwriting to LaTeX

The `/api/notes/convert` endpoint uses Pix2Text for page layout, TrOCR for
handwritten text lines, and the local Qwen LoRA adapter for formula crops.
Install the OCR dependencies in the same Python environment used to run the
backend:

```powershell
python -m pip install pix2text
python -m pip install --force-reinstall "rapidocr==3.9.2"
python -m pip install transformers
```

Keep RapidOCR pinned to 3.9.2 for now. RapidOCR 3.10.0 is incompatible with
the installed CnSTD integration used by Pix2Text (`resolve_model_key` is
missing), even though pip reports the packages as installed.

Pix2Text layout weights and the TrOCR handwritten-line model download on first
use. TrOCR runs on CPU to leave GPU memory available for Qwen. Math crops are
transcribed by the adapter configured with `QWEN_ADAPTER_PATH`; use
`QWEN_MAX_IMAGE_TOKENS=512` if the adapter was trained with that image size.
The single-expression Qwen endpoint remains available at
`/api/notes/convert-expression`.
