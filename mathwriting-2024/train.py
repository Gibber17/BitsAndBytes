"""Fine-tune Qwen2.5-VL on MathWriting InkML expressions."""

import argparse
import inspect
import random
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoProcessor,
    Qwen2_5_VLForConditionalGeneration,
    Trainer,
    TrainingArguments,
)


MODEL_ID = "Qwen/Qwen2.5-VL-3B-Instruct"
PROMPT = "Transcribe the handwritten mathematical expression as LaTeX. Return only the LaTeX, with no explanation or delimiters."
INKML_NS = {"i": "http://www.w3.org/2003/InkML"}
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = SCRIPT_DIR / "mathwriting-2024"


def inkml_files(data_dir: Path, split: str, limit: int = 0) -> list[Path]:
    """Find a split folder whether data_dir is the archive or its parent."""
    candidates = [data_dir / split, data_dir / "mathwriting-2024" / split]
    folder = next((p for p in candidates if p.is_dir()), None)
    if folder is None:
        raise FileNotFoundError(
            f"Could not find '{split}' under {data_dir}. Looked in: "
            + ", ".join(str(p) for p in candidates)
        )
    paths = sorted(folder.rglob("*.inkml"))
    if limit > 0 and len(paths) > limit:
        paths = random.Random(42).sample(paths, limit)
        paths.sort()
    return paths


def parse_inkml(path: Path) -> tuple[list[list[tuple[float, float]]], str]:
    root = ET.parse(path).getroot()
    strokes: list[list[tuple[float, float]]] = []
    for trace in root.findall("i:trace", INKML_NS):
        if not trace.text or not trace.text.strip():
            continue
        points = []
        for point in trace.text.strip().split(","):
            values = point.split()
            if len(values) >= 2:
                x, y = float(values[0]), float(values[1])
                if np.isfinite(x) and np.isfinite(y):
                    points.append((x, y))
        if points:
            strokes.append(points)

    label = None
    for annotation in root.findall("i:annotation", INKML_NS):
        if annotation.get("type") == "normalizedLabel" and annotation.text:
            label = annotation.text.strip()
            break
    if not label:
        raise ValueError(f"No normalizedLabel annotation in {path}")
    if not strokes:
        raise ValueError(f"No usable strokes in {path}")
    return strokes, label


def render(strokes, height: int = 224, padding: int = 16, line_width: int = 3,
           max_width: int = 1344) -> Image.Image:
    xs = [x for stroke in strokes for x, _ in stroke]
    ys = [y for stroke in strokes for _, y in stroke]
    x0, y0 = min(xs), min(ys)
    width = max(max(xs) - x0, 1e-6)
    height_extent = max(max(ys) - y0, 1e-6)
    scale = min((height - 2 * padding) / height_extent,
                (max_width - 2 * padding) / width)
    image_width = max(56, int(width * scale) + 2 * padding)
    image_height = max(56, int(height_extent * scale) + 2 * padding)
    image = Image.new("RGB", (image_width, image_height), "white")
    draw = ImageDraw.Draw(image)
    for stroke in strokes:
        points = [((x - x0) * scale + padding, (y - y0) * scale + padding)
                  for x, y in stroke]
        if len(points) == 1:
            x, y = points[0]
            draw.ellipse((x - line_width, y - line_width, x + line_width, y + line_width),
                         fill="black")
        else:
            draw.line(points, fill="black", width=line_width, joint="curve")
    return image


def make_dataset(files: list[Path], augment: bool):
    class InkDataset(torch.utils.data.Dataset):
        def __len__(self):
            return len(files)

        def __getitem__(self, index):
            # A corrupt item should not terminate a long run; inspect nearby items,
            # but fail clearly if the indexed split is unusable.
            for offset in range(min(20, len(files))):
                path = files[(index + offset) % len(files)]
                try:
                    strokes, label = parse_inkml(path)
                    image = render(strokes, line_width=random.randint(2, 5) if augment else 3)
                    if augment and random.random() < 0.5:
                        image = image.rotate(random.uniform(-2.0, 2.0), fillcolor="white")
                    return {"image": image, "text": label}
                except (ET.ParseError, OSError, ValueError, IndexError):
                    continue
            raise RuntimeError(f"Could not read a valid InkML item near index {index}")

    return InkDataset()


