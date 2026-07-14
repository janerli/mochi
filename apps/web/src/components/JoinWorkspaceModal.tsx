import { useState } from "react";
import { useJoinWorkspace, useSetActiveWorkspaceId } from "../api";

export function JoinWorkspaceModal({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const joinWorkspace = useJoinWorkspace();
  const setActiveWorkspaceId = useSetActiveWorkspaceId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    joinWorkspace.mutate(code.trim(), {
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
          <h3 style={{ fontFamily: "'Mochi Display'", margin: 0 }}>Присоединиться</h3>
          <button type="button" className="note-modal-close" onClick={onDone} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <p className="empty-hint" style={{ padding: 0 }}>
          Введи код приглашения, которым с тобой поделились.
        </p>
        <input
          autoFocus
          placeholder="Код приглашения"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {joinWorkspace.isError && <p className="auth-error">{(joinWorkspace.error as Error).message}</p>}
        <div className="row">
          <button type="submit" className="btn-primary" disabled={!code.trim() || joinWorkspace.isPending}>
            Войти
          </button>
          <button type="button" className="btn-ghost" onClick={onDone}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
