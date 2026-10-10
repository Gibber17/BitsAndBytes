import { useEffect, useState } from 'react'
import 'katex/dist/katex.min.css'
import { convertNotes } from './lib/api'
import LatexPreview from './components/LatexPreview'
import './App.css'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (!file) {
      setImageUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleConvert() {
    if (!file) return
    setLoading(true)
    setError('')
    setNotes('')
    setCopied(false)
    try {
      setNotes(await convertNotes(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(notes)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function handleSavePdf() {
    window.print()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ink to LaTeX home">
          <span className="brand-mark">∑</span>
          <span>Ink to LaTeX</span>
        </a>
        <span className="top-note">Local full-page notes recognition</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">FROM PAPER TO PUBLISHABLE MATH</p>
        <h1>Your handwritten math,<br /><span>ready for LaTeX.</span></h1>
        <p className="intro-copy">
          Upload a full page. Pix2Text detects handwritten text and math, then returns editable notes with LaTeX equations.
        </p>
      </section>

      <section className="workspace" aria-label="Math conversion workspace">
        <div className="panel input-panel">
          <div className="panel-heading">
            <div>
              <p className="step-label">STEP 1</p>
              <h2>Choose an image</h2>
            </div>
            {file && <span className="file-kind">{file.name}</span>}
          </div>

          <label className={`upload-area ${imageUrl ? 'has-image' : ''}`}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                setFile(event.currentTarget.files?.[0] ?? null)
                setError('')
              }}
            />
            {imageUrl ? (
              <img className="source-image" src={imageUrl} alt="Selected handwritten math" />
            ) : (
              <span className="upload-prompt">
                <span className="upload-icon" aria-hidden="true">↑</span>
                <strong>Choose a photo or scan</strong>
                <span>PNG, JPG, or WebP · up to 10 MB</span>
              </span>
            )}
          </label>
          <p className="hint">Use a clear, upright photo with the full page in focus. The first run may take longer while OCR models load.</p>

          <button className="convert-button" type="button" onClick={handleConvert} disabled={!file || loading}>
            {loading ? <><span className="spinner" /> Reading the page…</> : <>Convert full page <span aria-hidden="true">→</span></>}
          </button>
          {error && <p className="error-message" role="alert">{error}</p>}
        </div>

        <div className="panel result-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <p className="step-label">STEP 2</p>
              <h2>Review the result</h2>
            </div>
            {notes && (
              <div className="result-actions">
                <button className="copy-button" onClick={handleCopy} type="button">{copied ? 'Copied' : 'Copy notes'}</button>
                <button className="copy-button" onClick={handleSavePdf} type="button">Save PDF</button>
              </div>
            )}
          </div>

          <div className={`math-preview ${notes ? '' : 'empty-preview'}`}>
            {notes ? (
              <>
                <div className="print-title">
                  <h1>{file?.name.replace(/\.[^.]+$/, '') || 'Math Notes'}</h1>
                  <p>Recognized handwritten notes</p>
                </div>
                <div className="katex-output"><LatexPreview latex={notes} /></div>
              </>
            ) : (
              <span>Your recognized notes will appear here.</span>
            )}
          </div>

          {notes && (
            <label className="latex-field">
              <span>Notes with LaTeX · editable</span>
              <textarea value={notes} onChange={(event) => setNotes(event.currentTarget.value)} spellCheck={false} />
            </label>
          )}
        </div>
      </section>

      <footer className="footer-note">Edit the recognized notes, preview the math, and copy the combined result.</footer>
    </main>
  )
}

export default App
