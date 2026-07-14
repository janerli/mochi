import { useState } from "react";
import type { Note, NoteGroup, NoteKind, Task } from "../api";
import { useCreateNoteGroup, useDeleteNoteGroup } from "../api";
import { NoteCard } from "./NoteCard";
import { BigNoteCard } from "./BigNoteCard";
import { NoteEditor } from "./NoteEditor";

export function NotesBoard({
  notes,
  tasks,
  groups,
  isLoading,
}: {
  notes: Note[];
  tasks: Task[];
  groups: NoteGroup[];
  isLoading: boolean;
}) {
  const [creating, setCreating] = useState<NoteKind | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | "all">("all");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const createGroup = useCreateNoteGroup();
  const deleteGroup = useDeleteNoteGroup();

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const filtered = activeGroup === "all" ? notes : notes.filter((n) => n.groupId === activeGroup);
  const bigNotes = filtered.filter((n) => n.kind === "big");
  const quickNotes = filtered.filter((n) => n.kind !== "big");

  function submitNewGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createGroup.mutate(newGroupName.trim(), {
      onSuccess: () => {
        setNewGroupName("");
        setAddingGroup(false);
      },
    });
  }

  function closeEditor() {
    setCreating(null);
    setEditingNote(null);
  }

  return (
    <section className="view">
      <div className="view-head">
        <h2>Заметки</h2>
        <div className="spacer-flex" />
        <button className="btn-ghost" onClick={() => setCreating("quick")}>
          ＋ Быстрая заметка
        </button>
        <button className="btn-primary" onClick={() => setCreating("big")}>
          ＋ Большая заметка
        </button>
      </div>

      <div className="view-head">
        <button className={`filter-chip ${activeGroup === "all" ? "on" : ""}`} onClick={() => setActiveGroup("all")}>
          Все
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            className={`filter-chip group-chip ${activeGroup === g.id ? "on" : ""}`}
            onClick={() => setActiveGroup(g.id)}
          >
            {g.name}
            <span
              className="group-remove"
              onClick={(e) => {
                e.stopPropagation();
                if (activeGroup === g.id) setActiveGroup("all");
                deleteGroup.mutate(g.id);
              }}
            >
              ×
            </span>
          </button>
        ))}
        {addingGroup ? (
          <form className="inline-group-form" onSubmit={submitNewGroup}>
            <input
              autoFocus
              placeholder="Название группы"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onBlur={() => !newGroupName.trim() && setAddingGroup(false)}
            />
          </form>
        ) : (
          <button className="filter-chip" onClick={() => setAddingGroup(true)}>
            ＋ группа
          </button>
        )}
      </div>

      {creating === "quick" && <NoteEditor kind="quick" tasks={tasks} groups={groups} onDone={closeEditor} />}
      {editingNote && editingNote.kind !== "big" && (
        <NoteEditor note={editingNote} tasks={tasks} groups={groups} onDone={closeEditor} />
      )}
      {(creating === "big" || editingNote?.kind === "big") && (
        <NoteEditor note={editingNote ?? undefined} kind="big" tasks={tasks} groups={groups} onDone={closeEditor} />
      )}

      {isLoading ? (
        <p className="empty-hint">Загружаю заметки…</p>
      ) : bigNotes.length === 0 && quickNotes.length === 0 ? (
        <p className="empty-hint">Заметок пока нет — самое время завести первую 🍡</p>
      ) : (
        <>
          {bigNotes.length > 0 && (
            <div className="notes-section">
              <div className="notes-section-title">📄 Большие заметки</div>
              <div className="doc-list">
                {bigNotes.map((note) => (
                  <BigNoteCard
                    key={note.id}
                    note={note}
                    linkedTask={note.taskId ? taskById.get(note.taskId) : undefined}
                    group={note.groupId ? groupById.get(note.groupId) : undefined}
                    onEdit={() => setEditingNote(note)}
                  />
                ))}
              </div>
            </div>
          )}

          {quickNotes.length > 0 && (
            <div className="notes-section">
              {bigNotes.length > 0 && <div className="notes-section-title">🗒️ Быстрые заметки</div>}
              <div className="corkboard">
                {quickNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    linkedTask={note.taskId ? taskById.get(note.taskId) : undefined}
                    group={note.groupId ? groupById.get(note.groupId) : undefined}
                    onEdit={() => setEditingNote(note)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
