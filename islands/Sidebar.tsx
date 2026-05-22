import { useState } from "preact/hooks";
import type { Note } from "../routes/notes/index.tsx";

interface TreeFolder {
  name: string;
  type: "folder";
  path: string; // full path to this folder (e.g., "nested/folder")
  children: (TreeFolder | TreeNote)[];
}

interface TreeNote {
  name: string;
  type: "note";
  path: string;
  title: string;
}

type TreeNode = TreeFolder | TreeNote;

function buildTree(notes: Note[]): TreeFolder {
  const root: TreeFolder = {
    name: "Root",
    type: "folder",
    path: "",
    children: [],
  };

  for (const note of notes) {
    const parts = note.path.split("/");
    let currentFolder = root;
    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let existing = currentFolder.children.find(
        (c) => c.type === "folder" && c.name === folderName,
      ) as TreeFolder;

      if (!existing) {
        existing = {
          name: folderName,
          type: "folder",
          path: currentPath,
          children: [],
        };
        currentFolder.children.push(existing);
      }
      currentFolder = existing;
    }

    const noteName = parts[parts.length - 1];
    currentFolder.children.push({
      name: noteName,
      type: "note",
      path: note.path,
      title: note.title,
    });
  }

  function sortTree(folder: TreeFolder) {
    folder.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const child of folder.children) {
      if (child.type === "folder") {
        sortTree(child);
      }
    }
  }

  sortTree(root);
  return root;
}

export default function Sidebar(
  { notes, currentPath }: { notes: Note[]; currentPath?: string },
) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate initial expanded folders based on currentPath
  const initialExpanded: Record<string, boolean> = {};
  if (currentPath) {
    const parts = currentPath.split("/");
    let pathAcc = "";
    for (let i = 0; i < parts.length - 1; i++) {
      pathAcc = pathAcc ? `${pathAcc}/${parts[i]}` : parts[i];
      initialExpanded[pathAcc] = true;
    }
  }

  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >(initialExpanded);

  const tree = buildTree(notes);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const renderNode = (node: TreeNode) => {
    if (node.type === "folder") {
      const isExpanded = !!expandedFolders[node.path];
      return (
        <li key={node.path} class="pl-3">
          <div
            onClick={() => toggleFolder(node.path)}
            class="flex items-center gap-1.5 py-1 text-xs text-[#555] hover:text-white cursor-pointer select-none font-mono uppercase tracking-wider"
          >
            <span class="text-[9px] transform transition-transform duration-200">
              {isExpanded ? "▼" : "▶"}
            </span>
            <span>{node.name}</span>
          </div>
          {isExpanded && (
            <ul class="border-l border-[#222] ml-1.5 mt-0.5 space-y-0.5">
              {node.children.map(renderNode)}
            </ul>
          )}
        </li>
      );
    } else {
      const isActive = node.path === currentPath;
      return (
        <li key={node.path} class="pl-5">
          <a
            href={`/${node.path}`}
            class={`block py-1 text-xs transition-colors font-mono truncate ${
              isActive
                ? "text-[#58a6ff] font-bold"
                : "text-[#888] hover:text-white"
            }`}
          >
            {node.title}
          </a>
        </li>
      );
    }
  };

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        class="fixed bottom-6 right-6 z-[100] flex h-10 w-10 items-center justify-center border border-[#333] bg-black text-[#888] hover:text-white hover:border-white transition-all duration-200 shadow-lg font-mono text-xs select-none"
        title="Toggle Sidebar"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          class="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        class={`fixed top-0 bottom-0 left-0 z-40 w-[260px] border-r border-[#222] bg-[#050505] p-6 pt-24 overflow-y-auto transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div class="mb-8">
          <h2 class="text-[10px] uppercase tracking-[0.3em] text-[#444] font-bold mb-4 font-mono">
            Navigation
          </h2>
          <a
            href="/notes"
            class={`block text-xs font-mono mb-2 ${
              !currentPath
                ? "text-[#58a6ff] font-bold"
                : "text-[#888] hover:text-white"
            }`}
          >
            [INDEX]
          </a>
          <a
            href="/"
            class="block text-xs font-mono text-[#888] hover:text-white"
          >
            [HOME]
          </a>
        </div>

        <div>
          <h2 class="text-[10px] uppercase tracking-[0.3em] text-[#444] font-bold mb-4 font-mono">
            Notes Directory
          </h2>
          {tree.children.length === 0
            ? <div class="text-[10px] text-[#555] italic">[EMPTY]</div>
            : (
              <ul class="space-y-1.5 -ml-3">
                {tree.children.map(renderNode)}
              </ul>
            )}
        </div>
      </aside>

      {/* Layout padding adjustment for wide screens (when sidebar is present) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 768px) {
              body {
                padding-left: 260px;
              }
            }
          `,
        }}
      />
    </>
  );
}