def mask_prompt_tokens(input_ids: torch.Tensor, attention_mask: torch.Tensor,
                       assistant_prefix: list[int]) -> torch.Tensor:
    labels = input_ids.clone()
    prefix_len = len(assistant_prefix)
    for row in range(labels.shape[0]):
        ids = input_ids[row].tolist()
        start = next(
            (i for i in range(len(ids) - prefix_len, -1, -1)
             if ids[i:i + prefix_len] == assistant_prefix),
            None,
        )
        if start is None:
            raise RuntimeError("Assistant response marker was not found in the tokenized example")
        labels[row, :start + prefix_len] = -100
    labels[attention_mask == 0] = -100
    return labels


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data_dir", type=Path, default=DEFAULT_DATA_DIR,
                        help="MathWriting archive folder (the one containing train/valid)")
    parser.add_argument("--train_splits", default="train",
                        help="Comma-separated training splits, e.g. train or train,synthetic")
    parser.add_argument("--max_train_files", type=int, default=0,
                        help="Optional cap per training split; 0 uses every file")
    parser.add_argument("--max_eval_samples", type=int, default=2048)
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--batch_size", type=int, default=1)
    parser.add_argument("--grad_accum", type=int, default=16)
    parser.add_argument("--learning_rate", type=float, default=1e-4)
    parser.add_argument("--max_image_tokens", type=int, default=1024,
                        help="Qwen image-token budget; lower this if GPU memory is tight")
    parser.add_argument("--output_dir", default="qwen25vl-3b-mathwriting")
    parser.add_argument("--load_in_4bit", action="store_true",
                        help="Use bitsandbytes NF4 QLoRA to reduce GPU memory use")
    parser.add_argument("--save_steps", type=int, default=500)
    parser.add_argument("--eval_steps", type=int, default=500)
    parser.add_argument("--resume", action="store_true",
                        help="Resume from the latest checkpoint in output_dir")
    parser.add_argument("--smoke", action="store_true",
                        help="Run 3 optimizer steps on up to 16 training items")
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError(
            "CUDA was not detected. Qwen2.5-VL-3B fine-tuning needs a CUDA GPU; "
            "use a GPU machine or a hosted GPU notebook."
        )
    use_bf16 = torch.cuda.is_bf16_supported()
    dtype = torch.bfloat16 if use_bf16 else torch.float16

    split_names = [name.strip() for name in args.train_splits.split(",") if name.strip()]
    train_files = []
    for split in split_names:
        files = inkml_files(args.data_dir, split, args.max_train_files)
        if not files:
            raise RuntimeError(f"No .inkml files found for split '{split}'")
        print(f"{split}: {len(files):,} examples")
        train_files.extend(files)
    valid_files = inkml_files(args.data_dir, "valid", args.max_eval_samples)
    if not valid_files:
        raise RuntimeError("No .inkml files found in MathWriting valid/")
    if args.smoke:
        train_files = train_files[:16]
        valid_files = valid_files[:min(8, len(valid_files))]
    print(f"Training examples: {len(train_files):,}; validation examples: {len(valid_files):,}")

    model_kwargs = {"torch_dtype": dtype, "attn_implementation": "sdpa"}
    if args.load_in_4bit:
        try:
            from transformers import BitsAndBytesConfig
            from peft import prepare_model_for_kbit_training
        except ImportError as exc:
            raise RuntimeError(
                "4-bit training needs current transformers, peft, and bitsandbytes. "
                "Install bitsandbytes with: python -m pip install bitsandbytes"
            ) from exc
        model_kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=dtype,
        )
        model_kwargs["device_map"] = {"": torch.cuda.current_device()}
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(MODEL_ID, **model_kwargs)
    if args.load_in_4bit:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    processor = AutoProcessor.from_pretrained(
        MODEL_ID,
        min_pixels=256 * 28 * 28,
        max_pixels=args.max_image_tokens * 28 * 28,
    )
    assistant_prefix = processor.tokenizer.encode(
        "<|im_start|>assistant\n", add_special_tokens=False
    )

    def collate(batch):
        messages, images = [], []
        for item in batch:
            images.append(item["image"])
            messages.append([
                {"role": "user", "content": [
                    {"type": "image"}, {"type": "text", "text": PROMPT}
                ]},
                {"role": "assistant", "content": [
                    {"type": "text", "text": item["text"]}
                ]},
            ])
        texts = [processor.apply_chat_template(m, tokenize=False) for m in messages]
        batch_inputs = processor(text=texts, images=images, padding=True, return_tensors="pt")
        batch_inputs["labels"] = mask_prompt_tokens(
            batch_inputs["input_ids"], batch_inputs["attention_mask"], assistant_prefix
        )
        return batch_inputs

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
    )
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.enable_input_require_grads()
    model.config.use_cache = False
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    training_kwargs = dict(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=1,
        # A smoke run should confirm one forward/backward/update quickly;
        # full training uses the user-selected effective batch size.
        gradient_accumulation_steps=1 if args.smoke else args.grad_accum,
        learning_rate=args.learning_rate,
        lr_scheduler_type="cosine",
        num_train_epochs=1 if args.smoke else args.epochs,
        max_steps=3 if args.smoke else -1,
        bf16=use_bf16,
        fp16=not use_bf16,
        logging_steps=1 if args.smoke else 25,
        save_strategy="steps",
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        save_total_limit=3,
        load_best_model_at_end=not args.smoke,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        remove_unused_columns=False,
        dataloader_num_workers=0,
        report_to="none",
        gradient_checkpointing=True,
        optim="adamw_torch",
    )
    argument_names = set(inspect.signature(TrainingArguments).parameters)
    # warmup_ratio is absent in some older Transformers builds; translate it
    # to an equivalent step count when that older API exposes warmup_steps.
    if "warmup_ratio" in argument_names:
        training_kwargs["warmup_ratio"] = 0.0 if args.smoke else 0.03
    elif "warmup_steps" in argument_names:
        examples_per_update = args.batch_size * args.grad_accum
        updates_per_epoch = max(1, (len(train_files) + examples_per_update - 1) // examples_per_update)
        total_updates = 3 if args.smoke else max(1, int(updates_per_epoch * args.epochs))
        training_kwargs["warmup_steps"] = 0 if args.smoke else max(1, int(total_updates * 0.03))
    # Transformers renamed evaluation_strategy to eval_strategy.
    if "eval_strategy" in argument_names:
        training_kwargs["eval_strategy"] = "no" if args.smoke else "steps"
    elif "evaluation_strategy" in argument_names:
        training_kwargs["evaluation_strategy"] = "no" if args.smoke else "steps"
    unsupported = set(training_kwargs) - argument_names
    if unsupported:
        print("NOTE: unsupported TrainingArguments skipped for this transformers version:",
              ", ".join(sorted(unsupported)))
    supported_kwargs = {k: v for k, v in training_kwargs.items() if k in argument_names}
    training_args = TrainingArguments(**supported_kwargs)
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=make_dataset(train_files, augment=True),
        eval_dataset=None if args.smoke else make_dataset(valid_files, augment=False),
        data_collator=collate,
    )
    trainer.train(resume_from_checkpoint=True if args.resume else None)
    trainer.save_model(args.output_dir)
    processor.save_pretrained(args.output_dir)


if __name__ == "__main__":
    main()
