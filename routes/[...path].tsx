import {
  define,
  formatDate,
  getSnippet,
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

      if (note) {
        ctx.state.title = note.title;
        ctx.state.description = note.frontmatter?.description || getSnippet(note.content);
        if (note.tags && note.tags.length > 0) {
          ctx.state.tags = note.tags;
        }
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
              <div class="loju-page-header-left">
                <a href="https://loju.ca" class="loju-brand" onclick="event.stopPropagation();">
                  LOJU
                </a>
              </div>
              <div class="loju-page-header-middle">
                <span class="loju-page-path">
                  {note ? note.path : "ERROR"}
                </span>
              </div>
              <div class="loju-page-header-right">
                <button
                  class="loju-theme-toggle-btn"
                  title="Toggle day/night mode"
                  onclick="event.stopPropagation(); window.toggleLojuTheme();"
                >
                  <span class="loju-toggle-icon">🍍</span>
                  <span id="loju-theme-status">LUX</span>
                </button>
              </div>
            </div>
          </summary>
          {note && (
            <div class="loju-header-info-drawer">
              <div class="loju-info-row">
                <span class="loju-info-key">TITLE:</span>
                <span class="loju-info-val">{note.title}</span>
              </div>
              <div class="loju-info-row">
                <span class="loju-info-key">UPDATED:</span>
                <span class="loju-info-val">{formatDate(note.mtime)}</span>
              </div>
              {note.tags && note.tags.length > 0 && (
                <div class="loju-info-row">
                  <span class="loju-info-key">TAGS:</span>
                  <span class="loju-info-val">
                    {note.tags.map((tag) => `#${tag}`).join(" ")}
                  </span>
                </div>
              )}
              <div class="loju-info-row">
                <span class="loju-info-key">SHARE:</span>
                <span class="loju-info-val">
                  <button
                    class="loju-share-btn"
                    data-path={note.path}
                    onclick="event.stopPropagation(); const path = this.getAttribute('data-path'); const shareUrl = window.location.origin + '/' + (path === 'index' ? '' : encodeURIComponent(path)); navigator.clipboard.writeText(shareUrl); const originalText = this.innerText; this.innerText = 'COPIED!'; this.style.color = '#ff79c6'; setTimeout(() => { this.innerText = originalText; this.style.color = ''; }, 2000);"
                  >
                    [COPY LINK]
                  </button>
                </span>
              </div>
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
