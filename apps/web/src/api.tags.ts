import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./api";

export interface TagInfo {
  tag: string;
  count: number;
}

export function useTags(workspaceId: string | null) {
  return useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => request<TagInfo[]>("/api/tags"),
    enabled: !!workspaceId,
  });
}

export function useRenameTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      request<{ updated: number }>("/api/tags/rename", { method: "POST", body: JSON.stringify({ from, to }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tag }: { tag: string }) =>
      request<{ updated: number }>("/api/tags/delete", { method: "POST", body: JSON.stringify({ tag }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
