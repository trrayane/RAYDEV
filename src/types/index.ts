export interface WslDistro {
  name: string;
  state: "Running" | "Stopped" | "Installing" | "Uninstalling" | "ConversionInProgress" | "Unknown";
  version: number;
  isDefault: boolean;
}

export interface WslStatus {
  installed: boolean;
  defaultDistro: string | null;
  defaultVersion: number | null;
  distros: WslDistro[];
  error?: string;
}

export type SessionStatus = "starting" | "running" | "exited" | "error";

export interface TerminalSession {
  id: string;
  distro: string;
  cwd: string;
  status: SessionStatus;
  exitCode: number | null;
  createdAt: number;
  title: string;
}

export interface PtyOutputEvent {
  id: string;
  data: string;
}

export interface PtyExitEvent {
  id: string;
  code: number | null;
}

export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  isHidden: boolean;
}

export interface LinuxDiagnostics {
  uname: string | null;
  osRelease: string | null;
  python3: string | null;
  git: string | null;
  gcc: string | null;
  errors: Record<string, string>;
}

export type ThemeMode = "dark" | "light" | "system";

export interface AppSettings {
  theme: ThemeMode;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  scrollback: number;
  defaultDistro: string | null;
  defaultProjectDir: string | null;
  restoreLastSession: boolean;
  confirmDestructive: boolean;
  monitoringEnabled: boolean;
  monitoringIntervalMs: number;
  showHiddenFiles: boolean;
  recentProjects: string[];
}

export type ViewId = "explorer" | "terminal" | "environments" | "settings";

export interface Toast {
  id: string;
  variant: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
}
