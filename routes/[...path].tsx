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
        <details class="loju-header-details">
          <summary class="loju-header-summary">
            <div class="loju-page-header-inner">
              <a href="/" class="loju-back-link" onClick={(e) => e.stopPropagation()}>
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
              <div class="loju-page-path-container">
                <span class="loju-page-path">{note ? note.path : "ERROR"}</span>
                <span class="loju-info-indicator"></span>
              </div>
            </div>
          </summary>
          {note && (
            <div class="loju-header-info-drawer">
              <div class="loju-info-row">
                <span class="loju-info-key">PATH:</span>
                <span class="loju-info-val">{note.path}</span>
              </div>
              <div class="loju-info-row">
                <span class="loju-info-key">TITLE:</span>
                <span class="loju-info-val">{note.title}</span>
              </div>
              <div class="loju-info-row">
                <span class="loju-info-key">CREATED:</span>
                <span class="loju-info-val">
                  {formatDate(note.frontmatter?.first_published || note.ctime || 0)}
                </span>
              </div>
              <div class="loju-info-row">
                <span class="loju-info-key">UPDATED:</span>
                <span class="loju-info-val">{formatDate(note.mtime)}</span>
              </div>
              {note.frontmatter?.description && (
                <div class="loju-info-row">
                  <span class="loju-info-key">DESCRIPTION:</span>
                  <span class="loju-info-val">{note.frontmatter.description}</span>
                </div>
              )}
              {note.tags && note.tags.length > 0 && (
                <div class="loju-info-row">
                  <span class="loju-info-key">TAGS:</span>
                  <span class="loju-info-val">
                    {note.tags.map((tag) => `#${tag}`).join(" ")}
                  </span>
                </div>
              )}
              {Object.keys(note.frontmatter || {}).length > 0 && (
                <div class="loju-info-row" style={{ flexDirection: "column", gap: "0.25rem" }}>
                  <span class="loju-info-key">FRONTMATTER:</span>
                  <pre class="loju-info-pre">
                    {Object.entries(note.frontmatter)
                      .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                      .join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}
        </details>
      </header>

      <main class="loju-page-main">
        {note
          ? (
            <article>
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
