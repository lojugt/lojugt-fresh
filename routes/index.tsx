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
    const kv = await Deno.openKv();
    const entries = kv.list({ prefix: ["notes"] });
    const notes: Note[] = [];
    
    for await (const entry of entries) {
      notes.push(entry.value as Note);
    }
    
    // Sort by last modified time (descending)
    notes.sort((a, b) => b.mtime - a.mtime);
    
    return {
      data: { notes }
    };
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
  const { notes } = data;
  
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
          <div class="text-sm font-mono text-[#6b7280]">
            {notes.length} note{notes.length === 1 ? "" : "s"} online
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
        </div>

        {notes.length === 0 ? (
          <div class="border border-dashed border-[#21262d] rounded-2xl p-16 text-center bg-[#161b22]/30 backdrop-blur-sm">
            <div class="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">No notes published yet</h3>
            <p class="text-[#8b949e] max-w-md mx-auto mb-6">
              Tag your Obsidian notes with <code class="bg-[#21262d] px-1.5 py-0.5 rounded text-white text-sm">publish: true</code> in frontmatter and trigger the sync menu item.
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
