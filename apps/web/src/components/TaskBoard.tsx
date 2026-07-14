import { useState } from "react";
import type { Task, TaskStatus } from "../api";
import { useUpdateTask } from "../api";
import { TaskCard } from "./TaskCard";
import { TaskEditor } from "./TaskEditor";
import { TagManagerModal } from "./TagManagerModal";
import { sparkleBurst } from "../sparkle";

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Надо сделать" },
  { status: "in_progress", title: "В процессе" },
  { status: "done", title: "Готово" },
];

export function TaskBoard({
  tasks,
  isLoading,
  workspaceId,
}: {
  tasks: Task[];
  isLoading: boolean;
  workspaceId: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [activeTag, setActiveTag] = useState<string | "all">("all");
  const [showTagManager, setShowTagManager] = useState(false);
  const updateTask = useUpdateTask();

  const editorOpen = showForm || editingTask !== null;
  function closeEditor() {
    setShowForm(false);
    setEditingTask(null);
  }

  const tags = Array.from(new Set(tasks.map((t) => t.tag).filter((t): t is string => !!t))).sort();
  const visibleTasks = activeTag === "all" ? tasks : tasks.filter((t) => t.tag === activeTag);

  return (
    <section className="view">
      <div className="view-head">
        <h2>Доска задач</h2>
        <div className="spacer-flex" />
        <button
          className="btn-primary"
          onClick={() => {
            setEditingTask(null);
            setShowForm((v) => !v);
          }}
        >
          ＋ Новая задача
        </button>
      </div>

      {tags.length > 0 && (
        <div className="view-head">
          <button className={`filter-chip ${activeTag === "all" ? "on" : ""}`} onClick={() => setActiveTag("all")}>
            Все
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              className={`filter-chip ${activeTag === tag ? "on" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
          <button className="filter-chip" onClick={() => setShowTagManager(true)}>
            ✎ теги
          </button>
        </div>
      )}

      {showTagManager && workspaceId && (
        <TagManagerModal workspaceId={workspaceId} onClose={() => setShowTagManager(false)} />
      )}

      {editorOpen && <TaskEditor task={editingTask ?? undefined} onDone={closeEditor} />}

      {isLoading ? (
        <p className="empty-hint">Загружаю задачи…</p>
      ) : (
        <div className="board" style={{ marginTop: editorOpen ? 18 : 0 }}>
          {COLUMNS.map((col) => {
            const items = visibleTasks.filter((t) => t.status === col.status);
            return (
              <div
                className={`column ${dragOverStatus === col.status ? "drag-over" : ""}`}
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(col.status);
                }}
                onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  const id = e.dataTransfer.getData("text/mochi-task-id");
                  const task = tasks.find((t) => t.id === id);
                  if (id && task && task.status !== col.status) {
                    if (col.status === "done") {
                      sparkleBurst(e.clientX, e.clientY, "#52d6a4");
                    }
                    updateTask.mutate({ id, status: col.status });
                  }
                }}
              >
                <div className="column-head">
                  <span className={`dot ${col.status}`} />
                  <h3>{col.title}</h3>
                  <span className="n">{items.length}</span>
                </div>
                {items.length === 0 && <p className="empty-hint">Пусто — перетащи сюда карточку</p>}
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => {
                      setShowForm(false);
                      setEditingTask(task);
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
