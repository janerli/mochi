import { useEffect, useRef, useState } from "react";
import type { Note, Task } from "../api";
import type { View } from "./Sidebar";

interface Props {
  tasks: Task[];
  notes: Note[];
  onNavigate: (view: View) => void;
}

const STATUS_LABEL: Record<Task["status"], string> = { todo: "надо", in_progress: "в работе", done: "готово" };

export function SearchBox({ tasks, notes, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const matchedTasks = q
    ? tasks.filter((t) => t.title.toLowerCase().includes(q) || t.tag?.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const matchedNotes = q
    ? notes
        .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
        .slice(0, 5)
    : [];
  const hasResults = matchedTasks.length > 0 || matchedNotes.length > 0;

  function select(view: View) {
    onNavigate(view);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="search-wrap" ref={rootRef}>
      <div className="search">
        🔍
        <input
          placeholder="Поиск задач и заметок…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && q && (
        <div className="search-dropdown">
          {!hasResults && <div className="search-empty">Ничего не нашлось по «{query}»</div>}

          {matchedTasks.length > 0 && (
            <div className="search-group">
              <div className="search-group-title">Задачи</div>
              {matchedTasks.map((t) => (
                <button key={t.id} className="search-result" onClick={() => select("tasks")}>
                  <span className="search-result-title">{t.title}</span>
                  <span className="search-result-meta">{STATUS_LABEL[t.status]}</span>
                </button>
              ))}
            </div>
          )}

          {matchedNotes.length > 0 && (
            <div className="search-group">
              <div className="search-group-title">Заметки</div>
              {matchedNotes.map((n) => (
                <button key={n.id} className="search-result" onClick={() => select("notes")}>
                  <span className="search-result-title">{n.title}</span>
                  <span className="search-result-meta">{n.kind === "big" ? "📄" : "🗒️"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
