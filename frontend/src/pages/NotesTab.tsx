import { useEffect, useMemo, useState, type DragEvent } from "react";
import { convertNotes } from "../lib/api";
import LatexPreview from "../components/LatexPreview";

type Status = "converted" | "processing" | "handwritten";

interface SavedNote {
  id: string;
  title: string;
  course: string;
  date: string; // "YYYY-MM-DD"
  status: Status;
}

// TODO(data): replace these samples with the user's notes from the backend
const SAVED_NOTES: SavedNote[] = [
  { id: "1", title: "Sample: Calculus review", course: "MAC 2311", date: "2026-10-08", status: "converted" },
  { id: "2", title: "Sample: Physics lecture 4", course: "PHY 2048", date: "2026-10-05", status: "converted" },
  { id: "3", title: "Sample: Chem lab notes", course: "CHM 2045", date: "2026-10-04", status: "processing" },
  { id: "4", title: "Sample: Ethics reading", course: "PHI 2010", date: "2026-10-02", status: "handwritten" },
  { id: "5", title: "Sample: Linear algebra", course: "MAS 3105", date: "2026-09-30", status: "converted" },
  { id: "6", title: "Sample: Stats homework", course: "STA 2023", date: "2026-09-28", status: "processing" },
];

const FILTERS: { label: string; value: "all" | Status }[] = [
  { label: "All", value: "all" },
  { label: "Converted", value: "converted" },
  { label: "Processing", value: "processing" },
  { label: "Handwritten", value: "handwritten" },
];

