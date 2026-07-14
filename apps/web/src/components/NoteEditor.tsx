import { useEffect, useRef, useState } from "react";
import { useCreateNote, useUpdateNote, type Note, type NoteColor, type NoteGroup, type NoteKind, type Task } from "../api";

const COLORS: { value: NoteColor; label: string }[] = [
  { value: "pink", label: "розовый" },
  { value: "mint", label: "мятный" },
  { value: "lavender", label: "лавандовый" },
  { value: "butter", label: "жёлтый" },
];

interface ToolbarAction {
  label: string;
  apply: (value: string, start: number, end: number) => { value: string; cursor: number };
}

function wrapSelection(marker: string): ToolbarAction["apply"] {
  return (value, start, end) => {
    const selected = value.slice(start, end) || "текст";
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    return { value: next, cursor: start + marker.length + selected.length + marker.length };
  };
}

function prefixLine(prefix: string): ToolbarAction["apply"] {
  return (value, start, end) => {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    return { value: next, cursor: end + prefix.length };
  };
}

const TOOLBAR: { icon: string; title: string; action: ToolbarAction["apply"] }[] = [
  { icon: "B", title: "Жирный", action: wrapSelection("**") },
  { icon: "i", title: "Курсив", action: wrapSelection("*") },
  { icon: "H", title: "Заголовок", action: prefixLine("## ") },
  { icon: "•", title: "Список", action: prefixLine("- ") },
  { icon: "☑", title: "Чек-лист", action: prefixLine("- [ ] ") },
];

interface Props {
  note?: Note;
  kind?: NoteKind;
  tasks: Task[];
  groups: NoteGroup[];
  onDone: () => void;
}

export function NoteEditor({ note, kind = "quick", tasks, groups, onDone }: Props) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const big = (note?.kind ?? kind) === "big";

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState<NoteColor>(note?.color ?? "pink");
  const [taskId, setTaskId] = useState(note?.taskId ?? "");
  const [groupId, setGroupId] = useState(note?.groupId ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  useEffect(() => {
    if (!big) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big, onDone]);

  function applyToolbar(action: ToolbarAction["apply"]) {
    const el = textareaRef.current;
    if (!el) return;
    const { value, cursor } = action(content, el.selectionStart, el.selectionEnd);
    setContent(value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      content,
      color: big ? (note?.color ?? "pink") : color,
      taskId: taskId || null,
      groupId: groupId || null,
      pinned,
    };
    if (note) {
      updateNote.mutate({ id: note.id, ...data }, { onSuccess: onDone });
    } else {
      createNote.mutate({ ...data, kind }, { onSuccess: onDone });
    }
  }

  const orgFields = (
    <>
      <div className="row">
        {!big && (
          <select value={color} onChange={(e) => setColor(e.target.value as NoteColor)}>
            {COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">без группы</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">без привязки к задаче</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              → {t.title}
            </option>
          ))}
        </select>
      </div>

      <label className="pin-check">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        📌 закрепить
      </label>
    </>
  );

  if (big) {
    return (
      <div className="note-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onDone()}>
        <form className="note-modal" onSubmit={submit}>
          <div className="note-modal-head">
            <input
              autoFocus
              className="note-modal-title"
              placeholder="Заголовок"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button type="button" className="note-modal-close" onClick={onDone} aria-label="Закрыть">
              ✕
            </button>
          </div>

          <div className="md-toolbar">
            {TOOLBAR.map((t) => (
              <button key={t.title} type="button" title={t.title} onClick={() => applyToolbar(t.action)}>
                {t.icon}
              </button>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="note-modal-textarea"
            placeholder="Пиши здесь сколько нужно — **жирным**, *курсивом*, списками, - [ ] чек-листами…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="note-modal-foot">
            {orgFields}
            <div className="row">
              <button type="submit" className="btn-primary" disabled={!title.trim()}>
                {note ? "Сохранить" : "＋ Создать"}
              </button>
              <button type="button" className="btn-ghost" onClick={onDone}>
                Отмена
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form className="new-form" onSubmit={submit}>
      <input autoFocus placeholder="Заголовок заметки" value={title} onChange={(e) => setTitle(e.target.value)} />

      <textarea
        placeholder="Текст заметки (необязательно)"
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {orgFields}

      <div className="row">
        <button type="submit" className="btn-primary" disabled={!title.trim()}>
          {note ? "Сохранить" : "＋ Добавить"}
        </button>
        <button type="button" className="btn-ghost" onClick={onDone}>
          Отмена
        </button>
      </div>
    </form>
  );
}
