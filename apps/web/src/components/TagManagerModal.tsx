import { useState } from "react";
import { useTags, useRenameTag, useDeleteTag, type TagInfo } from "../api.tags";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

function taskWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "задачи";
  return "задач";
}

export function TagManagerModal({ workspaceId, onClose }: Props) {
  const tagsQuery = useTags(workspaceId);
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();

  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  function startEdit(tag: string) {
    setConfirmingDelete(null);
    setEditingTag(tag);
    setDraftName(tag);
  }

  function saveEdit(tag: string) {
    const next = draftName.trim();
    if (!next || next === tag) {
      setEditingTag(null);
      return;
    }
    renameTag.mutate(
      { from: tag, to: next },
      {
        onSuccess: () => setEditingTag(null),
      },
    );
  }

  function confirmDelete(tag: string) {
    deleteTag.mutate(
      { tag },
      {
        onSuccess: () => setConfirmingDelete(null),
      },
    );
  }

  const tags: TagInfo[] = tagsQuery.data ?? [];

  return (
    <div className="note-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="note-modal" style={{ width: "min(440px, 100%)" }}>
        <div className="note-modal-head">
          <h3 style={{ fontFamily: "'Mochi Display'", margin: 0 }}>Управление тегами</h3>
          <button type="button" className="note-modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {tagsQuery.isLoading ? (
          <p className="empty-hint">Загружаю теги…</p>
        ) : tags.length === 0 ? (
          <p className="empty-hint">тегов пока нет</p>
        ) : (
          <div className="new-form">
            {tags.map((t) => (
              <div key={t.tag} className="workspace-member-row">
                {editingTag === t.tag ? (
                  <>
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <div className="row" style={{ flex: "0 0 auto" }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => saveEdit(t.tag)}
                        disabled={renameTag.isPending}
                      >
                        Сохранить
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => setEditingTag(null)}>
                        Отмена
                      </button>
                    </div>
                  </>
                ) : confirmingDelete === t.tag ? (
                  <>
                    <span>
                      {t.tag} — точно?
                    </span>
                    <div className="row" style={{ flex: "0 0 auto" }}>
                      <button
                        type="button"
                        className="card-delete"
                        onClick={() => confirmDelete(t.tag)}
                        disabled={deleteTag.isPending}
                      >
                        да
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => setConfirmingDelete(null)}>
                        отмена
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>
                      {t.tag} <span className="search-result-meta">
                        {t.count} {taskWord(t.count)}
                      </span>
                    </span>
                    <div className="row" style={{ flex: "0 0 auto" }}>
                      <button type="button" className="btn-ghost" onClick={() => startEdit(t.tag)} aria-label="Переименовать">
                        ✎
                      </button>
                      <button
                        type="button"
                        className="card-delete"
                        onClick={() => {
                          setEditingTag(null);
                          setConfirmingDelete(t.tag);
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
