import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  FsEntry,
  LinuxDiagnostics,
  WslStatus,
} from "../types";

export const api = {
  wsl: {
    list: () => invoke<WslStatus>("wsl_list"),
    version: () => invoke<string>("wsl_version"),
    home: (distro: string) => invoke<string>("wsl_home", { distro }),
    diagnostic: (distro: string, command: string[]) =>
      invoke<string>("wsl_diagnostic", { distro, command }),
  },
  pty: {
    create: (distro: string, cwd: string | null, cols: number, rows: number) =>
      invoke<string>("pty_create", { distro, cwd, cols, rows }),
    write: (id: string, data: string) =>
      invoke<void>("pty_write", { id, data }),
    resize: (id: string, cols: number, rows: number) =>
      invoke<void>("pty_resize", { id, cols, rows }),
    kill: (id: string) => invoke<void>("pty_kill", { id }),
    list: () => invoke<{ id: string; distro: string; cwd: string; alive: boolean }[]>("pty_list"),
    count: () => invoke<number>("pty_count"),
  },
  fs: {
    list: (root: string, path: string, showHidden: boolean) =>
      invoke<FsEntry[]>("fs_list", { root, path, showHidden }),
    mkdir: (root: string, path: string) =>
      invoke<void>("fs_mkdir", { root, path }),
    touch: (root: string, path: string) =>
      invoke<void>("fs_touch", { root, path }),
    rename: (root: string, path: string, newName: string) =>
      invoke<string>("fs_rename", { root, path, newName }),
    delete: (root: string, path: string) =>
      invoke<void>("fs_delete", { root, path }),
  },
  settings: {
    load: () => invoke<AppSettings>("settings_load"),
    save: (value: AppSettings) => invoke<void>("settings_save", { value }),
  },
};

export async function collectDiagnostics(
  distro: string
): Promise<LinuxDiagnostics> {
  const entries: [string, string[]][] = [
    ["uname", ["uname", "-a"]],
    ["osRelease", ["cat", "/etc/os-release"]],
    ["python3", ["python3", "--version"]],
    ["git", ["git", "--version"]],
    ["gcc", ["gcc", "--version"]],
  ];
  const errors: Record<string, string> = {};
  const values: Record<string, string | null> = {
    uname: null,
    osRelease: null,
    python3: null,
    git: null,
    gcc: null,
  };
  await Promise.all(
    entries.map(async ([key, command]) => {
      try {
        const out = await api.wsl.diagnostic(distro, command);
        values[key] = out || null;
      } catch (e) {
        errors[key] = String(e);
        values[key] = null;
      }
    })
  );
  return { ...values, errors } as LinuxDiagnostics;
}
