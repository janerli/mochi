import { Mascot } from "./Mascot";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { Workspace } from "../api";

export type View = "tasks" | "notes" | "calendar" | "focus";

interface Props {
  view: View;
  onChange: (view: View) => void;
  taskCount: number;
  noteCount: number;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
}

export function Sidebar({ view, onChange, taskCount, noteCount, workspaces, activeWorkspace }: Props) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark" />
        <div className="logo-word">
          mo<span>chi</span>
        </div>
      </div>

      <WorkspaceSwitcher workspaces={workspaces} activeWorkspace={activeWorkspace} />

      <nav className="primary-nav">
        <button
          className={`nav-item ${view === "tasks" ? "active" : ""}`}
          onClick={() => onChange("tasks")}
        >
          <span className="ico">🗂️</span>Задачи<span className="count">{taskCount}</span>
        </button>
        <button
          className={`nav-item ${view === "notes" ? "active" : ""}`}
          onClick={() => onChange("notes")}
        >
          <span className="ico">📝</span>Заметки<span className="count">{noteCount}</span>
        </button>
        <button
          className={`nav-item ${view === "calendar" ? "active" : ""}`}
          onClick={() => onChange("calendar")}
        >
          <span className="ico">📅</span>Календарь
        </button>
        <button className={`nav-item ${view === "focus" ? "active" : ""}`} onClick={() => onChange("focus")}>
          <span className="ico">🍡</span>Фокус-сессия
        </button>
      </nav>

      <div className="sidebar-spacer" />
      <Mascot />
    </aside>
  );
}
