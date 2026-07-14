import { useState } from "react";
import {
  type Workspace,
  useWorkspaceMembers,
  useRenameWorkspace,
  useRegenerateInvite,
  useLeaveWorkspace,
  useDeleteWorkspace,
} from "../api";

interface Props {
  workspace: Workspace;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = { owner: "владелец", member: "участник" };

export function WorkspaceSettingsModal({ workspace, onClose }: Props) {
  const isOwner = workspace.role === "owner";
  const membersQuery = useWorkspaceMembers(workspace.id);
  const [name, setName] = useState(workspace.name);
  const [inviteCode, setInviteCode] = useState(workspace.inviteCode);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const renameWorkspace = useRenameWorkspace();
  const regenerateInvite = useRegenerateInvite();
  const leaveWorkspace = useLeaveWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === workspace.name) return;
    renameWorkspace.mutate({ id: workspace.id, name: name.trim() });
  }

  function regenerate() {
    regenerateInvite.mutate(workspace.id, { onSuccess: (data) => setInviteCode(data.inviteCode) });
  }

  function leave() {
    leaveWorkspace.mutate(workspace.id, {
      onSuccess: () => {
        onClose();
      },
    });
  }

  function confirmDelete() {
    deleteWorkspace.mutate(workspace.id, {
      onSuccess: () => onClose(),
    });
  }

  return (
    <div className="note-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="note-modal" style={{ width: "min(440px, 100%)" }}>
        <div className="note-modal-head">
          <h3 style={{ fontFamily: "'Mochi Display'", margin: 0 }}>Настройки workspace</h3>
          <button type="button" className="note-modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {isOwner && !workspace.isPersonal && (
          <form className="new-form" onSubmit={submitRename}>
            <p className="field-label" style={{ marginBottom: -4 }}>
              Название
            </p>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn-ghost" disabled={!name.trim() || renameWorkspace.isPending}>
              Сохранить название
            </button>
          </form>
        )}

        {!workspace.isPersonal && (
          <div className="new-form">
            <p className="field-label" style={{ marginBottom: -4 }}>
              Код приглашения
            </p>
            <div className="recovery-code" style={{ fontSize: ".95rem" }}>
              {inviteCode}
            </div>
            <div className="row">
              <button type="button" className="btn-ghost" onClick={copyCode}>
                {copied ? "Скопировано ✓" : "Скопировать"}
              </button>
              {isOwner && (
                <button type="button" className="btn-ghost" onClick={regenerate} disabled={regenerateInvite.isPending}>
                  Перевыпустить код
                </button>
              )}
            </div>
          </div>
        )}

        <div className="new-form">
          <p className="field-label" style={{ marginBottom: -4 }}>
            Участники
          </p>
          {membersQuery.isLoading && <p className="empty-hint" style={{ padding: 0 }}>Загружаю…</p>}
          {membersQuery.data?.map((m) => (
            <div key={m.email} className="workspace-member-row">
              <span>{m.email}</span>
              <span className="search-result-meta">{ROLE_LABEL[m.role] ?? m.role}</span>
            </div>
          ))}
        </div>

        {!workspace.isPersonal && !isOwner && (
          <button type="button" className="btn-ghost" onClick={leave} disabled={leaveWorkspace.isPending}>
            Покинуть workspace
          </button>
        )}

        {!workspace.isPersonal && isOwner && (
          <div className="new-form">
            {!confirmingDelete ? (
              <button type="button" className="card-delete" style={{ alignSelf: "flex-start" }} onClick={() => setConfirmingDelete(true)}>
                Удалить workspace для всех
              </button>
            ) : (
              <>
                <p className="auth-error">
                  Удалится безвозвратно вместе со всеми задачами и заметками для всех участников. Точно?
                </p>
                <div className="row">
                  <button type="button" className="card-delete" onClick={confirmDelete} disabled={deleteWorkspace.isPending}>
                    Да, удалить
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirmingDelete(false)}>
                    Передумал(а)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
