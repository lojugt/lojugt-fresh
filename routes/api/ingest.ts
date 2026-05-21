import { define } from "../../utils.ts";

const AUTH_TOKEN = Deno.env.get("AUTH_TOKEN");

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

      if (!action || !path) {
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

      const cleanPath = path.endsWith(".md") ? path.slice(0, -3) : path;
      const kv = await Deno.openKv();

      if (action === "publish") {
        const { content, frontmatter, tags, mtime, ctime } = body;

        const noteObject = {
          path: cleanPath,
          title,
          content,
          frontmatter: frontmatter || {},
          tags: tags || [],
          mtime,
          ctime,
          ingestedAt: Date.now(),
        };

        // Save to Deno KV using the clean path
        await kv.set(["notes", cleanPath], noteObject);

        console.log(`[PUBLISH] Saved note: ${cleanPath} (Title: ${title})`);
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
        // Delete from Deno KV using the clean path
        await kv.delete(["notes", cleanPath]);

        console.log(`[UNPUBLISH] Deleted note: ${cleanPath}`);
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
