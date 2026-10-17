import { useEffect, useRef } from "react";
import { TitleBar } from "./components/layout/TitleBar";
import { ActivityBar } from "./components/layout/ActivityBar";
import { StatusBar } from "./components/layout/StatusBar";
import { TerminalPanel } from "./components/terminal/TerminalPanel";
import { ExplorerPanel } from "./components/explorer/ExplorerPanel";
import { EnvironmentPanel } from "./components/environment/EnvironmentPanel";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { CommandPalette } from "./components/overlay/CommandPalette";
import { Toasts } from "./components/overlay/Toasts";
import { useUi } from "./store/ui";
import { useSettings } from "./store/settings";
import { useTerminal } from "./store/terminal";
import { useEnvironment } from "./store/environment";

function Sidebar() {
  const { activeView, sidebarVisible, sidebarWidth } = useUi();
  if (!sidebarVisible) return null;

  return (
    <div
      className="h-full shrink-0 border-r border-[var(--color-border-subtle)] overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {activeView === "explorer" && <ExplorerPanel />}
      {activeView === "environments" && <EnvironmentPanel />}
      {activeView === "settings" && <SettingsPanel />}
      {activeView === "terminal" && <ExplorerPanel />}
    </div>
  );
}

function ResizeHandle() {
  const { sidebarVisible, setSidebarWidth, sidebarWidth } = useUi();
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setSidebarWidth(e.clientX - 44);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setSidebarWidth]);

  if (!sidebarVisible) return null;
  return (
    <div
      className="w-px shrink-0 cursor-col-resize bg-[var(--color-border)] hover:bg-[var(--color-brand)] transition-colors"
      onMouseDown={() => {
        dragging.current = true;
        document.body.style.cursor = "col-resize";
      }}
      style={{ width: 1 }}
      // keep measured width in sync during drag
      data-width={sidebarWidth}
    />
  );
}

export default function App() {
  const { activeView, toggleSidebar, setPaletteOpen, setSearchOpen } = useUi();
  const loadSettings = useSettings((s) => s.load);
  const refreshEnv = useEnvironment((s) => s.refresh);
  const cleanup = useTerminal((s) => s.cleanup);

  useEffect(() => {
    loadSettings();
    refreshEnv();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      // Ctrl+Shift+T — new terminal
      if (e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        useUi.getState().setActiveView("terminal");
        // Trigger new session via store
        const env = useEnvironment.getState();
        const d = env.selectedDistro ?? env.status?.defaultDistro ?? env.status?.distros?.[0]?.name;
        if (d) {
          useTerminal.getState().openSession(d, null, 80, 24).catch(() => {});
        }
      }
      // Ctrl+Shift+W — close terminal
      if (e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        useTerminal.getState().closeActive();
      }
      // Ctrl+B — toggle sidebar
      if (!e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+Shift+P — palette
      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      // Ctrl+F — search (only when terminal view active)
      if (!e.shiftKey && e.key.toLowerCase() === "f") {
        if (useUi.getState().activeView === "terminal") {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
      // Ctrl+, — settings
      if (e.key === ",") {
        e.preventDefault();
        useUi.getState().setActiveView("settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, setPaletteOpen, setSearchOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <ResizeHandle />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activeView === "terminal" && <TerminalPanel />}
            {activeView === "explorer" && (
              <div className="flex h-full">
                <div className="flex-1 min-w-0 bg-[var(--color-bg-panel)]" />
              </div>
            )}
            {activeView === "environments" && (
              <div className="h-full bg-[var(--color-bg-panel)]" />
            )}
            {activeView === "settings" && (
              <div className="h-full bg-[var(--color-bg-panel)]" />
            )}
          </div>
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      <Toasts />
    </div>
  );
}
