import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { convertNotes } from './lib/api'
import './App.css'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [latex, setLatex] = useState('')
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

  const renderedLatex = useMemo(() => {
    if (!latex.trim()) return ''
    return katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })
  }, [latex])

  async function handleConvert() {
    if (!file) return
    setLoading(true)
    setError('')
    setLatex('')
    setCopied(false)
    try {
      setLatex(await convertNotes(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(latex)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ink to LaTeX home">
          <span className="brand-mark">∑</span>
          <span>Ink to LaTeX</span>
        </a>
        <span className="top-note">Handwritten math recognizer</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">FROM PAPER TO PUBLISHABLE MATH</p>
        <h1>Your handwritten math,<br /><span>ready for LaTeX.</span></h1>
        <p className="intro-copy">
          Upload a clear photo of one expression. The model transcribes it, and KaTeX renders a live preview.
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
          <p className="hint">For best results, crop closely around one expression and keep the writing in focus.</p>

          <button className="convert-button" type="button" onClick={handleConvert} disabled={!file || loading}>
            {loading ? <><span className="spinner" /> Reading handwriting…</> : <>Convert to LaTeX <span aria-hidden="true">→</span></>}
          </button>
          {error && <p className="error-message" role="alert">{error}</p>}
        </div>

        <div className="panel result-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <p className="step-label">STEP 2</p>
              <h2>Review the result</h2>
            </div>
            {latex && <button className="copy-button" onClick={handleCopy} type="button">{copied ? 'Copied' : 'Copy LaTeX'}</button>}
          </div>

          <div className={`math-preview ${latex ? '' : 'empty-preview'}`}>
            {renderedLatex ? (
              <div className="katex-output" dangerouslySetInnerHTML={{ __html: renderedLatex }} />
            ) : (
              <span>Your typeset expression will appear here.</span>
            )}
          </div>

          {latex && (
            <label className="latex-field">
              <span>LaTeX source · editable</span>
              <textarea value={latex} onChange={(event) => setLatex(event.currentTarget.value)} spellCheck={false} />
            </label>
          )}
        </div>
      </section>

      <footer className="footer-note">The preview updates as you edit the LaTeX source.</footer>
    </main>
  )
}

export default App
