import {
  define,
  encodePath,
  formatDate,
  getBacklinks,
  getForwardLinks,
  getRelatedNotes,
  getSnippet,
  Note,
  openKv,
  processLinks,
  processMarkdownFeatures,
  slugifyPath,
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
        _ctx.state.description = note.frontmatter?.description ||
          getSnippet(note.content);
        if (note.tags && note.tags.length > 0) {
          _ctx.state.tags = note.tags;
        }
        _ctx.state.dateModified = note.mtime;
        _ctx.state.datePublished = note.frontmatter?.first_published ||
          note.ctime || note.mtime;
      } else {
        _ctx.state.title = "Loju - Home";
        _ctx.state.description =
          "A minimalist public notebook powered by Obsidian and Deno KV.";
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

  const fallbackNote: Note = {
    path: "index",
    title: "LOJU",
    content: "",
    frontmatter: {},
    tags: [],
    mtime: Date.now(),
    ctime: Date.now(),
    ingestedAt: Date.now(),
  };

  const activeNote = note || fallbackNote;

  const relatedNotes = getRelatedNotes(activeNote, notes || []);
  const directPaths = new Set(
    [
      ...getForwardLinks(activeNote, notes || []).map((n) =>
        slugifyPath(n.path)
      ),
      ...getBacklinks(activeNote, notes || []).map((n) => slugifyPath(n.path)),
    ],
  );

  let htmlContent = "";
  const hasIndexContent = note &&
    stripFrontmatter(note.content).trim().length > 0;
  if (hasIndexContent) {
    const cleanMarkdown = processMarkdownFeatures(
      stripFrontmatter(note.content),
      notes || [],
    );
    const rawHtml = render(cleanMarkdown);
    htmlContent = processLinks(rawHtml, notes || []);
  }

  const recentNotes = (notes || [])
    .filter((n) => slugifyPath(n.path) !== "index")
    .sort((a, b) => b.mtime - a.mtime);

  return (
    <div class="loju-page">
      <header class="loju-page-header">
        <input
          type="checkbox"
          id="loju-drawer-toggle"
          class="loju-drawer-checkbox"
          style="display: none;"
        />
        <div class="loju-page-header-inner">
          <div class="loju-page-header-left">
            <a
              href="https://loju.ca"
              class="loju-brand"
              {...{ onclick: "event.stopPropagation();" }}
            >
              LOJU
            </a>
          </div>
          <div class="loju-page-header-middle">
            <label
              for="loju-drawer-toggle"
              class="loju-page-path"
              title="Toggle drawer"
            >
              <span class="loju-drawer-gear">🪷</span>
              <span class="loju-drawer-close">💀</span>
            </label>
          </div>
          <div class="loju-page-header-right">
            <button
              type="button"
              class="loju-theme-toggle-btn"
              title="Toggle day/night mode"
              {...{
                onclick: "event.stopPropagation(); window.toggleLojuTheme();",
              }}
            >
              <span class="loju-toggle-icon">🍍</span>
              <span id="loju-theme-status">LUX</span>
            </button>
          </div>
        </div>

        <div class="loju-header-info-drawer">
          {/* Search container */}
          <div class="loju-drawer-search-container">
            <input
              type="text"
              id="loju-search-input"
              placeholder="Search notes..."
              autocomplete="off"
              {...{ oninput: "window.runLojuSearch(this.value);" }}
            />
            <ul id="loju-search-results" class="loju-search-results-list"></ul>
          </div>

          <div class="loju-drawer-top">
            <span
              class="loju-drawer-copy-link"
              title="Click to copy link"
              {...{ onclick: "window.copyLojuLink(this);" }}
            >
              <span class="loju-copy-link-text">loju.ca/</span>
              <span class="loju-copy-link-status">🍯</span>
            </span>
          </div>

          {activeNote.tags && activeNote.tags.length > 0 && (
            <div class="loju-drawer-section">
              <span class="loju-drawer-label">TAGS:</span>
              <div class="loju-drawer-tags-list">
                {activeNote.tags.map((tag) => (
                  <span class="loju-drawer-tag">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {relatedNotes.length > 0 && (
            <div class="loju-drawer-section">
              <span class="loju-drawer-label">LINKS:</span>
              <ul class="loju-drawer-links-list">
                {relatedNotes.map((relatedNote) => {
                  const isDirectLink = directPaths.has(
                    slugifyPath(relatedNote.path),
                  );
                  return (
                    <li>
                      <a
                        href={relatedNote.path === "index"
                          ? "/"
                          : `/${encodePath(relatedNote.path)}`}
                      >
                        {relatedNote.title}
                      </a>
                      {!isDirectLink && (
                        <span class="loju-drawer-link-badge">recent</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
            window.LOJU_SEARCH_INDEX = ${
              JSON.stringify(
                (notes || []).map((n) => ({
                  title: n.title,
                  path: n.path === "index" ? "/" : `/${encodePath(n.path)}`,
                })),
              )
            };

            window.runLojuSearch = function(query) {
              const input = query.trim().toLowerCase();
              const resultsContainer = document.getElementById("loju-search-results");
              if (!resultsContainer) return;
              
              if (!input) {
                resultsContainer.innerHTML = "";
                resultsContainer.style.display = "none";
                return;
              }
              
              const matches = (window.LOJU_SEARCH_INDEX || [])
                .filter(n => n.title.toLowerCase().includes(input))
                .slice(0, 8);
                
              if (matches.length === 0) {
                resultsContainer.innerHTML = '<li class="loju-search-no-match">No matching notes</li>';
                resultsContainer.style.display = "block";
                return;
              }
              
              resultsContainer.innerHTML = matches
                .map(function(m) { return '<li><a href="' + m.path + '">' + m.title + '</a></li>'; })
                .join("");
              resultsContainer.style.display = "block";
            };

            window.copyLojuLink = function(el) {
              navigator.clipboard.writeText(window.location.href);
              const textEl = el.querySelector('.loju-copy-link-text');
              if (!textEl) return;
              
              const originalText = textEl.innerText;
              textEl.innerText = 'copied';
              el.classList.add('loju-copied');
              
              setTimeout(() => {
                textEl.innerText = originalText;
                el.classList.remove('loju-copied');
              }, 1500);
            };

            document.addEventListener('DOMContentLoaded', () => {
              const toggle = document.getElementById('loju-drawer-toggle');
              const searchInput = document.getElementById('loju-search-input');
              if (toggle && searchInput) {
                toggle.addEventListener('change', () => {
                  if (toggle.checked) {
                    setTimeout(() => searchInput.focus(), 100);
                  } else {
                    searchInput.value = '';
                    window.runLojuSearch('');
                  }
                });
              }
            });

            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                const toggle = document.getElementById('loju-drawer-toggle');
                if (toggle && toggle.checked) {
                  toggle.checked = false;
                  toggle.dispatchEvent(new Event('change'));
                }
              }
            });
          `,
          }}
        />
      </header>

      <main class="loju-page-main">
        {hasIndexContent && (
          <article>
            {/* Rendered Markdown Body */}
            <div
              class="markdown-body loju-markdown"
              data-color-mode="dark"
              data-dark-theme="dark"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </article>
        )}

        <section
          class={`loju-index-feed ${
            !hasIndexContent ? "loju-feed-standalone" : ""
          }`}
        >
          <h2 class="loju-feed-title">RECENTLY UPDATED</h2>
          {recentNotes.length > 0
            ? (
              <div class="loju-feed-list">
                {recentNotes.map((n) => {
                  const snippet = getSnippet(n.content, 160);
                  return (
                    <div class="loju-feed-item">
                      <h3 class="loju-feed-item-title">
                        <a href={`/${encodePath(n.path)}`}>{n.title}</a>
                      </h3>
                      <div class="loju-feed-item-meta">
                        UPDATED: {formatDate(n.mtime)}
                      </div>
                      {snippet && (
                        <p class="loju-feed-item-snippet">{snippet}</p>
                      )}
                      {n.tags && n.tags.length > 0 && (
                        <div class="loju-feed-item-tags">
                          {n.tags.map((tag) => (
                            <span class="loju-feed-item-tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
            : <p class="loju-no-data">[NO_POSTS_AVAILABLE]</p>}
        </section>
      </main>
    </div>
  );
});
