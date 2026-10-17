import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { useTerminal } from "../../store/terminal";
import { useSettings } from "../../store/settings";

function b64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function b64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function TerminalView({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const { write, resize } = useTerminal();
  const settings = useSettings((s) => s.settings);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle as "block" | "underline" | "bar",
      scrollback: settings.scrollback,
      allowProposedApi: true,
      convertEol: false,
      theme: {
        background: getComputedStyle(document.documentElement)
          .getPropertyValue("--terminal-bg")
          .trim() || "#0a0a0a",
        foreground: getComputedStyle(document.documentElement)
          .getPropertyValue("--terminal-text")
          .trim() || "#00ff41",
        cursor: getComputedStyle(document.documentElement)
          .getPropertyValue("--terminal-cursor")
          .trim() || "#e8002d",
        cursorAccent: "#0a0a0a",
        selectionBackground: "rgba(232, 0, 45, 0.3)",
        black: "#0d0d0d",
        red: "#ff1744",
        green: "#00e676",
        yellow: "#ffb300",
        blue: "#40c4ff",
        magenta: "#e040fb",
        cyan: "#4ec9b0",
        white: "#f0f0f0",
        brightBlack: "#606060",
        brightRed: "#ff5252",
        brightGreen: "#69f0ae",
        brightYellow: "#ffd740",
        brightBlue: "#80d8ff",
        brightMagenta: "#e879f9",
        brightCyan: "#80cbc4",
        brightWhite: "#ffffff",
      },
    });

    const fit = new FitAddon();
    const links = new WebLinksAddon();
    const search = new SearchAddon();
    const unicode = new Unicode11Addon();

    term.loadAddon(fit);
    term.loadAddon(links);
    term.loadAddon(search);
    term.loadAddon(unicode);
    term.unicode.activeVersion = "11";

    term.open(container);
    termRef.current = term;
    fitRef.current = fit;
    searchRef.current = search;

    // Force keyboard focus into the xterm textarea (critical in WebView2)
    setTimeout(() => term.focus(), 0);

    // Click anywhere in the host refocuses the terminal
    const onFocusClick = () => term.focus();
    container.addEventListener("mousedown", onFocusClick);

    try {
      fit.fit();
    } catch {
      /* container may be 0-sized */
    }

    // Input → backend
    term.onData((data) => {
      write(sessionId, b64Encode(data));
    });

    // Resize → backend
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
        resize(sessionId, term.cols, term.rows);
      } catch {
        /* ignore */
      }
    });
    observer.observe(container);

    // Backend output → terminal
    const onPtyData = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; data: string };
      if (detail.id === sessionId) {
        term.write(b64Decode(detail.data));
      }
    };
    const onPtyExit = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; code: number | null };
      if (detail.id === sessionId) {
        term.write(
          `\r\n\x1b[90m[process exited with code ${detail.code ?? "?"}]\x1b[0m\r\n`
        );
      }
    };
    window.addEventListener("raydev:pty-data", onPtyData);
    window.addEventListener("raydev:pty-exit", onPtyExit);

    // Initial resize sync + Ctrl+L to force bash to redraw the prompt.
    // The PTY reader thread starts emitting the moment the session is
    // created in the store; by the time this component mounts and
    // registers listeners, the first prompt bytes may have been missed.
    // Ctrl+L (form feed) makes bash repaint cleanly.
    const t = setTimeout(() => {
      try {
        resize(sessionId, term.cols, term.rows);
      } catch {
        /* ignore */
      }
      write(sessionId, b64Encode("\x0c"));
      term.focus();
    }, 150);

    return () => {
      clearTimeout(t);
      observer.disconnect();
      container.removeEventListener("mousedown", onFocusClick);
      window.removeEventListener("raydev:pty-data", onPtyData);
      window.removeEventListener("raydev:pty-exit", onPtyExit);
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Live-update settings on open terminals
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontFamily = settings.fontFamily;
    term.options.fontSize = settings.fontSize;
    term.options.lineHeight = settings.lineHeight;
    term.options.cursorBlink = settings.cursorBlink;
    term.options.cursorStyle = settings.cursorStyle as "block" | "underline" | "bar";
    term.options.scrollback = settings.scrollback;
    try {
      fitRef.current?.fit();
      resize(sessionId, term.cols, term.rows);
    } catch {
      /* ignore */
    }
  }, [
    settings.fontFamily,
    settings.fontSize,
    settings.lineHeight,
    settings.cursorBlink,
    settings.cursorStyle,
    settings.scrollback,
    sessionId,
    resize,
  ]);

  return (
    <div
      ref={containerRef}
      className="terminal-host h-full w-full bg-[var(--terminal-bg)]"
    />
  );
}

export function useSearchAddon() {
  return null;
}

export { SearchAddon };
