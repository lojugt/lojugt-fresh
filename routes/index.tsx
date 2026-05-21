import { define } from "../utils.ts";

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
  async GET(ctx) {
    try {
      const kv = await Deno.openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];
      
      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }
      
      // Sort by last modified time (descending)
      notes.sort((a, b) => b.mtime - a.mtime);
      
      return {
        data: { notes, error: null }
      };
    } catch (e) {
      return {
        data: { notes: [], error: e.stack || e.message || String(e) }
      };
    }
  }
});

function getSnippet(content: string, maxLen = 140): string {
  const plainText = content
    .replace(/[#*`_~\[\]()\-+]/g, "") // strip common markdown syntax
    .replace(/\s+/g, " ")            // collapse spaces
    .trim();
  return plainText.length > maxLen ? plainText.substring(0, maxLen) + "..." : plainText;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default define.page<typeof handler>(function Home({ data }) {
  const { notes, error } = data;
  
  return (
    <div class="min-h-screen bg-[#08090c] text-[#a9b1d6] selection:bg-[#1a1b26] selection:text-[#7aa2f7] pb-24 font-mono">
      {/* Global CSS to override font for everything in home */}
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          font-family: 'JetBrains Mono', monospace !important;
          background-color: #08090c !important;
        }
      `}} />

      {/* Header */}
      <header class="border-b border-[#1b1c24] bg-[#0b0c10]/90 backdrop-blur-sm sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-8 py-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="border border-[#1b1c24] px-2.5 py-1 text-xs bg-[#12131a] text-[#7aa2f7] font-bold tracking-widest">
              LOJUGT
            </div>
            <div class="text-sm font-semibold tracking-wider text-white">
              // PUBLISHED_THOUGHTS
            </div>
          </div>
          
          <div class="flex items-center gap-2 border border-[#1b1c24] bg-[#12131a] px-3 py-1.5 text-xs text-[#565f89]">
            <span class={`inline-block w-1.5 h-1.5 rounded-full ${notes.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span>{notes.length} note{notes.length === 1 ? "" : "s"} live</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-4xl mx-auto px-8 mt-12">
        {/* Status Panel */}
        <div class="border border-[#1b1c24] bg-[#12131a]/40 p-4 mb-10 text-xs text-[#565f89] flex flex-wrap gap-x-8 gap-y-2 justify-between items-center">
          <div>
            DATABASE: <span class={error ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{error ? "ERROR" : "CONNECTED"}</span>
          </div>
          <div>
            HOST: <span class="text-[#c0caf5]">loju.ca</span>
          </div>
          <div>
            LAST_SYNC: <span class="text-[#c0caf5]">{notes.length > 0 ? formatDate(notes[0].mtime) : "N/A"}</span>
          </div>
        </div>

        {error && (
          <div class="border border-red-500/20 bg-red-950/10 text-red-400 p-4 mb-8 text-xs whitespace-pre-wrap font-mono">
            <strong>[ERROR_LOG]</strong> {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div class="border border-[#1b1c24] border-dashed p-12 text-center bg-[#12131a]/10 max-w-lg mx-auto mt-16">
            <div class="text-xs text-[#7aa2f7] mb-2 font-bold">[WAITING_FOR_PUBLICATION]</div>
            <p class="text-xs text-[#565f89] leading-relaxed mb-4">
              To publish a note, configure its frontmatter:
            </p>
            <pre class="bg-[#12131a] border border-[#1b1c24] p-3 text-left text-xs text-[#7aa2f7] overflow-x-auto inline-block mx-auto max-w-full font-mono">
{`---
publish: true
---`}
            </pre>
            <p class="text-xs text-[#565f89] mt-4 leading-relaxed">
              Then run the "Publish/Sync modified notes" command inside Obsidian.
            </p>
          </div>
        ) : (
          <div class="flex flex-col gap-6">
            {notes.map((note) => (
              <a
                href={`/notes/${note.path}`}
                class="group block border border-[#1b1c24] hover:border-[#7aa2f7]/40 bg-[#12131a]/20 hover:bg-[#12131a]/50 transition-all duration-200 p-6"
              >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h2 class="text-sm font-bold text-white group-hover:text-[#7aa2f7] transition-colors duration-200">
                    {note.title}
                  </h2>
                  <span class="text-xs text-[#565f89] font-mono shrink-0">
                    [{formatDate(note.mtime)}]
                  </span>
                </div>
                
                <p class="text-xs text-[#565f89] leading-relaxed mb-4 line-clamp-2">
                  {getSnippet(note.content)}
                </p>
                
                <div class="flex flex-wrap gap-3 text-[10px] text-[#7aa2f7]">
                  {note.tags && note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span>#{tag}</span>
                    ))
                  ) : (
                    <span class="text-[#414868] italic">[no_tags]</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
});
