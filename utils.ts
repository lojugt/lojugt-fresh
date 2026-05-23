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

export function slugifyPath(path: string): string {
  if (path.toLowerCase() === "index") {
    return "index";
  }
  return path
    .split("/")
    .map((part) =>
      part
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-")
    )
    .join("/");
}

export function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function getSnippet(content: string, maxLength = 160): string {
  // Strip frontmatter first
  let text = stripFrontmatter(content);

  // Replace headings: "# heading" -> ""
  text = text.replace(/^#+\s+/gm, "");

  // Replace Obsidian wikilinks: "[[note|alias]]" -> "alias" or "note"
  text = text.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, target, alias) => {
      return alias ? alias.trim() : target.trim();
    },
  );

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
  const targetSlug = slugifyPath(normalizedTarget);

  // 1. Match by slugified path
  let match = allNotes.find((n) => slugifyPath(n.path) === targetSlug);
  if (match) return slugifyPath(match.path);

  // 2. Match by filename slug (if target is just filename and path is subfolder/filename)
  const targetFileSlug = targetSlug.split("/").pop();
  match = allNotes.find((n) => {
    const fileSlug = slugifyPath(n.path).split("/").pop();
    return fileSlug === targetFileSlug;
  });
  if (match) return slugifyPath(match.path);

  // Fallback: return targetSlug
  return targetSlug;
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
          const encodedTarget = encodePath(resolvedPath);
          return `[${alias}](/${encodedTarget})`;
        },
      );

      // 2. Convert Obsidian highlights
      text = text.replace(/==([^=]+)==/g, '<mark class="highlight">$1</mark>');

      return text;
    }).join("");
  }).join("");
}

export function processLinks(html: string, allNotes: Note[] = []): string {
  const anchorRegex = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;

  return html.replace(anchorRegex, (match, attributes, innerText) => {
    // 1. External link check
    const externalHrefMatch = attributes.match(
      /href=["'](https?:\/\/[^"']+)["']/i,
    );
    if (externalHrefMatch) {
      if (!/target=["']_blank["']/i.test(attributes)) {
        return `<a ${attributes} target="_blank" rel="noopener noreferrer">${innerText}</a>`;
      }
      return match;
    }

    // 2. Internal link check
    const internalHrefMatch = attributes.match(/href=["']\/([^"']*)["']/i);
    if (internalHrefMatch) {
      const targetPath = decodeURIComponent(internalHrefMatch[1]);
      const cleanTargetPath = targetPath.endsWith("/")
        ? targetPath.slice(0, -1)
        : targetPath;
      if (cleanTargetPath === "" || cleanTargetPath.toLowerCase() === "index") {
        return match;
      }

      // Check if it links to a static asset (by checking file extension)
      const hasStaticExtension =
        /\.(png|jpe?g|gif|svg|ico|webp|pdf|zip|css|js)$/i.test(cleanTargetPath);
      if (hasStaticExtension) {
        return match;
      }

      const slugifiedTarget = slugifyPath(cleanTargetPath);
      const exists = allNotes.some((n) =>
        slugifyPath(n.path) === slugifiedTarget
      );

      if (!exists) {
        return `<span class="loju-ghost-link" title="👻">${innerText}</span>`;
      }
    }

    return match;
  });
}

export function getForwardLinks(note: Note, allNotes: Note[]): Note[] {
  const content = note.content;
  const links = new Set<string>();

  // 1. Match wikilinks [[Target]] or [[Target|Alias]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    const target = match[1].trim();
    const resolvedPath = resolveWikilink(target, allNotes);
    if (resolvedPath && slugifyPath(resolvedPath) !== slugifyPath(note.path)) {
      links.add(resolvedPath);
    }
  }

  // 2. Match standard markdown links like [text](/path)
  const markdownLinkRegex = /\[[^\]]*\]\(\/([^\)]+)\)/g;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const targetPath = decodeURIComponent(match[1].trim());
    const slugifiedPath = slugifyPath(targetPath);
    const targetNote = allNotes.find((n) =>
      slugifyPath(n.path) === slugifiedPath
    );
    if (targetNote && slugifyPath(targetNote.path) !== slugifyPath(note.path)) {
      links.add(targetNote.path);
    }
  }

  // Map paths back to Note objects
  return Array.from(links)
    .map((path) => allNotes.find((n) => n.path === path))
    .filter((n): n is Note => n !== undefined);
}

export function getBacklinks(note: Note, allNotes: Note[]): Note[] {
  const backlinks = new Set<Note>();
  const noteSlug = slugifyPath(note.path);

  for (const otherNote of allNotes) {
    if (slugifyPath(otherNote.path) === noteSlug) continue;

    const forwardLinks = getForwardLinks(otherNote, allNotes);
    if (forwardLinks.some((n) => slugifyPath(n.path) === noteSlug)) {
      backlinks.add(otherNote);
    }
  }

  return Array.from(backlinks);
}

export function getRelatedNotes(note: Note, allNotes: Note[]): Note[] {
  const forward = getForwardLinks(note, allNotes);
  const backward = getBacklinks(note, allNotes);

  const combined = new Map<string, Note>();
  for (const n of [...forward, ...backward]) {
    combined.set(slugifyPath(n.path), n);
  }

  const related = Array.from(combined.values());

  if (related.length >= 5) {
    return related;
  }

  // Sort notes by date to get recent notes
  const sortedRecent = [...allNotes]
    .filter((n) =>
      slugifyPath(n.path) !== slugifyPath(note.path) &&
      !combined.has(slugifyPath(n.path))
    )
    .sort((a, b) => {
      const dateA = a.frontmatter?.first_published || a.ctime || a.mtime;
      const dateB = b.frontmatter?.first_published || b.ctime || b.mtime;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const needed = 5 - related.length;
  const filled = sortedRecent.slice(0, needed);

  return [...related, ...filled];
}
