import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Models often output \( ... \) and \[ ... \]; remark-math wants $ and $$.
function normalizeDelimiters(src: string): string {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
}

function repairCommonOcrLatex(src: string): string {
  let normalized = normalizeDelimiters(src)
    // These equation-numbering commands are not valid inside Pix2Text's matrix output.
    .replace(/\\(?:nonumber|notag)\b/g, '')
    // Repeated vertical bars are usually page-layout/OCR noise in this output.
    .replace(/(?:\\vert\s*){6,}/g, '\\cdots ');

  // OCR can emit a closing matrix with no matching opening tag (or the reverse).
  const matrixBegins = normalized.match(/\\begin\{matrix\}/g)?.length ?? 0;
  const matrixEnds = normalized.match(/\\end\{matrix\}/g)?.length ?? 0;
  if (matrixBegins !== matrixEnds) {
    normalized = normalized
      .replace(/\\begin\{matrix\}/g, '')
      .replace(/\\end\{matrix\}/g, '');
  }

  return normalized;
}

function alignOcrDerivationRows(src: string): string {
  return src.replace(
    /\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}/g,
    (matrix, body: string) => {
      const rows = body.split(/\\\\/).map((row) => row.trim());
      // Only reformat OCR matrices that clearly contain a derivation: each
      // later row starts with '=' and the OCR supplied explicit line breaks.
      if (
        rows.length < 3 ||
        body.includes("&") ||
        rows.slice(1).some((row) => !row.startsWith("="))
      ) {
        return matrix;
      }

      const alignedRows = rows.map((row, index) => {
        const operator = row.replace(/(?<!\\)\blim\b/g, "\\lim");
        if (index === 0) return `\\phantom{=}&${operator}`;
        return `=&${operator.replace(/^=\s*/, "")}`;
      });
      const rowBreak = " " + "\\\\" + "\n";
      return `\\begin{aligned}\n${alignedRows.join(rowBreak)}\n\\end{aligned}`;
    },
  );
}

export default function LatexPreview({ latex }: { latex: string }) {
  return (
    // TODO(style): preview box
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#cc0000" }]]}
      >
        {alignOcrDerivationRows(repairCommonOcrLatex(latex))}
      </ReactMarkdown>
    </div>
  );
}
