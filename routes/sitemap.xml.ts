import { define, openKv, Note, slugifyPath, encodePath } from "../utils.ts";

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const kv = await openKv();
      const entries = kv.list({ prefix: ["notes"] });
      const notes: Note[] = [];
      for await (const entry of entries) {
        notes.push(entry.value as Note);
      }

      const urls = [];
      // Add home page URL
      urls.push(`  <url>
    <loc>https://loju.ca/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

      // Add each note URL dynamically
      for (const note of notes) {
        const slugifiedPath = slugifyPath(note.path);
        if (slugifiedPath === "index") continue; // 'index' is the homepage, already handled
        
        const loc = `https://loju.ca/${encodePath(slugifiedPath)}`;
        const lastmod = new Date(note.mtime).toISOString().split("T")[0];
        
        urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (e) {
      console.error("Error generating sitemap:", e);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});
