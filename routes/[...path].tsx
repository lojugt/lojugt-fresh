import {
  define,
  formatDate,
  Note,
  openKv,
  processExternalLinks,
  processMarkdownFeatures,
  stripFrontmatter,
} from "../utils.ts";
import { render } from "@deno/gfm";

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
      return new Response(null, {
        status: 307,
        headers: { Location: "/" },
      });
    }

    const decodedPath = decodeURIComponent(path);
    const noTrailingSlash = decodedPath.endsWith("/")
      ? decodedPath.slice(0, -1)
      : decodedPath;
    const cleanPath = noTrailingSlash.endsWith(".md")
      ? noTrailingSlash.slice(0, -3)
      : noTrailingSlash;

    try {
      const kv = await openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];
      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }

      // Find note case-sensitively first
      let note = notes.find((n) => n.path === cleanPath);

      // Fallback to case-insensitive match
      if (!note) {
        const lowerCleanPath = cleanPath.toLowerCase();
        note = notes.find((n) => n.path.toLowerCase() === lowerCleanPath);
      }

      if (!note) {
        // Redirect to homepage on failure to find the entry
        return new Response(null, {
          status: 307,
          headers: { Location: "/" },
        });
      }

      return {
        data: {
          note,
          notes,
        },
      };
    } catch (e) {
      console.error("Error loading note, redirecting to home:", e);
      return new Response(null, {
        status: 307,
        headers: { Location: "/" },
      });
    }
  },
});

export default define.page<typeof handler>(function NoteView({ data }) {
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

  return (
    <div class="loju-page">
      <header class="loju-page-header">
        <div class="loju-page-header-inner">
          <a href="/" class="loju-back-link">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="loju-back-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            [HOME]
          </a>
          <div class="loju-page-path">{note ? note.path : "ERROR"}</div>
        </div>
      </header>

      <main class="loju-page-main">
        {note
          ? (
            <article>
              {/* Note Metadata Header */}
              <div class="loju-note-meta-header">
                {note.tags && note.tags.length > 0 && (
                  <div class="loju-note-tags">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        class="loju-note-tag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <h1 class="loju-note-title">
                  {note.title}
                </h1>

                <div class="loju-note-meta">
                  <div>
                    <span>LAST_MODIFIED: {formatDate(note.mtime)}</span>
                  </div>
                  {note.ctime && (
                    <div>
                      <span>CREATED: {formatDate(note.ctime)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rendered Markdown Body */}
              <div
                class="markdown-body loju-markdown"
                data-color-mode="dark"
                data-dark-theme="dark"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </article>
          )
          : <p class="loju-no-data">[NO_NOTE_DATA_AVAILABLE]</p>}
      </main>
    </div>
  );
});
