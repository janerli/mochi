import type { Task, TaskStatus } from "../api";
import { useDeleteTask, useUpdateTask } from "../api";
import { sparkleBurst } from "../sparkle";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Надо",
  in_progress: "В работе",
  done: "Готово",
};

const PRIORITY_ICON: Record<Task["priority"], string> = {
  low: "🌱",
  medium: "💗",
  high: "🔥",
};

const RECURRENCE_LABEL: Record<Task["recurrence"], string> = {
  none: "",
  daily: "🔁 каждый день",
  weekly: "🔁 каждую неделю",
  monthly: "🔁 каждый месяц",
};

function formatDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = isToday ? "сегодня" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return { label: `${day}, ${time}`, urgent: d.getTime() < today.getTime() };
}

function formatEstimate(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} мин`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} ч` : `${hours.toFixed(1)} ч`;
}

export function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const due = formatDue(task.dueDate);
  const estimate = formatEstimate(task.estimateMinutes);

  return (
    <div
      className={`card priority-${task.priority} ${task.status === "done" ? "is-done" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/mochi-task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="card-top">
        <span className="drag-handle" aria-hidden="true">
          ⠿
        </span>
        <div className="card-title">{task.title}</div>
        <span className="priority">{PRIORITY_ICON[task.priority]}</span>
      </div>

      {task.description && <p className="card-description">{task.description}</p>}

      {(task.tag || due || estimate || task.attachmentCount > 0) && (
        <div className="card-meta">
          {task.tag && <span className="tag">{task.tag}</span>}
          {estimate && <span className="tag estimate">⏱ {estimate}</span>}
          {task.reminderMinutesBefore != null && <span className="tag estimate">🔔</span>}
          {task.attachmentCount > 0 && <span className="tag estimate">📎 {task.attachmentCount}</span>}
          {due && <span className={`due ${due.urgent ? "urgent" : ""}`}>⏰ {due.label}</span>}
        </div>
      )}

      {task.recurrence !== "none" && <div className="recurrence-badge">{RECURRENCE_LABEL[task.recurrence]}</div>}

      <div className="move-row">
        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((status) => (
          <button
            key={status}
            className={`move-btn ${task.status === status ? "current" : ""}`}
            onClick={(e) => {
              if (status === "done" && task.status !== "done") {
                const rect = e.currentTarget.getBoundingClientRect();
                sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, "#52d6a4");
              }
              updateTask.mutate({ id: task.id, status });
            }}
          >
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <div className="card-foot-actions">
        <button className="note-edit" onClick={onEdit}>
          править
        </button>
        <button className="card-delete" onClick={() => deleteTask.mutate(task.id)}>
          удалить
        </button>
      </div>
    </div>
  );
}
