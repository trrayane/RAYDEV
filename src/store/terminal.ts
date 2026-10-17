import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { api } from "../lib/api";
import type { PtyExitEvent, PtyOutputEvent, SessionStatus } from "../types";

export interface TermSession {
  id: string;
  distro: string;
  cwd: string;
  status: SessionStatus;
  exitCode: number | null;
  createdAt: number;
  title: string;
}

interface TerminalState {
  sessions: TermSession[];
  activeId: string | null;
  fullscreen: boolean;
  splitMode: "none" | "h" | "v";
  unlisteners: Map<string, UnlistenFn>;

  openSession: (distro: string, cwd: string | null, cols: number, rows: number) => Promise<string>;
  write: (id: string, data: string) => Promise<void>;
  resize: (id: string, cols: number, rows: number) => Promise<void>;
  kill: (id: string) => Promise<void>;
  restart: (id: string, cols: number, rows: number) => Promise<void>;
  setActive: (id: string) => void;
  closeActive: () => Promise<void>;
  setFullscreen: (v: boolean) => void;
  setSplitMode: (mode: "none" | "h" | "v") => void;
  cleanup: () => Promise<void>;
}

export const useTerminal = create<TerminalState>((set, get) => ({
  sessions: [],
  activeId: null,
  fullscreen: false,
  splitMode: "none",
  unlisteners: new Map(),

  openSession: async (distro, cwd, cols, rows) => {
    // Prevent duplicate rapid creates for same distro+cwd within 300ms
    const now = Date.now();
    const recent = get().sessions.filter(
      (s) => s.createdAt > now - 300 && s.distro === distro && s.cwd === (cwd ?? "~")
    );
    if (recent.length > 0) return recent[0].id;

    const id = await api.pty.create(distro, cwd, cols, rows);
    const short = distro.split(/[-\s]/)[0] || distro;
    const label = cwd && cwd !== "~" ? `${short}: ${cwd.split(/[\\/]/).filter(Boolean).pop()}` : short;

    const session: TermSession = {
      id,
      distro,
      cwd: cwd ?? "~",
      status: "starting",
      exitCode: null,
      createdAt: now,
      title: label,
    };

    // Subscribe to output/exit events
    const unOut = await listen<PtyOutputEvent>("raydev://pty-output", (e) => {
      if (e.payload.id === id) {
        window.dispatchEvent(
          new CustomEvent("raydev:pty-data", { detail: { id, data: e.payload.data } })
        );
      }
    });
    const unExit = await listen<PtyExitEvent>("raydev://pty-exit", (e) => {
      if (e.payload.id === id) {
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === id
              ? { ...s, status: "exited" as SessionStatus, exitCode: e.payload.code }
              : s
          ),
        }));
        window.dispatchEvent(
          new CustomEvent("raydev:pty-exit", { detail: { id, code: e.payload.code } })
        );
      }
    });

    const map = get().unlisteners;
    map.set(id + ":out", unOut);
    map.set(id + ":exit", unExit);

    set((st) => ({
      sessions: [...st.sessions, { ...session, status: "running" }],
      activeId: id,
    }));
    return id;
  },

  write: (id, data) => api.pty.write(id, data),
  resize: (id, cols, rows) => api.pty.resize(id, cols, rows),

  kill: async (id) => {
    await api.pty.kill(id).catch(() => {});
    const map = get().unlisteners;
    map.get(id + ":out")?.();
    map.get(id + ":exit")?.();
    map.delete(id + ":out");
    map.delete(id + ":exit");
    set((st) => {
      const sessions = st.sessions.filter((s) => s.id !== id);
      return {
        sessions,
        activeId: st.activeId === id ? (sessions[sessions.length - 1]?.id ?? null) : st.activeId,
      };
    });
  },

  restart: async (id, cols, rows) => {
    const old = get().sessions.find((s) => s.id === id);
    if (!old) return;
    await get().kill(id);
    await get().openSession(old.distro, old.cwd === "~" ? null : old.cwd, cols, rows);
  },

  setActive: (id) => set({ activeId: id }),

  closeActive: async () => {
    const id = get().activeId;
    if (id) await get().kill(id);
  },

  setFullscreen: (v) => set({ fullscreen: v }),
  setSplitMode: (mode) => set({ splitMode: mode }),

  cleanup: async () => {
    const ids = get().sessions.map((s) => s.id);
    await Promise.all(ids.map((id) => get().kill(id)));
  },
}));
