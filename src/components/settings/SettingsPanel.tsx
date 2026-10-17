import { RotateCcw } from "lucide-react";
import { useSettings } from "../../store/settings";
import { useEnvironment } from "../../store/environment";
import { Toggle } from "../ui/Toggle";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { ThemeMode } from "../../types";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
      <div>
        <div className="text-[12px] text-[var(--color-text-primary)]">{label}</div>
        {hint && <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)] mb-1">
        {title}
      </h3>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4">
        {children}
      </div>
    </section>
  );
}

export function SettingsPanel() {
  const { settings, update, reset } = useSettings();
  const { status } = useEnvironment();

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)] overflow-auto">
      <div className="flex items-center justify-between h-9 px-4 border-b border-[var(--color-border-subtle)] shrink-0 sticky top-0 bg-[var(--color-bg-panel)] z-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Settings
        </span>
        <Button size="xs" variant="ghost" icon={<RotateCcw size={12} />} onClick={reset}>
          Reset to defaults
        </Button>
      </div>

      <div className="p-4 max-w-[640px]">
        <Section title="Appearance">
          <Row label="Theme">
            <div className="flex gap-1">
              {(["dark", "light", "system"] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={`px-2 h-6 text-[11px] rounded-[var(--radius-sm)] border capitalize cursor-pointer transition-colors ${
                    settings.theme === t
                      ? "bg-[var(--color-brand-muted)] border-[var(--color-brand)] text-[var(--color-brand)]"
                      : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Terminal">
          <Row label="Font family">
            <Input
              value={settings.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-[280px]"
            />
          </Row>
          <Row label="Font size" hint={`${settings.fontSize}px`}>
            <input
              type="range"
              min={9}
              max={24}
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-32 accent-[var(--color-brand)]"
            />
          </Row>
          <Row label="Line height" hint={settings.lineHeight.toFixed(1)}>
            <input
              type="range"
              min={1}
              max={2.2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => update({ lineHeight: Number(e.target.value) })}
              className="w-32 accent-[var(--color-brand)]"
            />
          </Row>
          <Row label="Cursor style">
            <div className="flex gap-1">
              {(["block", "underline", "bar"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => update({ cursorStyle: c })}
                  className={`px-2 h-6 text-[11px] rounded-[var(--radius-sm)] border capitalize cursor-pointer transition-colors ${
                    settings.cursorStyle === c
                      ? "bg-[var(--color-brand-muted)] border-[var(--color-brand)] text-[var(--color-brand)]"
                      : "bg-[var(--color-bg-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Cursor blink">
            <Toggle checked={settings.cursorBlink} onChange={(v) => update({ cursorBlink: v })} />
          </Row>
          <Row label="Scrollback lines" hint={String(settings.scrollback)}>
            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={settings.scrollback}
              onChange={(e) => update({ scrollback: Number(e.target.value) })}
              className="w-32 accent-[var(--color-brand)]"
            />
          </Row>
        </Section>

        <Section title="Environment">
          <Row label="Default distribution">
            <select
              value={settings.defaultDistro ?? ""}
              onChange={(e) => update({ defaultDistro: e.target.value || null })}
              className="h-7 px-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-sm)] font-mono text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">(auto — WSL default)</option>
              {status?.distros.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Default project directory" hint="Used when opening a new project">
            <Input
              value={settings.defaultProjectDir ?? ""}
              placeholder="/home/you/projects"
              onChange={(e) => update({ defaultProjectDir: e.target.value || null })}
              className="w-[280px]"
            />
          </Row>
        </Section>

        <Section title="Behavior">
          <Row label="Confirm destructive actions" hint="Kill sessions, delete files">
            <Toggle checked={settings.confirmDestructive} onChange={(v) => update({ confirmDestructive: v })} />
          </Row>
          <Row label="Show hidden files in explorer">
            <Toggle checked={settings.showHiddenFiles} onChange={(v) => update({ showHiddenFiles: v })} />
          </Row>
          <Row label="Resource monitoring" hint="Lightweight sampling; disabled by default">
            <Toggle checked={settings.monitoringEnabled} onChange={(v) => update({ monitoringEnabled: v })} />
          </Row>
        </Section>

        <Section title="Keyboard shortcuts">
          <div className="py-2 space-y-1.5 text-[12px] font-mono">
            {[
              ["New terminal", "Ctrl+Shift+T"],
              ["Close active terminal", "Ctrl+Shift+W"],
              ["Toggle sidebar", "Ctrl+B"],
              ["Command palette", "Ctrl+Shift+P"],
              ["Search terminal", "Ctrl+F"],
              ["Open settings", "Ctrl+,"],
            ].map(([action, key]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">{action}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-xs)] text-[var(--color-text-muted)]">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
