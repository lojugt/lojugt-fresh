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

    const slugifiedCleanPath = slugifyPath(cleanPath);

    // Redirect permanently (301) to clean slugified URL if requested URL is not clean
    if (cleanPath !== slugifiedCleanPath) {
      return new Response(null, {
        status: 301,
        headers: { Location: "/" + encodePath(slugifiedCleanPath) },
      });
    }

    try {
      const kv = await openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];
      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }

      // Find note by matching slugified path
      const note = notes.find((n) =>
        slugifyPath(n.path) === slugifiedCleanPath
      );

      if (!note) {
        // Redirect to homepage on failure to find the entry
        return new Response(null, {
          status: 307,
          headers: { Location: "/" },
        });
      }

      if (note) {
        ctx.state.title = note.title;
        ctx.state.description = note.frontmatter?.description ||
          getSnippet(note.content);
        if (note.tags && note.tags.length > 0) {
          ctx.state.tags = note.tags;
        }
        ctx.state.dateModified = note.mtime;
        ctx.state.datePublished = note.frontmatter?.first_published ||
          note.ctime || note.mtime;
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

  const relatedNotes = note ? getRelatedNotes(note, notes) : [];
  const directPaths = new Set(
    note
      ? [
        ...getForwardLinks(note, notes).map((n) => slugifyPath(n.path)),
        ...getBacklinks(note, notes).map((n) => slugifyPath(n.path)),
      ]
      : [],
  );

  let htmlContent = "";
  const isIndex = note && note.path.toLowerCase() === "index";
  if (note) {
    const contentWithoutFrontmatter = stripFrontmatter(note.content);
    const contentWithoutLeadingHeader =
      (!isIndex && contentWithoutFrontmatter.trimStart().startsWith("# "))
        ? contentWithoutFrontmatter.trimStart().replace(
          /^#\s+.*(?:\r?\n|$)/,
          "",
        )
        : contentWithoutFrontmatter;

    const cleanMarkdown = processMarkdownFeatures(
      contentWithoutLeadingHeader,
      notes || [],
    );
    const rawHtml = render(cleanMarkdown);
    htmlContent = processLinks(rawHtml, notes || []);
  }

  const vectorName = note?.frontmatter?.vector;
  let showVector = false;
  if (
    vectorName && typeof vectorName === "string" &&
    /^[a-zA-Z0-9_-]+$/.test(vectorName)
  ) {
    try {
      const stat = Deno.statSync(`./static/vectors/${vectorName}.svg`);
      showVector = stat.isFile;
    } catch {
      // ignore
    }
  }

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
              <img
                src="/vectors/loju.svg"
                alt="Loju"
                {...{
                  "data-visualsearch": "false",
                  "disable-smart-image": "true",
                  "msallowcapture": "false",
                }}
              />
            </a>
          </div>
          <div class="loju-page-header-middle">
            <label
              for="loju-drawer-toggle"
              class="loju-page-path"
              title="Toggle drawer"
            >
              <img
                class="loju-drawer-gear"
                src="/vectors/lotusup.svg"
                alt="Lotus"
                {...{
                  "data-visualsearch": "false",
                  "disable-smart-image": "true",
                  "msallowcapture": "false",
                }}
              />
              <img
                class="loju-drawer-close"
                src="/vectors/skulldown.svg"
                alt="Skull"
                {...{
                  "data-visualsearch": "false",
                  "disable-smart-image": "true",
                  "msallowcapture": "false",
                }}
              />
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
              <img
                class="loju-toggle-icon"
                src="/vectors/solar.svg"
                alt="Theme"
                {...{
                  "data-visualsearch": "false",
                  "disable-smart-image": "true",
                  "msallowcapture": "false",
                }}
              />
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

          {note && (
            <>
              <div class="loju-drawer-top">
                <span
                  class="loju-drawer-copy-link"
                  title="Click to copy link"
                  {...{ onclick: "window.copyLojuLink(this);" }}
                >
                  <span class="loju-copy-link-text">
                    loju.ca/{slugifyPath(note.path)}
                  </span>
                  <span class="loju-copy-link-status">🍯</span>
                </span>
              </div>

              {note.tags && note.tags.length > 0 && (
                <div class="loju-drawer-section">
                  <span class="loju-drawer-label">TAGS:</span>
                  <div class="loju-drawer-tags-list">
                    {note.tags.map((tag) => (
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
            </>
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
                  if (!toggle.checked) {
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
        {note
          ? (
            <article>
              {!isIndex && (() => {
                const pubTimestamp = note.frontmatter?.first_published ||
                  note.ctime;
                const showPub = !!pubTimestamp;
                const pubDate = pubTimestamp ? new Date(pubTimestamp) : null;
                const editDate = new Date(note.mtime);

                const isSameDay = pubDate &&
                  pubDate.getFullYear() === editDate.getFullYear() &&
                  pubDate.getMonth() === editDate.getMonth() &&
                  pubDate.getDate() === editDate.getDate();

                return (
                  <header class="loju-note-meta-header">
                    <div class="loju-note-header-content">
                      <h1 class="loju-note-title">{note.title}</h1>
                      <div class="loju-note-meta">
                        {isSameDay || !showPub
                          ? (
                            <span>
                              PUBLISHED:{" "}
                              {formatDate(pubTimestamp || note.mtime)}
                            </span>
                          )
                          : (
                            <>
                              <span>
                                EDITED: {formatDate(note.mtime)}
                              </span>
                              <span>
                                PUBLISHED: {formatDate(pubTimestamp!)}
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                  </header>
                );
              })()}
              {/* Rendered Markdown Body */}
              <div
                class="markdown-body loju-markdown"
                data-color-mode="dark"
                data-dark-theme="dark"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
              {showVector && (
                <div class="loju-note-vector">
                  <img
                    src={`/vectors/${vectorName}.svg`}
                    alt=""
                    {...{
                      "data-visualsearch": "false",
                      "disable-smart-image": "true",
                      "msallowcapture": "false",
                    }}
                  />
                </div>
              )}
            </article>
          )
          : <p class="loju-no-data">[NO_NOTE_DATA_AVAILABLE]</p>}
      </main>
    </div>
  );
});
