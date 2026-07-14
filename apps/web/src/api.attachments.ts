import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./api";

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

// Kept in sync with the same localStorage-backed value api.tsx uses for the
// X-Workspace-Id header — duplicated here (rather than imported) because the
// upload call below can't go through request()'s JSON-only fetch wrapper.
function activeWorkspaceId(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("mochi-workspace") : null;
}

export function useAttachments(taskId: string | null) {
  return useQuery({
    queryKey: ["attachments", taskId],
    queryFn: () => request<Attachment[]>(`/api/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  });
}

export function useUploadAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      const workspaceId = activeWorkspaceId();
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

      // Intentionally bypasses request() here: it force-sets
      // Content-Type: application/json whenever a body is present, which
      // would corrupt this multipart/form-data upload (the browser needs to
      // set its own Content-Type with the multipart boundary).
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      return res.json() as Promise<Attachment>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) =>
      request<void>(`/api/attachments/${id}`, { method: "DELETE" }),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
