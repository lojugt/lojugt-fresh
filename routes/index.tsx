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
    <div class="min-h-screen bg-[#0b0d10] text-[#e3e6eb] selection:bg-[#2563eb] selection:text-white pb-16">
      {/* Decorative background glow */}
      <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div class="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <header class="border-b border-[#1f242e] bg-[#0d1117]/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span class="font-bold text-lg text-white">L</span>
            </div>
            <div>
              <span class="font-bold text-xl tracking-tight text-white">Lojugt</span>
              <span class="text-xs block text-gray-500 font-mono">Deno KV Publishing</span>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-[#161b22] border border-[#21262d] px-3.5 py-1.5 rounded-full shadow-inner">
            <span class={`w-2 h-2 rounded-full ${notes.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
            <span class="text-xs font-mono font-medium text-[#c9d1d9]">
              {notes.length} note{notes.length === 1 ? "" : "s"} live
            </span>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-6 mt-12 relative">
        <div class="mb-10">
          <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Published Thoughts
          </h1>
          <p class="text-[#8b949e] text-lg max-w-2xl">
            A real-time collection of notes synchronized directly from Obsidian into Deno KV.
          </p>
          
          <div class="flex gap-6 mt-6">
            <div class="bg-[#161b22]/50 border border-[#21262d]/60 rounded-xl px-5 py-3 backdrop-blur-sm">
              <span class="text-xs font-mono text-[#8b949e] block mb-1">Total Notes</span>
              <span class="text-3xl font-extrabold text-white tracking-tight">{notes.length}</span>
            </div>
            <div class="bg-[#161b22]/50 border border-[#21262d]/60 rounded-xl px-5 py-3 backdrop-blur-sm">
              <span class="text-xs font-mono text-[#8b949e] block mb-1">Database Status</span>
              <span class={`text-xs font-mono flex items-center gap-1.5 mt-2 ${error ? 'text-red-400' : 'text-green-400'}`}>
                <span class={`w-1.5 h-1.5 rounded-full inline-block ${error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
                {error ? 'Connection Error' : 'Connected'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            border: "1px solid rgba(239, 68, 68, 0.5)",
            backgroundColor: "rgba(127, 29, 29, 0.2)",
            color: "#fca5a5",
            padding: "1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            whiteSpace: "pre-wrap"
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div class="border border-[#21262d]/40 rounded-2xl p-12 text-center bg-[#161b22]/20 backdrop-blur-sm max-w-xl mx-auto mt-8">
            <div class="flex items-center justify-center gap-2 mb-4 text-[#58a6ff]">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span class="text-xs font-mono tracking-wider uppercase">System Online & Ready</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Awaiting Obsidian Publish</h3>
            <p class="text-sm text-[#8b949e] mb-4">
              To publish a note, add <code class="bg-[#21262d] px-1.5 py-0.5 rounded text-[#58a6ff] text-xs font-mono">publish: true</code> to its frontmatter in Obsidian and trigger the sync menu item.
            </p>
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <a
                href={`/notes/${note.path}`}
                class="group block border border-[#21262d] bg-[#161b22]/40 hover:bg-[#1c2128]/70 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm"
              >
                {/* Subtle border top glow on hover */}
                <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-500" />
                
                <span class="text-xs font-mono text-[#58a6ff] block mb-2">
                  {formatDate(note.mtime)}
                </span>
                
                <h3 class="text-xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300 mb-3 line-clamp-1">
                  {note.title}
                </h3>
                
                <p class="text-[#8b949e] text-sm mb-5 line-clamp-3 leading-relaxed">
                  {getSnippet(note.content)}
                </p>
                
                <div class="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-[#21262d]/50">
                  {note.tags && note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] group-hover:bg-blue-950/30 group-hover:text-[#58a6ff] transition-colors duration-300">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span class="text-[10px] italic text-gray-600">No tags</span>
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
