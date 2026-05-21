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
    const kv = await Deno.openKv();
    const result = await kv.get(["notes", decodedPath]);

    if (!result.value) {
      return new Response("Note not found in Deno KV database", { status: 404 });
    }

    return {
      data: {
        note: result.value as Note,
      },
    };
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
  const { note } = data;
  
  // Render markdown to HTML using Deno GFM
  const htmlContent = render(note.content);

  return (
    <div class="min-h-screen bg-[#0b0d10] text-[#e3e6eb] selection:bg-[#2563eb] selection:text-white pb-24">
      {/* Scope Deno GFM Styles */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        /* Overwrite GFM defaults to match our premium dark theme */
        .markdown-body {
          background-color: transparent !important;
          color: #c9d1d9 !important;
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
          font-size: 16px;
          line-height: 1.8;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          color: #f0f6fc !important;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
          border-bottom: 1px solid #21262d !important;
          margin-top: 1.8em;
          margin-bottom: 0.6em;
          font-weight: 700;
        }
        .markdown-body pre {
          background-color: #161b22 !important;
          border: 1px solid #30363d !important;
          border-radius: 12px !important;
        }
        .markdown-body code {
          background-color: rgba(110, 118, 129, 0.2) !important;
          border-radius: 6px !important;
          color: #ff7b72 !important;
        }
        .markdown-body pre code {
          color: #c9d1d9 !important;
          background-color: transparent !important;
        }
        .markdown-body blockquote {
          border-left: 0.25em solid #30363d !important;
          color: #8b949e !important;
          background-color: #161b22/30 !important;
          padding: 0 1em !important;
        }
        .markdown-body table tr {
          background-color: #0d1117 !important;
          border-top: 1px solid #21262d !important;
        }
        .markdown-body table tr:nth-child(2n) {
          background-color: #161b22/40 !important;
        }
        .markdown-body table th, .markdown-body table td {
          border: 1px solid #30363d !important;
        }
        .markdown-body img {
          border-radius: 12px;
          border: 1px solid #30363d;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          margin: 1.5rem 0;
        }
      ` }} />

      <header class="border-b border-[#1f242e] bg-[#0d1117]/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            class="flex items-center gap-2 text-sm text-[#8b949e] hover:text-white transition-colors duration-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to notes
          </a>
          <div class="text-xs font-mono text-gray-500">
            {note.path}
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-6 mt-12">
        <article>
          {/* Note Metadata Header */}
          <div class="mb-10 pb-8 border-b border-[#21262d]">
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              {note.title}
            </h1>
            
            <div class="flex flex-wrap items-center gap-y-4 gap-x-6 text-sm text-[#8b949e] font-mono">
              <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Updated: {formatDate(note.mtime)}</span>
              </div>
              {note.ctime && (
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Created: {formatDate(note.ctime)}</span>
                </div>
              )}
            </div>

            {note.tags && note.tags.length > 0 && (
              <div class="flex flex-wrap gap-2 mt-6">
                {note.tags.map((tag) => (
                  <span class="text-xs px-3 py-1 rounded-full bg-[#161b22] border border-[#21262d] text-[#58a6ff]">
                    #{tag}
                  </span>
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
      </main>
    </div>
  );
});
