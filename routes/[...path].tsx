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
  processExternalLinks,
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
      let note = notes.find((n) => slugifyPath(n.path) === slugifiedCleanPath);

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
        ctx.state.dateModified = note.mtime;
        ctx.state.datePublished = note.frontmatter?.first_published || note.ctime || note.mtime;
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
      : []
  );

  let htmlContent = "";
  const isIndex = note && note.path.toLowerCase() === "index";
  if (note) {
    const contentWithoutFrontmatter = stripFrontmatter(note.content);
    const contentWithoutLeadingHeader = (!isIndex && contentWithoutFrontmatter.trimStart().startsWith("# "))
      ? contentWithoutFrontmatter.trimStart().replace(/^#\s+.*(?:\r?\n|$)/, "")
      : contentWithoutFrontmatter;

    const cleanMarkdown = processMarkdownFeatures(
      contentWithoutLeadingHeader,
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
              <div class="loju-drawer-top">
                <button
                  class="loju-drawer-copy-btn"
                  onclick="navigator.clipboard.writeText(window.location.href); this.innerText='LINK COPIED!'; setTimeout(() => this.innerText='COPY LINK', 2000)"
                >
                  COPY LINK
                </button>
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
                      const isDirectLink = directPaths.has(slugifyPath(relatedNote.path));
                      return (
                        <li>
                          <a href={relatedNote.path === "index" ? "/" : `/${encodePath(relatedNote.path)}`}>
                            {relatedNote.title}
                          </a>
                          {!isDirectLink && <span class="loju-drawer-link-badge">recent</span>}
                        </li>
                      );
                    })}
                  </ul>
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
              {!isIndex && (() => {
                const pubTimestamp = note.frontmatter?.first_published || note.ctime;
                const showPub = !!pubTimestamp;
                const pubDate = pubTimestamp ? new Date(pubTimestamp) : null;
                const editDate = new Date(note.mtime);
                
                const isSameDay = pubDate && 
                  pubDate.getFullYear() === editDate.getFullYear() &&
                  pubDate.getMonth() === editDate.getMonth() &&
                  pubDate.getDate() === editDate.getDate();

                return (
                  <header class="loju-note-meta-header">
                    <h1 class="loju-note-title">{note.title}</h1>
                    <div class="loju-note-meta">
                      {isSameDay || !showPub ? (
                        <span>
                          PUBLISHED: {formatDate(pubTimestamp || note.mtime)}
                        </span>
                      ) : (
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
            </article>
          )
          : <p class="loju-no-data">[NO_NOTE_DATA_AVAILABLE]</p>}
      </main>
    </div>
  );
});
