import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";
export type NoteColor = "pink" | "mint" | "lavender" | "butter";
export type NoteKind = "quick" | "big";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tag: string | null;
  order: number;
  recurrence: TaskRecurrence;
  estimateMinutes: number | null;
  reminderMinutesBefore: number | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  taskId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteGroup {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

// ---------- Active workspace ----------
// A plain module variable (kept in sync with the provider below) so the
// plumbing-free `request()` helper can attach it as a header without every
// call site having to pass it through explicitly. Set synchronously (not via
// an effect) so there's no window where a query can fire with a stale header
// right after switching.
let activeWorkspaceHeader: string | null =
  typeof window !== "undefined" ? localStorage.getItem("mochi-workspace") : null;

const WorkspaceContext = createContext<{
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
} | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(activeWorkspaceHeader);

  function setActiveWorkspaceId(id: string) {
    localStorage.setItem("mochi-workspace", id);
    activeWorkspaceHeader = id;
    setActiveWorkspaceIdState(id);
  }

  return (
    <WorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useActiveWorkspaceId() {
  const ctx = useContext(WorkspaceContext);
  return ctx?.activeWorkspaceId ?? null;
}

export function useSetActiveWorkspaceId() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useSetActiveWorkspaceId must be used inside WorkspaceProvider");
  return ctx.setActiveWorkspaceId;
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) headers["Content-Type"] = "application/json";
  if (activeWorkspaceHeader) headers["X-Workspace-Id"] = activeWorkspaceHeader;

  const res = await fetch(url, {
    headers,
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------- Auth ----------

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
}

export interface AuthUserWithRecoveryCode extends AuthUser {
  recoveryCode: string;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => request<AuthUser>("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      request<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      request<AuthUserWithRecoveryCode>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], { id: user.id, email: user.email });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; recoveryCode: string; newPassword: string }) =>
      request<AuthUserWithRecoveryCode>("/api/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], { id: user.id, email: user.email });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string | null; avatar?: string | null }) =>
      request<AuthUser>("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      request<void>("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useRegenerateRecoveryCode() {
  return useMutation({
    mutationFn: (data: { password: string }) =>
      request<{ recoveryCode: string }>("/api/auth/regenerate-recovery-code", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.setQueryData(["me"], null);
      qc.removeQueries({ queryKey: ["tasks"] });
      qc.removeQueries({ queryKey: ["notes"] });
      qc.removeQueries({ queryKey: ["noteGroups"] });
      qc.removeQueries({ queryKey: ["workspaces"] });
    },
  });
}

// ---------- Workspaces ----------

export interface Workspace {
  id: string;
  name: string;
  isPersonal: boolean;
  inviteCode: string;
  role: "owner" | "member";
}

export interface WorkspaceMemberInfo {
  email: string;
  role: "owner" | "member";
  joinedAt: string;
}

export function useWorkspaces() {
  return useQuery({ queryKey: ["workspaces"], queryFn: () => request<Workspace[]>("/api/workspaces") });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => request<WorkspaceMemberInfo[]>(`/api/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) }),
    // Written straight into the cache (not just invalidated) so the new
    // workspace is already there by the time the caller switches to it —
    // otherwise the "fall back to a valid workspace" effect in App.tsx can
    // win the race and bounce the switch right back.
    onSuccess: (workspace) => {
      qc.setQueryData<Workspace[]>(["workspaces"], (old) => [...(old ?? []), workspace]);
      joinSocketRoom(workspace.id);
    },
  });
}

export function useJoinWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      request<Workspace>("/api/workspaces/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
    onSuccess: (workspace) => {
      qc.setQueryData<Workspace[]>(["workspaces"], (old) => [...(old ?? []), workspace]);
      joinSocketRoom(workspace.id);
    },
  });
}

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      request<{ id: string; name: string }>(`/api/workspaces/${id}/rename`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useRegenerateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ inviteCode: string }>(`/api/workspaces/${id}/regenerate-invite`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useLeaveWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/workspaces/${id}/leave`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/workspaces/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

// ---------- Tasks ----------

export function useTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => request<Task[]>("/api/tasks"),
    enabled: !!workspaceId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { title: string }) =>
      request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: string }) =>
      request<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

// ---------- Notes ----------

export function useNotes(workspaceId: string | null) {
  return useQuery({
    queryKey: ["notes", workspaceId],
    queryFn: () => request<Note[]>("/api/notes"),
    enabled: !!workspaceId,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Note> & { title: string }) =>
      request<Note>("/api/notes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Note> & { id: string }) =>
      request<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

// ---------- Note groups ----------

export function useNoteGroups(workspaceId: string | null) {
  return useQuery({
    queryKey: ["noteGroups", workspaceId],
    queryFn: () => request<NoteGroup[]>("/api/note-groups"),
    enabled: !!workspaceId,
  });
}

export function useCreateNoteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request<NoteGroup>("/api/note-groups", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["noteGroups"] }),
  });
}

export function useDeleteNoteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/api/note-groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["noteGroups"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

// ---------- Focus sessions (personal — not workspace-scoped) ----------

export interface FocusSession {
  id: string;
  durationMinutes: number;
  completedAt: string;
}

export function useFocusSessions() {
  return useQuery({
    queryKey: ["focusSessions"],
    queryFn: () => request<FocusSession[]>("/api/focus-sessions"),
  });
}

export function useLogFocusSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) =>
      request<FocusSession>("/api/focus-sessions", { method: "POST", body: JSON.stringify({ durationMinutes }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focusSessions"] }),
  });
}

// ---------- Live sync ----------

let socket: Socket | null = null;

// The server only computes a socket's workspace rooms once, at connect time —
// call this right after creating/joining a workspace so live updates for it
// start flowing without needing a page refresh.
function joinSocketRoom(workspaceId: string) {
  socket?.emit("workspace:join-room", workspaceId);
}

export function useLiveSync() {
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) socket = io({ path: "/socket.io" });

    const onTasksChanged = ({ workspaceId }: { workspaceId: string }) =>
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    const onNotesChanged = ({ workspaceId }: { workspaceId: string }) =>
      qc.invalidateQueries({ queryKey: ["notes", workspaceId] });
    const onNoteGroupsChanged = ({ workspaceId }: { workspaceId: string }) =>
      qc.invalidateQueries({ queryKey: ["noteGroups", workspaceId] });
    const onFocusSessionsChanged = () => qc.invalidateQueries({ queryKey: ["focusSessions"] });
    const onWorkspacesChanged = () => qc.invalidateQueries({ queryKey: ["workspaces"] });
    const onAttachmentsChanged = ({ taskId }: { workspaceId: string; taskId: string }) =>
      qc.invalidateQueries({ queryKey: ["attachments", taskId] });

    socket.on("tasks:changed", onTasksChanged);
    socket.on("notes:changed", onNotesChanged);
    socket.on("noteGroups:changed", onNoteGroupsChanged);
    socket.on("focusSessions:changed", onFocusSessionsChanged);
    socket.on("workspaces:changed", onWorkspacesChanged);
    socket.on("attachments:changed", onAttachmentsChanged);

    return () => {
      socket?.off("tasks:changed", onTasksChanged);
      socket?.off("notes:changed", onNotesChanged);
      socket?.off("noteGroups:changed", onNoteGroupsChanged);
      socket?.off("focusSessions:changed", onFocusSessionsChanged);
      socket?.off("workspaces:changed", onWorkspacesChanged);
      socket?.off("attachments:changed", onAttachmentsChanged);
    };
  }, [qc]);
}
