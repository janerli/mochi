import { useRef, useState } from "react";
import { useAttachments, useDeleteAttachment, useUploadAttachment } from "../api.attachments";

// A plain `<a href>` can't carry the X-Workspace-Id header that
// requireWorkspaceMember checks on every API route (a browser navigation
// can't set custom headers) — so downloads go through fetch() instead and
// save the response as a Blob.
async function downloadAttachment(id: string, filename: string) {
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("mochi-workspace") : null;
  const headers: Record<string, string> = {};
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

  const res = await fetch(`/api/attachments/${id}/download`, { credentials: "include", headers });
  if (!res.ok) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} МБ`;
}

export function AttachmentList({ taskId }: { taskId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: attachments } = useAttachments(taskId);
  const uploadAttachment = useUploadAttachment(taskId ?? "");
  const deleteAttachment = useDeleteAttachment();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!taskId) {
    return <p className="empty-hint">сохрани задачу, потом добавишь файлы</p>;
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      uploadAttachment.mutate(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="attachment-list">
      <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()}>
        📎 добавить файл
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!attachments || attachments.length === 0 ? (
        <p className="empty-hint">нет вложений</p>
      ) : (
        <ul className="attachment-items">
          {attachments.map((a) => (
            <li key={a.id} className="attachment-item">
              <button
                type="button"
                className="attachment-name"
                disabled={downloadingId === a.id}
                onClick={async () => {
                  setDownloadingId(a.id);
                  await downloadAttachment(a.id, a.filename);
                  setDownloadingId(null);
                }}
              >
                {a.filename}
              </button>
              <span className="attachment-size">{formatSize(a.size)}</span>
              <button
                type="button"
                className="card-delete"
                onClick={() => deleteAttachment.mutate({ id: a.id, taskId })}
              >
                удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
