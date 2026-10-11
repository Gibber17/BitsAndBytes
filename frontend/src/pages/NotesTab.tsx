import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { convertNotes, getDashboardData, type DashboardData } from "../lib/api";
import Button from "../components/Button.tsx";
import Card from "../components/Card.tsx";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const UploadIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SearchIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} {...iconProps}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

type NoteItem = {
  id: string;
  title: string;
  created_at: string;
  status?: string;
  content?: string;
};

const FILTER_TABS = ["All", "Converted", "Processing", "Handwritten"];

export default function NotesTab() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Fetch real user notes on mount
  useEffect(() => {
    getDashboardData()
      .then((data: DashboardData) => {
        setNotes(data.recent_notes ?? []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load notes.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const latexResult = await convertNotes(file);
      // Create a new local note item for the dashboard view
      const newNote: NoteItem = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        created_at: new Date().toISOString(),
        status: "Converted",
        content: latexResult,
      };
      setNotes((prev) => [newNote, ...prev]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Note conversion failed.");
    } finally {
      setUploading(false);
      // Reset input value so the same file can be uploaded again if needed
      e.target.value = "";
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "Converted") return note.status === "Converted" || !note.status;
    if (filter === "Processing") return note.status === "Processing";
    return true;
  });

  return (
    <div className="min-h-full bg-[#f6d9f7] px-4 pb-10 pt-5 text-sm text-[#43102f] sm:px-[31px]">
      <h2 className="mb-2 text-[40px] font-bold leading-[1.1] tracking-tight">Notes</h2>
      <p className="mb-6 max-w-[450px] text-[12.5px] text-[#7a4c6c]">
        Upload handwritten notes and get back a clean, searchable file.
      </p>

      {/* Upload Box */}
      <div className="mb-6 flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#c86fb8] bg-[#fdf6ee] p-8 text-center shadow-sm">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0c8ec]/60 text-[#43102f]">
          <UploadIcon className="h-6 w-6" />
        </div>
        <p className="font-bold text-[#43102f]">Drop a photo or scan of your notes</p>
        <p className="mt-1 mb-4 text-[12px] text-[#7a4c6c]">
          Our AI reads your handwriting and converts it to LaTeX. JPG, PNG or WebP.
        </p>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <span className="inline-flex h-11 items-center justify-center rounded-full bg-[#43102f] px-6 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90">
            {uploading ? "Converting..." : "Choose file"}
          </span>
        </label>
        {uploadError && (
          <p role="alert" className="mt-3 text-[12px] text-[#9b2b43]">
            {uploadError}
          </p>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`h-9 rounded-full border px-4 text-[12px] font-bold transition-colors ${
                  active
                    ? "border-[#43102f] bg-[#43102f] text-white"
                    : "border-[#c86fb8] bg-[#fdf6ee] text-[#43102f] hover:bg-[#f0c8ec]/50"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 h-4 w-4 text-[#7a4c6c]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes"
            className="h-10 w-full rounded-full border border-[#c86fb8] bg-[#fdf6ee] pl-10 pr-4 text-[12.5px] text-[#43102f] outline-none placeholder:text-[#7a4c6c]/70 focus-visible:ring-2 focus-visible:ring-[#43102f] sm:w-[240px]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-[12.5px] text-[#9b2b43]">
          {error}
        </p>
      )}

      {/* Notes Grid / Empty State */}
      {loading ? (
        <p className="text-[12px] text-[#7a4c6c]">Loading your notes...</p>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-[28px] bg-[#fdf6ee] p-10 text-center shadow-sm">
          <p className="font-bold text-[#43102f]">No converted notes yet</p>
          <p className="mt-1 text-[12.5px] text-[#7a4c6c]">
            Upload a handwritten note above to start generating and storing your converted documents.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((note) => (
            <li key={note.id} className="flex">
              <Card
                eyebrow={
                  <span className="inline-flex w-fit items-center rounded-full bg-[#43102f] px-3 py-1 text-[10.5px] font-bold text-white">
                    {note.status ?? "Converted"}
                  </span>
                }
                title={note.title}
                subtitle={
                  <span className="text-[11.5px] text-[#7a4c6c]">
                    {new Date(note.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                }
                note={
                  note.content ? (
                    <p className="line-clamp-3 font-mono text-[11.5px] text-[#7a4c6c]">
                      {note.content}
                    </p>
                  ) : null
                }
                actions={
                  <Button
                    buttonSize="small"
                    variant="secondary"
                    onClick={() => {
                      if (note.content) {
                        navigator.clipboard.writeText(note.content);
                        alert("LaTeX copied to clipboard!");
                      } else {
                        alert(`Opening note: ${note.title}`);
                      }
                    }}
                  >
                    {note.content ? "Copy LaTeX" : "View note"}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}