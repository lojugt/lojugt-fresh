import { define, openKv } from "../../utils.ts";
import Sidebar from "../../islands/Sidebar.tsx";

export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, any>;
  tags: string[];
  mtime: number;
  ctime: number;
  ingestedAt: number;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const kv = await openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];

      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }

      // Sort by last modified time (descending)
      notes.sort((a, b) => b.mtime - a.mtime);

      return {
        data: { notes, error: null },
      };
    } catch (e) {
      const err = e as any;
      return {
        data: { notes: [], error: err.stack || err.message || String(err) },
      };
    }
  },
});

function getSnippet(content: string, maxLen = 140): string {
  // Strip YAML frontmatter block first
  const cleanContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const plainText = cleanContent
    .replace(/[#*`_~\[\]()\-+]/g, "") // strip common markdown syntax
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
  return plainText.length > maxLen
    ? plainText.substring(0, maxLen) + "..."
    : plainText;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default define.page<typeof handler>(function NotesIndex({ data }) {
  const { notes, error } = data;
  const recentNotes = notes.slice(0, 3);

  return (
    <div class="min-h-screen bg-black text-[#ffffff] pb-24 font-mono px-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          background-color: #000000 !important;
          color: #ffffff !important;
        }
      `,
        }}
      />

      <main class="max-w-[500px] mx-auto mt-16">
        <header class="text-center mb-16">
          <h1 class="text-3xl font-bold tracking-[0.2em] mb-2">
            <a href="/" class="hover:underline">LOJU</a>
          </h1>
          <p class="text-[10px] text-[#555] uppercase tracking-[0.3em]">
            Notes Index
          </p>
        </header>

        {error && (
          <div class="border border-red-500/20 bg-red-950/10 text-red-400 p-4 mb-8 text-xs whitespace-pre-wrap font-mono">
            <strong>[ERROR_LOG]</strong> {error}
          </div>
        )}

        {notes.length === 0
          ? (
            <div class="text-center py-12">
              <div class="text-xs text-[#888] mb-4">
                [NO_NOTES_PUBLISHED]
              </div>
              <p class="text-xs text-[#555] leading-relaxed mb-4">
                No notes have been published yet. Add publish: true to your
                Obsidian frontmatter.
              </p>
            </div>
          )
          : (
            <div>
              {/* Recent Updates */}
              <div class="space-y-12">
                {recentNotes.map((note) => (
                  <article
                    key={note.path}
                    class="border-b border-[#222] pb-10 last:border-b-0"
                  >
                    <div class="mb-3">
                      <h2 class="text-base font-bold">
                        <a
                          href={`/${note.path}`}
                          class="text-white hover:text-[#58a6ff] hover:underline transition-colors"
                        >
                          {note.title}
                        </a>
                      </h2>
                      <div class="text-[10px] text-[#555] mt-1.5">
                        {formatDate(note.mtime)}
                      </div>
                    </div>

                    <p class="text-xs text-[#888] leading-relaxed mb-4">
                      {getSnippet(note.content)}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div class="flex flex-wrap gap-2.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            class="text-[9px] text-[#58a6ff]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
      </main>
      <Sidebar notes={notes} />
    </div>
  );
});
