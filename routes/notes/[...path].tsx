import { define } from "../../utils.ts";
import { CSS, render } from "@deno/gfm";
import type { Note } from "../index.tsx";

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
  async GET(ctx) {
    const { path } = ctx.params;
    if (!path) {
      return new Response("Path parameter missing", { status: 400 });
    }

    const decodedPath = decodeURIComponent(path);
    try {
      const kv = await Deno.openKv();
      const result = await kv.get(["notes", decodedPath]);

      if (!result.value) {
        return {
          data: {
            note: null,
            error: `Note "${decodedPath}" not found in Deno KV database.`
          }
        };
      }

      return {
        data: {
          note: result.value as Note,
          error: null
        },
      };
    } catch (e) {
      return {
        data: {
          note: null,
          error: e.stack || e.message || String(e)
        }
      };
    }
  },
});

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default define.page<typeof handler>(function NoteView({ data }) {
  const { note, error } = data;
  
  // Render markdown to HTML using Deno GFM
  const htmlContent = note ? render(note.content) : "";

  return (
    <div class="min-h-screen bg-[#08090c] text-[#a9b1d6] selection:bg-[#1a1b26] selection:text-[#7aa2f7] pb-24 font-mono">
      {/* Scope Deno GFM Styles */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          font-family: 'JetBrains Mono', monospace !important;
          background-color: #08090c !important;
        }
        /* Overwrite GFM defaults to match our premium dark theme */
        .markdown-body {
          background-color: transparent !important;
          color: #a9b1d6 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 14px;
          line-height: 1.8;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          color: #ffffff !important;
          font-family: 'JetBrains Mono', monospace !important;
          border-bottom: 1px solid #1b1c24 !important;
          margin-top: 2em;
          margin-bottom: 0.8em;
          font-weight: 700;
        }
        .markdown-body pre {
          background-color: #12131a !important;
          border: 1px solid #1b1c24 !important;
          border-radius: 4px !important;
        }
        .markdown-body code {
          background-color: rgba(86, 95, 137, 0.2) !important;
          border-radius: 4px !important;
          color: #f7768e !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 0.9em;
          padding: 0.2em 0.4em !important;
        }
        .markdown-body pre code {
          color: #a9b1d6 !important;
          background-color: transparent !important;
          padding: 0 !important;
        }
        .markdown-body blockquote {
          border-left: 0.25em solid #1b1c24 !important;
          color: #565f89 !important;
          background-color: transparent !important;
          padding: 0 1em !important;
        }
        .markdown-body table tr {
          background-color: #12131a/40 !important;
          border-top: 1px solid #1b1c24 !important;
        }
        .markdown-body table tr:nth-child(2n) {
          background-color: #12131a/20 !important;
        }
        .markdown-body table th, .markdown-body table td {
          border: 1px solid #1b1c24 !important;
          padding: 6px 13px !important;
        }
        .markdown-body img {
          border-radius: 4px;
          border: 1px solid #1b1c24;
          margin: 2rem 0;
        }
      ` }} />

      <header class="border-b border-[#1b1c24] bg-[#0b0c10]/90 backdrop-blur-sm sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-8 py-5 flex items-center justify-between">
          <a
            href="/"
            class="flex items-center gap-2 text-xs text-[#565f89] hover:text-[#7aa2f7] transition-colors duration-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            [BACK_TO_NOTES]
          </a>
          <div class="text-[10px] text-[#565f89]">
            {note ? note.path : "ERROR"}
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-8 mt-12">
        {error ? (
          <div class="border border-red-500/20 bg-red-950/10 text-red-400 p-6 font-mono text-xs">
            <h2 class="text-sm font-bold text-red-400 mb-2">[ERROR_LOADING_NOTE]</h2>
            <p>{error}</p>
          </div>
        ) : note ? (
          <article>
            {/* Note Metadata Header */}
            <div class="mb-10 pb-8 border-b border-[#1b1c24]">
              <h1 class="text-2xl font-bold text-white mb-4 tracking-tight">
                {note.title}
              </h1>
              
              <div class="flex flex-wrap items-center gap-y-2 gap-x-6 text-[10px] text-[#565f89]">
                <div class="flex items-center gap-1.5">
                  <span>LAST_MODIFIED: {formatDate(note.mtime)}</span>
                </div>
                {note.ctime && (
                  <div class="flex items-center gap-1.5">
                    <span>CREATED: {formatDate(note.ctime)}</span>
                  </div>
                )}
              </div>

              {note.tags && note.tags.length > 0 && (
                <div class="flex flex-wrap gap-3 mt-4 text-[10px] text-[#7aa2f7]">
                  {note.tags.map((tag) => (
                    <span>#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Rendered Markdown Body */}
            <div
              class="markdown-body"
              data-color-mode="dark"
              data-dark-theme="dark"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </article>
        ) : (
          <p class="text-xs text-[#565f89]">[NO_NOTE_DATA_AVAILABLE]</p>
        )}
      </main>
    </div>
  );
});
