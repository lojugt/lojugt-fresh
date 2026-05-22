import {
  define,
  formatDate,
  Note,
  openKv,
  processExternalLinks,
  processMarkdownFeatures,
  stripFrontmatter,
} from "../utils.ts";
import { CSS, render } from "@deno/gfm";

// Syntax highlighting components for Deno GFM
import "npm:prismjs@1.29.0/components/prism-typescript.js";
import "npm:prismjs@1.29.0/components/prism-javascript.js";
import "npm:prismjs@1.29.0/components/prism-jsx.js";
import "npm:prismjs@1.29.0/components/prism-tsx.js";
import "npm:prismjs@1.29.0/components/prism-bash.js";
import "npm:prismjs@1.29.0/components/prism-json.js";
import "npm:prismjs@1.29.0/components/prism-yaml.js";
import "npm:prismjs@1.29.0/components/prism-markdown.js";

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const kv = await openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];
      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }

      // Try exact lookup first
      let note: Note | null = null;
      const exactResult = await kv.get(["notes", "index"]);
      if (exactResult.value) {
        note = exactResult.value as Note;
      } else {
        // Fallback to case-insensitive lookup
        const found = notes.find((n) => n.path.toLowerCase() === "index");
        if (found) {
          note = found;
        }
      }

      return {
        data: {
          note,
          notes,
        },
      };
    } catch (e) {
      console.error("Error fetching homepage index note:", e);
      return {
        data: {
          note: null,
          notes: [],
        },
      };
    }
  },
});

export default define.page<typeof handler>(function Home({ data }) {
  const { note, notes } = data;

  let htmlContent = "";
  if (note) {
    const cleanMarkdown = processMarkdownFeatures(
      stripFrontmatter(note.content),
      notes || [],
    );
    const rawHtml = render(cleanMarkdown);
    htmlContent = processExternalLinks(rawHtml);
  }

  if (note) {
    // Render the index note as the homepage
    return (
      <div class="min-h-screen bg-black text-[#f3f4f6] pb-24 font-mono">
        {/* Scope Deno GFM Styles */}
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            background-color: #000000 !important;
            color: #ffffff !important;
          }
          .markdown-body {
            background-color: transparent !important;
            color: #ffffff !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 14px;
            line-height: 1.8;
            max-width: 500px;
            margin: 0 auto;
          }
          .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
            color: #ffffff !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            margin-top: 2em;
            margin-bottom: 0.8em;
            font-weight: 700;
            text-align: center !important;
            border-bottom: none !important;
          }
          .markdown-body h1 { font-size: 1.8em; }
          .markdown-body h2 { font-size: 1.4em; }
          .markdown-body h3 { font-size: 1.2em; }
          
          .markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre, .markdown-body table {
            text-align: left !important;
          }
          .markdown-body a {
            color: #58a6ff !important;
            text-decoration: underline;
          }
          .markdown-body a:hover {
            color: #79c0ff !important;
          }
          .markdown-body pre {
            background-color: #0d1117 !important;
            border: 1px solid #30363d !important;
            border-radius: 6px !important;
            padding: 16px !important;
          }
          .markdown-body code {
            background-color: rgba(110, 118, 129, 0.2) !important;
            border-radius: 4px !important;
            color: #ff7b72 !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 0.9em;
            padding: 0.2em 0.4em !important;
          }
          .markdown-body pre code {
            color: #c9d1d9 !important;
            background-color: transparent !important;
            padding: 0 !important;
          }
          .markdown-body blockquote {
            border-left: 0.25em solid #30363d !important;
            color: #8b949e !important;
            background-color: transparent !important;
            padding: 0 1em !important;
          }
          .markdown-body table tr {
            background-color: #0d1117 !important;
            border-top: 1px solid #30363d !important;
          }
          .markdown-body table tr:nth-child(2n) {
            background-color: #161b22 !important;
          }
          .markdown-body table th, .markdown-body table td {
            border: 1px solid #30363d !important;
            padding: 6px 13px !important;
          }
          .markdown-body img {
            border-radius: 6px;
            border: 1px solid #30363d;
            margin: 2rem auto;
            display: block;
          }
          mark.highlight, .highlight {
            background-color: #e0af68 !important;
            color: #1a1b26 !important;
            padding: 0.1em 0.3em !important;
            border-radius: 2px !important;
            font-weight: 500;
          }
        `,
          }}
        />

        <header class="border-b border-[#222] bg-black/90 backdrop-blur-sm sticky top-0 z-50">
          <div class="max-w-[500px] mx-auto px-6 py-5 flex items-center justify-between">
            <span class="text-xs text-white font-bold tracking-wider select-none">
              LOJU
            </span>
            <div class="text-[10px] text-[#555]">
              {note.path}
            </div>
          </div>
        </header>

        <main class="max-w-[500px] mx-auto px-6 mt-12">
          <article>
            {/* Note Metadata Header */}
            <div class="mb-10 pb-8 border-b border-[#222]">
              {note.tags && note.tags.length > 0 && (
                <div class="flex flex-wrap justify-center gap-2 mb-4">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      class="text-[9px] px-2 py-0.5 border border-[#444] bg-[#111] text-[#aaa] uppercase tracking-wider font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 class="text-3xl font-bold text-white text-center mb-4 tracking-tight">
                {note.title}
              </h1>

              <div class="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-[10px] text-[#555]">
                <div class="flex items-center gap-1.5">
                  <span>LAST_MODIFIED: {formatDate(note.mtime)}</span>
                </div>
                {note.ctime && (
                  <div class="flex items-center gap-1.5">
                    <span>CREATED: {formatDate(note.ctime)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rendered Markdown Body */}
            <div
              class="markdown-body"
              data-color-mode="dark"
              data-dark-theme="dark"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </article>
        </main>
      </div>
    );
  }

  // Fallback to LOJU placeholder text if no index note is found
  return (
    <div class="min-h-screen bg-black text-[#ffffff] flex items-center justify-center font-mono">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          background-color: #000000 !important;
          color: #ffffff !important;
          margin: 0;
          padding: 0;
        }
      `,
        }}
      />

      <main class="text-center select-none">
        <h1 class="text-4xl font-bold tracking-[0.25em] pl-[0.25em]">
          LOJU
        </h1>
      </main>
    </div>
  );
});
