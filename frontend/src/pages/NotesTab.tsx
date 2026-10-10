import { useState } from "react";
import { convertNotes } from "../lib/api";
import LatexPreview from "../components/LatexPreview";

export default function NotesTab() {
  const [file, setFile] = useState<File | null>(null);
  const [latex, setLatex] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      setLatex(await convertNotes(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    // TODO(style): layout/container
    <div>
      {/* TODO(style): upload controls */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {/* TODO(style): primary button + disabled state */}
      <button onClick={handleConvert} disabled={!file || loading}>
        {loading ? "Converting..." : "Convert to LaTeX"}
      </button>

      {/* TODO(style): image preview size */}
      {file && (
        <img src={URL.createObjectURL(file)} alt="Uploaded notes" width={300} />
      )}

      {/* TODO(style): error message */}
      {error && <p>{error}</p>}

      <h2>LaTeX source</h2>
      {/* TODO(style): editor box */}
      <textarea
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        rows={15}
        cols={60}
      />
      <button onClick={() => navigator.clipboard.writeText(latex)}>
        Copy LaTeX
      </button>

      <h2>Preview</h2>
      <LatexPreview latex={latex} />
    </div>
  );
}