import { FolderTree, Terminal, Boxes, Settings } from "lucide-react";
import { useUi } from "../../store/ui";
import type { ViewId } from "../../types";

const items: { id: ViewId; icon: typeof FolderTree; label: string }[] = [
  { id: "explorer", icon: FolderTree, label: "Explorer" },
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "environments", icon: Boxes, label: "Environments" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar() {
  const { activeView, setActiveView, sidebarVisible } = useUi();

  return (
    <div className="flex flex-col items-center gap-2 w-11 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-subtle)] py-2 shrink-0">
      {items.map(({ id, icon: Icon, label }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            title={label}
            onClick={() => setActiveView(id)}
            className={`relative w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-100 cursor-pointer ${
              active
                ? "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
            }`}
          >
            {active && sidebarVisible && (
              <span className="absolute left-[-8px] top-1 bottom-1 w-0.5 bg-[var(--color-brand)] rounded-full" />
            )}
            <Icon size={18} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}
