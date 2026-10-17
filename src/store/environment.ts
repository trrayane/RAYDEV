import { create } from "zustand";
import { api } from "../lib/api";
import type { LinuxDiagnostics, WslDistro, WslStatus } from "../types";

interface EnvironmentState {
  status: WslStatus | null;
  loading: boolean;
  error: string | null;
  selectedDistro: string | null;
  diagnostics: Record<string, LinuxDiagnostics>;
  diagLoading: string | null;

  refresh: () => Promise<void>;
  selectDistro: (name: string) => void;
  runDiagnostics: (distro: string) => Promise<void>;
}

export const useEnvironment = create<EnvironmentState>((set, get) => ({
  status: null,
  loading: false,
  error: null,
  selectedDistro: null,
  diagnostics: {},
  diagLoading: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.wsl.list();
      const sel = get().selectedDistro;
      const stillExists = status.distros.some((d) => d.name === sel);
      set({
        status,
        loading: false,
        selectedDistro: stillExists
          ? sel
          : (status.defaultDistro ?? status.distros[0]?.name ?? null),
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  selectDistro: (name) => set({ selectedDistro: name }),

  runDiagnostics: async (distro) => {
    set({ diagLoading: distro });
    try {
      const { collectDiagnostics } = await import("../lib/api");
      const result = await collectDiagnostics(distro);
      set((st) => ({
        diagnostics: { ...st.diagnostics, [distro]: result },
        diagLoading: null,
      }));
    } catch (e) {
      set({ diagLoading: null, error: String(e) });
    }
  },
}));

export function distroStateClass(state: string): string {
  switch (state.toLowerCase()) {
    case "running":
      return "bg-[var(--status-running-bg)] text-[var(--status-running-text)] border-[var(--status-running-border)]";
    case "stopped":
      return "bg-[var(--status-stopped-bg)] text-[var(--status-stopped-text)] border-[var(--status-stopped-border)]";
    default:
      return "bg-[var(--status-idle-bg)] text-[var(--status-idle-text)] border-[var(--status-idle-border)]";
  }
}

export type { WslDistro };
