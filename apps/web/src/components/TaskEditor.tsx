import { useState } from "react";
import { useCreateTask, useUpdateTask, type Task, type TaskPriority, type TaskRecurrence } from "../api";
import { AttachmentList } from "./AttachmentList";

const ESTIMATE_PRESETS = [
  { label: "без оценки", value: "" },
  { label: "15 мин", value: "15" },
  { label: "30 мин", value: "30" },
  { label: "1 ч", value: "60" },
  { label: "2 ч", value: "120" },
  { label: "полдня", value: "240" },
];

const REMINDER_PRESETS = [
  { label: "без напоминания", value: "" },
  { label: "в момент дедлайна", value: "0" },
  { label: "за 15 мин", value: "15" },
  { label: "за 30 мин", value: "30" },
  { label: "за 1 час", value: "60" },
  { label: "за 1 день", value: "1440" },
];

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskEditor({ task, onDone }: { task?: Task; onDone: () => void }) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [tag, setTag] = useState(task?.tag ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDateTime, setDueDateTime] = useState(toLocalInputValue(task?.dueDate ?? null));
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task?.recurrence ?? "none");
  const [estimateMinutes, setEstimateMinutes] = useState(task?.estimateMinutes ? String(task.estimateMinutes) : "");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(
    task?.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      description: description.trim() || null,
      tag: tag.trim() || null,
      priority,
      dueDate: dueDateTime ? new Date(dueDateTime).toISOString() : null,
      recurrence,
      estimateMinutes: estimateMinutes ? Number(estimateMinutes) : null,
      reminderMinutesBefore: reminderMinutesBefore ? Number(reminderMinutesBefore) : null,
    };
    if (task) {
      updateTask.mutate({ id: task.id, ...data }, { onSuccess: onDone });
    } else {
      createTask.mutate(data, { onSuccess: onDone });
    }
  }

  return (
    <form className="new-form" onSubmit={submit}>
      <input autoFocus placeholder="Что нужно сделать?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        placeholder="Описание (необязательно)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="row">
        <input placeholder="Тег (необязательно)" value={tag} onChange={(e) => setTag(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">🌱 низкий</option>
          <option value="medium">💗 средний</option>
          <option value="high">🔥 высокий</option>
        </select>
      </div>
      <div className="row">
        <label className="field-label">
          Дедлайн
          <input type="datetime-local" value={dueDateTime} onChange={(e) => setDueDateTime(e.target.value)} />
        </label>
        <label className="field-label">
          Оценка времени
          <select value={estimateMinutes} onChange={(e) => setEstimateMinutes(e.target.value)}>
            {ESTIMATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Повтор
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}>
            <option value="none">не повторять</option>
            <option value="daily">каждый день</option>
            <option value="weekly">каждую неделю</option>
            <option value="monthly">каждый месяц</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="field-label">
          🔔 Напомнить
          <select
            value={reminderMinutesBefore}
            onChange={(e) => setReminderMinutesBefore(e.target.value)}
            disabled={!dueDateTime}
          >
            {REMINDER_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {!dueDateTime && <p className="empty-hint" style={{ padding: "0 0 0 4px", flex: 2 }}>сначала укажи дедлайн</p>}
      </div>
      <label className="field-label">
        Вложения
        <AttachmentList taskId={task?.id ?? null} />
      </label>

      <div className="row">
        <button type="submit" className="btn-primary" disabled={!title.trim()}>
          {task ? "Сохранить" : "＋ Добавить"}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  );
}
