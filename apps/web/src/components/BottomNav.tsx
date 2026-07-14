import type { View } from "./Sidebar";

interface Props {
  view: View;
  onChange: (view: View) => void;
  taskCount: number;
  noteCount: number;
}

// Stands in for .primary-nav (inside the desktop Sidebar) below the mobile
// breakpoint — see styles.css .bottom-nav.
export function BottomNav({ view, onChange, taskCount, noteCount }: Props) {
  const items: { key: View; icon: string; label: string; count?: number }[] = [
    { key: "tasks", icon: "🗂️", label: "Задачи", count: taskCount },
    { key: "notes", icon: "📝", label: "Заметки", count: noteCount },
    { key: "calendar", icon: "📅", label: "Календарь" },
    { key: "focus", icon: "🍡", label: "Фокус" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.key}
          className={`bottom-nav-item ${view === item.key ? "active" : ""}`}
          onClick={() => onChange(item.key)}
        >
          <span className="ico">{item.icon}</span>
          <span>{item.label}</span>
          {!!item.count && <span className="count">{item.count}</span>}
        </button>
      ))}
    </nav>
  );
}
