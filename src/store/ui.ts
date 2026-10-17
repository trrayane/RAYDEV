import { create } from "zustand";
import type { FsEntry, Toast, ViewId } from "../types";

interface UiState {
  activeView: ViewId;
  sidebarVisible: boolean;
  sidebarWidth: number;
  projectRoot: string | null;
  tree: Record<string, FsEntry[]>;
  expanded: Set<string>;
  selectedPath: string | null;
  toasts: Toast[];
  paletteOpen: boolean;
  searchOpen: boolean;

  setActiveView: (v: ViewId) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  setProjectRoot: (root: string | null) => void;
  setTreeChildren: (parent: string, entries: FsEntry[]) => void;
  toggleExpand: (path: string) => void;
  setSelectedPath: (p: string | null) => void;
  clearTree: () => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setPaletteOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  activeView: "terminal",
  sidebarVisible: true,
  sidebarWidth: 260,
  projectRoot: null,
  tree: {},
  expanded: new Set<string>(),
  selectedPath: null,
  toasts: [],
  paletteOpen: false,
  searchOpen: false,

  setActiveView: (v) =>
    set((st) => ({ activeView: v, sidebarVisible: st.sidebarVisible || true })),
  toggleSidebar: () => set((st) => ({ sidebarVisible: !st.sidebarVisible })),
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(500, w)) }),
  setProjectRoot: (root) =>
    set({ projectRoot: root, tree: {}, expanded: new Set(root ? [root] : []) }),
  setTreeChildren: (parent, entries) =>
    set((st) => ({ tree: { ...st.tree, [parent]: entries } })),
  toggleExpand: (path) =>
    set((st) => {
      const next = new Set(st.expanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expanded: next };
    }),
  setSelectedPath: (p) => set({ selectedPath: p }),
  clearTree: () => set({ tree: {}, expanded: new Set(), selectedPath: null }),
  pushToast: (t) => {
    const id = crypto.randomUUID();
    set((st) => ({ toasts: [...st.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) }));
    }, 4500);
  },
  dismissToast: (id) =>
    set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })),
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
}));
