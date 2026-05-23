import { createDefine } from "fresh";

export interface State {
  title?: string;
  description?: string;
  tags?: string[];
  dateModified?: number;
  datePublished?: number | string;
}

export const define = createDefine<State>();

export async function openKv() {
  const isDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
  return await Deno.openKv(isDeploy ? undefined : "./kv.db");
}

export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, any>;
  tags: string[];
  mtime: number;
  ctime?: number;
  ingestedAt: number;
}

export function formatDate(timestamp: number | string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function getSnippet(content: string, maxLength = 160): string {
  // Strip frontmatter first
  let text = stripFrontmatter(content);
  
  // Replace headings: "# heading" -> ""
  text = text.replace(/^#+\s+/gm, "");
  
  // Replace Obsidian wikilinks: "[[note|alias]]" -> "alias" or "note"
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    return alias ? alias.trim() : target.trim();
  });
  
  // Replace standard markdown links: "[text](url)" -> "text"
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  
  // Replace highlights: "==text==" -> "text"
  text = text.replace(/==([^=]+)==/g, "$1");
  
  // Replace inline code, bold, italics, etc.
  text = text.replace(/[`*_~]/g, "");
  
  // Replace multiple whitespace/newlines with a single space
  text = text.replace(/\s+/g, " ").trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Truncate cleanly at a space if possible
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}

export function resolveWikilink(target: string, allNotes: Note[]): string {
  // Normalize target: replace backslashes with forward slashes, trim
  const normalizedTarget = target.replace(/\\/g, "/").trim();

  // 1. Exact match (case-sensitive)
  let match = allNotes.find((n) => n.path === normalizedTarget);
  if (match) return match.path;

  // 2. Exact match (case-insensitive)
  const lowerTarget = normalizedTarget.toLowerCase();
  match = allNotes.find((n) => n.path.toLowerCase() === lowerTarget);
  if (match) return match.path;

  // 3. Ending match / filename match (e.g. "Anonymous Unreal" matches "subfolder two/Anonymous Unreal")
  // Case-sensitive check
  match = allNotes.find((n) =>
    n.path.endsWith("/" + normalizedTarget) ||
    n.path.split("/").pop() === normalizedTarget
  );
  if (match) return match.path;

  // Case-insensitive check
  match = allNotes.find((n) =>
    n.path.toLowerCase().endsWith("/" + lowerTarget) ||
    n.path.split("/").pop()?.toLowerCase() === lowerTarget
  );
  if (match) return match.path;

  // Fallback: return normalizedTarget
  return normalizedTarget;
}

export function processMarkdownFeatures(
  markdown: string,
  allNotes: Note[],
): string {
  const parts = markdown.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (index % 2 !== 0) {
      return part;
    }
    const inlineParts = part.split(/(`[^`\n]+`)/g);
    return inlineParts.map((subPart, subIndex) => {
      if (subIndex % 2 !== 0) {
        return subPart;
      }

      let text = subPart;

      // 1. Convert Obsidian wikilinks using resolution
      text = text.replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (_match, targetRaw, aliasRaw) => {
          const target = targetRaw.trim();
          const alias = aliasRaw ? aliasRaw.trim() : target;

          if (target.toLowerCase() === "index") {
            return `[${alias}](/)`;
          }

          const resolvedPath = resolveWikilink(target, allNotes);
          const encodedTarget = resolvedPath.split("/").map((part: string) =>
            encodeURIComponent(part)
          ).join("/");
          return `[${alias}](/${encodedTarget})`;
        },
      );

      // 2. Convert Obsidian highlights
      text = text.replace(/==([^=]+)==/g, '<mark class="highlight">$1</mark>');

      return text;
    }).join("");
  }).join("");
}

export function processExternalLinks(html: string): string {
  return html.replace(/<a\s+([^>]*?)>/gi, (match, attributes) => {
    const hrefMatch = attributes.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (hrefMatch) {
      if (!/target=["']_blank["']/i.test(attributes)) {
        return `<a ${attributes} target="_blank" rel="noopener noreferrer">`;
      }
    }
    return match;
  });
}
