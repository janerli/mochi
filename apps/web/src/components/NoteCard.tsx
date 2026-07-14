import type { Note, NoteGroup, Task } from "../api";
import { useDeleteNote, useUpdateNote } from "../api";

interface Props {
  note: Note;
  linkedTask: Task | undefined;
  group: NoteGroup | undefined;
  onEdit: () => void;
}

export function NoteCard({ note, linkedTask, group, onEdit }: Props) {
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  return (
    <div className={`note ${note.color} ${note.pinned ? "pinned" : ""}`}>
      <div className="note-head">
        <h4>{note.title}</h4>
        <button
          className={`pin-toggle ${note.pinned ? "on" : ""}`}
          title={note.pinned ? "Открепить" : "Закрепить"}
          onClick={() => updateNote.mutate({ id: note.id, pinned: !note.pinned })}
        >
          📌
        </button>
      </div>

      {note.content && <p>{note.content}</p>}

      <div className="note-tags">
        {group && <span className="link-badge group-badge">{group.name}</span>}
        {linkedTask && <span className="link-badge">→ {linkedTask.title}</span>}
      </div>

      <div className="note-foot">
        <button className="note-edit" onClick={onEdit}>
          править
        </button>
        <button className="note-delete" onClick={() => deleteNote.mutate(note.id)}>
          удалить
        </button>
      </div>
    </div>
  );
}
