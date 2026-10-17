import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  FolderOpen,
  File as FileIcon,
  ChevronRight,
  RefreshCw,
  FolderPlus,
  FilePlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  SquareTerminal,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "../../lib/api";
import { useUi } from "../../store/ui";
import { useSettings } from "../../store/settings";
import { useTerminal } from "../../store/terminal";
import { useEnvironment } from "../../store/environment";
import { IconButton } from "../ui/IconButton";
import { ConfirmDialog } from "../overlay/Modal";
import { basename, joinPath } from "../../lib/path";

export function ExplorerPanel() {
  const {
    projectRoot,
    setProjectRoot,
    tree,
    expanded,
    toggleExpand,
    setTreeChildren,
    selectedPath,
    setSelectedPath,
    pushToast,
  } = useUi();
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const openSession = useTerminal((s) => s.openSession);
  const selectedDistro = useEnvironment((s) => s.selectedDistro);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshDir = useCallback(
    async (dir: string) => {
      if (!projectRoot) return;
      try {
        const entries = await api.fs.list(projectRoot, dir, settings.showHiddenFiles);
        setTreeChildren(dir, entries);
      } catch (e) {
        pushToast({ variant: "error", title: "Read failed", message: String(e) });
      }
    },
    [projectRoot, settings.showHiddenFiles, setTreeChildren, pushToast]
  );

  useEffect(() => {
    if (projectRoot) refreshDir(projectRoot);
  }, [projectRoot, refreshDir]);

  const openProject = async () => {
    const dir = await open({ directory: true, title: "Open project folder" });
    if (typeof dir === "string") {
      setProjectRoot(dir);
      useSettings.getState().addRecentProject(dir);
    }
  };

  const createEntry = async (isDir: boolean) => {
    if (!projectRoot || !selectedPath) return;
    const parent = selectedPath;
    const base = joinPath(parent, isDir ? "new_folder" : "new_file.txt");
    setBusy(true);
    try {
      if (isDir) await api.fs.mkdir(projectRoot, base);
      else await api.fs.touch(projectRoot, base);
      await refreshDir(parent);
    } catch (e) {
      pushToast({ variant: "error", title: "Create failed", message: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    if (!projectRoot || !renaming || !renameValue.trim()) return;
    try {
      const parent = joinPath(renaming, "..");
      await api.fs.rename(projectRoot, renaming, renameValue.trim());
      setRenaming(null);
      await refreshDir(parent);
    } catch (e) {
      pushToast({ variant: "error", title: "Rename failed", message: String(e) });
    }
  };

  const doDelete = async (path: string) => {
    if (!projectRoot) return;
    try {
      const parent = joinPath(path, "..");
      await api.fs.delete(projectRoot, path);
      await refreshDir(parent);
    } catch (e) {
      pushToast({ variant: "error", title: "Delete failed", message: String(e) });
    }
  };

  const openInTerminal = async (path: string) => {
    const distro = selectedDistro;
    if (!distro) {
      pushToast({ variant: "warning", title: "No distribution selected" });
      return;
    }
    try {
      await openSession(distro, path, 80, 24);
    } catch (e) {
      pushToast({ variant: "error", title: "Terminal failed", message: String(e) });
    }
  };

  const renderTree = (dir: string, depth: number) => {
    const entries = tree[dir] ?? [];
    if (entries.length === 0) return null;
    return (
      <div>
        {entries.map((entry) => {
          const isOpen = expanded.has(entry.path);
          const isSelected = selectedPath === entry.path;
          return (
            <div key={entry.path}>
              <div
                onClick={() => {
                  setSelectedPath(entry.path);
                  if (entry.isDir && !isOpen) {
                    toggleExpand(entry.path);
                    refreshDir(entry.path);
                  } else if (entry.isDir && isOpen) {
                    toggleExpand(entry.path);
                  }
                }}
                className={`flex items-center gap-1.5 h-6 pr-2 text-[12px] cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                }`}
                style={{ paddingLeft: 8 + depth * 14 }}
              >
                {entry.isDir ? (
                  <ChevronRight
                    size={12}
                    className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                {entry.isDir ? (
                  isOpen ? (
                    <FolderOpen size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                  ) : (
                    <Folder size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                  )
                ) : (
                  <FileIcon size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                )}
                {renaming === entry.path ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={doRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") doRename();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 h-5 px-1 bg-[var(--color-bg-base)] border border-[var(--color-brand)] rounded-[var(--radius-xs)] text-[11px] font-mono outline-none"
                  />
                ) : (
                  <span className="truncate flex-1">{entry.name}</span>
                )}
                {isSelected && !renaming && (
                  <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100">
                    {entry.isDir && (
                      <IconButton
                        size="sm"
                        title="Open in terminal"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInTerminal(entry.path);
                        }}
                      >
                        <SquareTerminal size={12} />
                      </IconButton>
                    )}
                    <IconButton
                      size="sm"
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming(entry.path);
                        setRenameValue(entry.name);
                      }}
                    >
                      <Pencil size={12} />
                    </IconButton>
                    <IconButton
                      size="sm"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(entry.path);
                      }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </span>
                )}
              </div>
              {entry.isDir && isOpen && renderTree(entry.path, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)]">
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--color-border-subtle)] shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            title={settings.showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
            onClick={() => updateSettings({ showHiddenFiles: !settings.showHiddenFiles })}
          >
            {settings.showHiddenFiles ? <Eye size={13} /> : <EyeOff size={13} />}
          </IconButton>
          <IconButton size="sm" title="New folder" onClick={() => createEntry(true)} disabled={!projectRoot || busy}>
            <FolderPlus size={13} />
          </IconButton>
          <IconButton size="sm" title="New file" onClick={() => createEntry(false)} disabled={!projectRoot || busy}>
            <FilePlus size={13} />
          </IconButton>
          <IconButton
            size="sm"
            title="Refresh"
            onClick={() => projectRoot && refreshDir(projectRoot)}
            disabled={!projectRoot}
          >
            <RefreshCw size={13} />
          </IconButton>
        </div>
      </div>

      {projectRoot ? (
        <div className="flex-1 overflow-auto py-1">
          <div
            className="flex items-center gap-1.5 h-6 px-2 text-[11px] font-mono text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)]"
            onClick={() => refreshDir(projectRoot)}
            title={projectRoot}
          >
            <FolderOpen size={13} className="shrink-0" />
            <span className="truncate">{basename(projectRoot)}</span>
          </div>
          {renderTree(projectRoot, 0)}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <FolderOpen size={32} className="text-[var(--color-text-muted)]" strokeWidth={1.2} />
          <p className="text-[12px] text-[var(--color-text-muted)]">
            No project open.
            <br />
            Prefer Linux-native projects under <code className="text-[var(--color-code)]">/home/&lt;user&gt;/projects</code>
            <br />
            for the best WSL performance.
          </p>
          <button
            onClick={openProject}
            className="px-3 h-7 text-[12px] font-medium rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
          >
            Open Folder…
          </button>
          {settings.recentProjects.length > 0 && (
            <div className="w-full mt-2">
              <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-muted)] mb-1">
                Recent
              </p>
              {settings.recentProjects.map((p) => (
                <button
                  key={p}
                  onClick={() => setProjectRoot(p)}
                  className="block w-full text-left px-2 py-1 text-[11px] font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded truncate cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete permanently?"
        message={`This will permanently delete ${confirmDelete ? basename(confirmDelete) : ""}. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
