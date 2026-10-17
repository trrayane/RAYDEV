import { create } from "zustand";
import { api } from "../lib/api";
import type { AppSettings, ThemeMode } from "../types";

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => void;
  save: () => Promise<void>;
  reset: () => void;
  setTheme: (theme: ThemeMode) => void;
  addRecentProject: (path: string) => void;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontSize: 13,
  lineHeight: 1.4,
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 5000,
  defaultDistro: null,
  defaultProjectDir: null,
  restoreLastSession: false,
  confirmDestructive: true,
  monitoringEnabled: false,
  monitoringIntervalMs: 5000,
  showHiddenFiles: false,
  recentProjects: [],
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,
  loaded: false,
  load: async () => {
    try {
      const s = await api.settings.load();
      set({ settings: { ...DEFAULTS, ...s }, loaded: true });
      applyTheme(s.theme ?? "dark");
    } catch {
      set({ loaded: true });
    }
  },
  update: (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    if (partial.theme) applyTheme(partial.theme);
    api.settings.save(next).catch(() => {});
  },
  save: async () => {
    await api.settings.save(get().settings).catch(() => {});
  },
  reset: () => {
    set({ settings: DEFAULTS });
    applyTheme("dark");
    api.settings.save(DEFAULTS).catch(() => {});
  },
  setTheme: (theme) => get().update({ theme }),
  addRecentProject: (path) => {
    const recent = [path, ...get().settings.recentProjects.filter((p) => p !== path)].slice(0, 10);
    get().update({ recentProjects: recent });
  },
}));

function applyTheme(mode: ThemeMode) {
  let resolved: "dark" | "light" = "dark";
  if (mode === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } else {
    resolved = mode;
  }
  document.documentElement.setAttribute("data-theme", resolved);
}

window
  .matchMedia("(prefers-color-scheme: light)")
  .addEventListener("change", () => {
    const mode = useSettings.getState().settings.theme;
    if (mode === "system") applyTheme("system");
  });
