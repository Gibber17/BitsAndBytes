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

export default function LatexPreview({ latex }: { latex: string }) {
  return (
    // TODO(style): preview box
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#cc0000" }]]}
      >
        {normalizeDelimiters(latex)}
      </ReactMarkdown>
    </div>
  );
}