const BADGE: Record<Status, string> = {
  converted: "bg-[#3E1230] text-[#FDF8F2]",
  processing: "bg-[#F2C9EF] text-[#3E1230]",
  handwritten: "border border-[#B57AA8] text-[#3E1230]",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesTab() {
  // "library" = grid of notes (default), "convert" = upload + LaTeX editor
  const [view, setView] = useState<"library" | "convert">("library");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [query, setQuery] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create the preview URL once per file and free it when the file changes
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shown = SAVED_NOTES.filter(
    (n) =>
      (filter === "all" || n.status === filter) &&
      `${n.title} ${n.course}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, HEIC…).");
      return;
    }
    setError("");
    setLatex("");
    setFile(f);
    setView("convert");
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setLatex(await convertNotes(file));
      // TODO(data): save the converted note to the backend so it shows in the library
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  }

  const fileInput = (
    <input
      id="notes-file"
      type="file"
      accept="image/*"
      onChange={(e) => {
        pickFile(e.target.files?.[0] ?? null);
        e.target.value = ""; // lets you pick the same file again
      }}
      className="sr-only"
    />
  );

  /* ---------------- Library view ---------------- */
  if (view === "library") {
    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 text-[#3E1230] sm:px-12 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-['League_Spartan'] text-5xl font-bold leading-none sm:text-[64px]">Notes</h2>
            <p className="text-[17px] text-[#6B3A5C]">
              Upload handwritten notes and get back a clean, searchable file.
            </p>
          </div>
          <button
            onClick={() => {
              setFile(null);
              setLatex("");
              setError("");
              setView("convert");
            }}
            className="inline-flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-full bg-[#3E1230] px-6 font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E]"
          >
            <PlusIcon />
            New note
          </button>
        </header>

        {/* Dropzone */}
        <section
          aria-label="Upload handwritten notes"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-wrap items-center gap-5 rounded-[28px] border-2 border-dashed px-7 py-6 transition-colors ${
            dragging ? "border-[#3E1230] bg-[#F2C9EF]" : "border-[#B57AA8] bg-[#FDF8F2]"
          }`}
        >
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[20px] bg-[#F2C9EF]">
            <UploadIcon />
          </span>
          <div className="flex flex-[1_1_260px] flex-col gap-1">
            <h3 className="font-['League_Spartan'] text-2xl font-bold">Drop a photo or scan of your notes</h3>
            <p className="text-sm text-[#6B3A5C]">
              Our AI reads your handwriting and converts it to LaTeX. JPG, PNG or WebP.
            </p>
          </div>
          {fileInput}
          <label
            htmlFor="notes-file"
            className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-[1.5px] border-[#3E1230] px-6 font-bold hover:bg-[#F7DCF9]"
          >
            Choose file
          </label>
        </section>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter notes" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`min-h-11 cursor-pointer rounded-full border-[1.5px] px-[18px] text-sm font-bold transition-colors ${
                  filter === f.value
                    ? "border-[#3E1230] bg-[#3E1230] text-[#FDF8F2]"
                    : "border-[#B57AA8] bg-transparent hover:bg-[#F2C9EF]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 flex-[0_1_280px] items-center gap-2.5 rounded-full bg-[#FDF8F2] px-4 focus-within:outline focus-within:outline-[3px] focus-within:outline-[#8A2A6E]/45">
            <SearchIcon />
            <span className="sr-only">Search notes</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="w-full bg-transparent text-[15px] placeholder:text-[#8F6A85] focus:outline-none"
            />
          </label>
        </div>

        {/* Notes grid */}
        {shown.length === 0 ? (
          <p className="text-[15px] text-[#6B3A5C]">No notes match that filter.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {shown.map((n) => (
              <li key={n.id}>
                {/* TODO: open the note when clicked */}
                <button className="flex w-full cursor-pointer flex-col gap-3 rounded-3xl bg-[#FDF8F2] p-3 text-left transition-transform hover:-translate-y-0.5">
                  <span
                    aria-hidden="true"
                    className="h-[120px] w-full rounded-2xl border-l-[3px] border-[#F2C9EF] bg-white bg-[repeating-linear-gradient(#fff_0px,#fff_17px,#EBC4E4_17px,#EBC4E4_18px)]"
                  />
                  <span className="flex flex-col gap-1.5 px-1 pb-1">
                    <strong className="truncate">{n.title}</strong>
                    <span className="flex items-center justify-between gap-2 text-[13px] text-[#6B3A5C]">
                      <span className="truncate">
                        {n.course} · {formatDate(n.date)}
                      </span>
                      <span className={`flex-none rounded-full px-2.5 py-0.5 font-bold capitalize ${BADGE[n.status]}`}>
                        {n.status}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---------------- Convert view ---------------- */
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 text-[#3E1230] sm:px-12 sm:py-10">
      <header className="flex flex-col gap-3">
        <button
          onClick={() => setView("library")}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm font-bold underline"
        >
          <BackIcon />
          All notes
        </button>
        <h2 className="font-['League_Spartan'] text-4xl font-bold leading-none sm:text-5xl">New note</h2>
      </header>

      <section className="flex flex-wrap gap-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-w-0 flex-[2_1_360px] flex-col items-start gap-4 rounded-[28px] border-2 border-dashed p-6 transition-colors sm:p-7 ${
            dragging ? "border-[#3E1230] bg-[#F2C9EF]" : "border-[#B57AA8] bg-[#FDF8F2]"
          }`}
        >
          <h3 className="font-['League_Spartan'] text-2xl font-bold">
            {file ? "Ready to convert" : "Drop a photo of your notes"}
          </h3>
          {file ? (
            <p className="text-sm font-bold break-all">{file.name}</p>
          ) : (
            <p className="text-sm text-[#6B3A5C]">or choose one from your device · images only</p>
          )}

          {fileInput}
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="notes-file"
              className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-[1.5px] border-[#3E1230] px-6 font-bold hover:bg-[#F7DCF9]"
            >
              {file ? "Choose another" : "Choose file"}
            </label>
            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full bg-[#3E1230] px-6 font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E] disabled:cursor-not-allowed disabled:bg-[#B57AA8] disabled:text-[#3E1230]"
            >
              {loading && <Spinner />}
              {loading ? "Converting..." : "Convert to LaTeX"}
            </button>
          </div>

          {error && (
            <p role="alert" className="w-full rounded-2xl bg-[#F7DCF9] px-4 py-3 text-sm font-bold">
              {error}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 rounded-[28px] bg-[#E9B8EF] p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em]">Your upload</p>
          {file ? (
            <img
              src={previewUrl}
              alt="Uploaded notes"
              className="max-h-[260px] w-full rounded-[20px] bg-[#FDF8F2] object-contain"
            />
          ) : (
            <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-[20px] bg-[#FDF8F2] p-6 text-center text-sm text-[#6B3A5C]">
              Your photo will show up here
            </div>
          )}
        </div>
      </section>

      {/* Results only appear once there's something to show */}
      {latex && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex min-w-0 flex-col gap-3 rounded-[28px] bg-[#FDF8F2] p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-['League_Spartan'] text-[26px] font-bold">LaTeX source</h3>
              <button
                onClick={handleCopy}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#F7DCF9] px-4 text-sm font-bold hover:bg-[#F2C9EF]"
              >
                <CopyIcon />
                {copied ? "Copied!" : "Copy LaTeX"}
              </button>
            </div>
            <label htmlFor="latex-src" className="sr-only">LaTeX source</label>
            <textarea
              id="latex-src"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={10}
              spellCheck={false}
              className="min-h-[220px] w-full resize-y rounded-[20px] border-[1.5px] border-[#EBC4E4] bg-white p-4 font-mono text-sm leading-relaxed focus:border-[#3E1230] focus:outline-none"
            />
          </section>

          <section className="flex min-w-0 flex-col gap-3 rounded-[28px] bg-[#FDF8F2] p-6">
            <h3 className="flex min-h-11 items-center font-['League_Spartan'] text-[26px] font-bold">Preview</h3>
            <div className="min-h-[220px] overflow-auto rounded-[20px] border-[1.5px] border-[#EBC4E4] bg-white p-5">
              <LatexPreview latex={latex} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ---------- Icons ---------- */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function UploadIcon() {
  return (
    <svg {...stroke} width={30} height={30}>
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M12 15V3M7 8l5-5 5 5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...stroke} width={18} height={18} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...stroke} width={18} height={18}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg {...stroke} width={16} height={16} strokeWidth={2.2}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...stroke} width={16} height={16}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}