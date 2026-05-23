import { define, openKv, slugifyPath, encodePath } from "../../utils.ts";

const AUTH_TOKEN = Deno.env.get("AUTH_TOKEN");

async function pingIndexNow(url: string) {
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: "loju.ca",
        key: "7f2bc8a614ef4bca998379c3f25c760a",
        keyLocation: "https://loju.ca/7f2bc8a614ef4bca998379c3f25c760a.txt",
        urlList: [url],
      }),
    });
    console.log(`[IndexNow] Pinged ${url}, status: ${response.status}`);
  } catch (e) {
    console.error(`[IndexNow] Failed to ping IndexNow for ${url}:`, e);
  }
}

export const handler = define.handlers({
  async POST(ctx) {
    const { req } = ctx;

    // Authenticate request if AUTH_TOKEN is configured
    if (AUTH_TOKEN) {
      const authHeader = req.headers.get("Authorization");
      if (
        !authHeader || !authHeader.startsWith("Bearer ") ||
        authHeader.substring(7) !== AUTH_TOKEN
      ) {
        return new Response(
          JSON.stringify({ error: "Unauthorized. Invalid bearer token." }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    try {
      const body = await req.json();
      const { action, path, title } = body;

      if (!action || (action !== "wipe" && !path)) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: action and path.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const cleanPath = path && path.endsWith(".md") ? path.slice(0, -3) : path;
      const slugifiedPath = cleanPath ? slugifyPath(cleanPath) : "";
      const kv = await openKv();

      if (action === "publish") {
        const { content, frontmatter, tags, mtime, ctime } = body;

        const noteObject = {
          path: slugifiedPath,
          title,
          content,
          frontmatter: frontmatter || {},
          tags: tags || [],
          mtime,
          ctime,
          ingestedAt: Date.now(),
        };

        // Save to Deno KV using the slugified path
        await kv.set(["notes", slugifiedPath], noteObject);

        console.log(`[PUBLISH] Saved note: ${slugifiedPath} (Title: ${title})`);

        // Ping IndexNow to notify search engines of the new/updated note
        const noteUrl = `https://loju.ca${slugifiedPath === "index" ? "/" : "/" + encodePath(slugifiedPath)}`;
        pingIndexNow(noteUrl);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully published: ${title}`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else if (action === "unpublish") {
        // Delete from Deno KV using the slugified path
        await kv.delete(["notes", slugifiedPath]);

        console.log(`[UNPUBLISH] Deleted note: ${slugifiedPath}`);

        // Ping IndexNow to notify search engines of note deletion
        const noteUrl = `https://loju.ca${slugifiedPath === "index" ? "/" : "/" + encodePath(slugifiedPath)}`;
        pingIndexNow(noteUrl);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully unpublished: ${path}`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else if (action === "wipe") {
        const entries = kv.list({ prefix: ["notes"] });
        let wipeCount = 0;
        for await (const entry of entries) {
          await kv.delete(entry.key);
          wipeCount++;
        }
        console.log(`[WIPE] Deleted ${wipeCount} notes from KV database.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully wiped ${wipeCount} notes from KV.`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      console.error("Error processing request:", error);
      const err = error as any;
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: err.message || String(err),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
