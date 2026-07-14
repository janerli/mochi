import type { Note, NoteGroup, Task } from "../api";
import { useDeleteNote, useUpdateNote } from "../api";

function preview(content: string, max = 160) {
  const plain = content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/^-\s*\[[ xX]\]\s*/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}

function formatUpdated(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 24 && d.getDate() === new Date().getDate()) {
    return `сегодня, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface Props {
  note: Note;
  linkedTask: Task | undefined;
  group: NoteGroup | undefined;
  onEdit: () => void;
}

export function BigNoteCard({ note, linkedTask, group, onEdit }: Props) {
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  return (
    <div className="doc-card" onClick={onEdit}>
      <div className="doc-icon">📄</div>
      <div className="doc-body">
        <h4>{note.title}</h4>
        {note.content && <p className="doc-preview">{preview(note.content)}</p>}
        <div className="doc-meta">
          {group && <span className="link-badge group-badge">{group.name}</span>}
          {linkedTask && <span className="link-badge">→ {linkedTask.title}</span>}
          <span className="doc-updated">изменено {formatUpdated(note.updatedAt)}</span>
        </div>
      </div>
      <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`pin-toggle ${note.pinned ? "on" : ""}`}
          title={note.pinned ? "Открепить" : "Закрепить"}
          onClick={() => updateNote.mutate({ id: note.id, pinned: !note.pinned })}
        >
          📌
        </button>
        <button className="note-delete" onClick={() => deleteNote.mutate(note.id)}>
          удалить
        </button>
      </div>
    </div>
  );
}
