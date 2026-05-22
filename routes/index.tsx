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

      if (note) {
        _ctx.state.title = note.title;
        _ctx.state.description = note.frontmatter?.description || getSnippet(note.content);
        if (note.tags && note.tags.length > 0) {
          _ctx.state.tags = note.tags;
        }
      } else {
        _ctx.state.title = "Loju - Home";
        _ctx.state.description = "A minimalist public notebook powered by Obsidian and Deno KV.";
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
                    {note.path}
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
          </details>
        </header>


        <main class="loju-page-main">
          <article>
            {/* Rendered Markdown Body */}
            <div
              class="markdown-body loju-markdown"
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
    <div class="loju-empty-state">
      <main class="loju-empty-main">
        <h1 class="loju-empty-title">
          LOJU
        </h1>
      </main>
    </div>
  );
});
