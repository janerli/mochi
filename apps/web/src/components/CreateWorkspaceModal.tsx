import { useState } from "react";
import { useCreateWorkspace, useSetActiveWorkspaceId } from "../api";

export function CreateWorkspaceModal({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const createWorkspace = useCreateWorkspace();
  const setActiveWorkspaceId = useSetActiveWorkspaceId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspace.mutate(name.trim(), {
      onSuccess: (workspace) => {
        setActiveWorkspaceId(workspace.id);
        onDone();
      },
    });
  }

  return (
    <div className="note-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onDone()}>
      <form className="note-modal" style={{ width: "min(380px, 100%)" }} onSubmit={submit}>
        <div className="note-modal-head">
          <h3 style={{ fontFamily: "'Mochi Display'", margin: 0 }}>Новый workspace</h3>
          <button type="button" className="note-modal-close" onClick={onDone} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <p className="empty-hint" style={{ padding: 0 }}>
          Отдельное пространство для задач и заметок — можно позвать туда кого-то по коду.
        </p>
        <input autoFocus placeholder="Название, например «С Ромой»" value={name} onChange={(e) => setName(e.target.value)} />
        {createWorkspace.isError && <p className="auth-error">{(createWorkspace.error as Error).message}</p>}
        <div className="row">
          <button type="submit" className="btn-primary" disabled={!name.trim() || createWorkspace.isPending}>
            ＋ Создать
          </button>
          <button type="button" className="btn-ghost" onClick={onDone}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
