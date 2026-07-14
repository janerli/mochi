import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { MobileHeader } from "./components/MobileHeader";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { TaskBoard } from "./components/TaskBoard";
import { NotesBoard } from "./components/NotesBoard";
import { CalendarView } from "./components/CalendarView";
import { FocusView } from "./components/FocusView";
import { LoginView } from "./components/LoginView";
import { RecoveryCodeModal } from "./components/RecoveryCodeModal";
import {
  useTasks,
  useNotes,
  useNoteGroups,
  useLiveSync,
  useMe,
  useWorkspaces,
  useActiveWorkspaceId,
  useSetActiveWorkspaceId,
  WorkspaceProvider,
  type Workspace,
  type AuthUser,
} from "./api";
import { useTaskReminders } from "./useTaskReminders";

export function App() {
  const me = useMe();
  const [recoveryCodeInfo, setRecoveryCodeInfo] = useState<{ code: string; title: string } | null>(null);

  function showRecoveryCode(code: string, title: string) {
    setRecoveryCodeInfo({ code, title });
  }

  if (me.isLoading) {
    return <div className="auth-loading">Загружаю mochi 🍡…</div>;
  }

  return (
    <>
      {!me.data ? (
        <LoginView onRecoveryCode={showRecoveryCode} />
      ) : (
        <WorkspaceProvider>
          <WorkspaceGate user={me.data} onRecoveryCode={showRecoveryCode} />
        </WorkspaceProvider>
      )}

      {recoveryCodeInfo && (
        <RecoveryCodeModal
          code={recoveryCodeInfo.code}
          title={recoveryCodeInfo.title}
          onDone={() => setRecoveryCodeInfo(null)}
        />
      )}
    </>
  );
}

// Waits for the workspace list, and makes sure there's always a valid active
// one selected — falls back to the personal workspace the first time, or if
// the previously-active one no longer exists (e.g. the user left it).
function WorkspaceGate({
  user,
  onRecoveryCode,
}: {
  user: AuthUser;
  onRecoveryCode: (code: string, title: string) => void;
}) {
  const workspacesQuery = useWorkspaces();
  const activeWorkspaceId = useActiveWorkspaceId();
  const setActiveWorkspaceId = useSetActiveWorkspaceId();

  const workspaces = workspacesQuery.data ?? [];
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    if (!workspacesQuery.isSuccess || activeWorkspace || workspaces.length === 0) return;
    const fallback = workspaces.find((w) => w.isPersonal) ?? workspaces[0];
    setActiveWorkspaceId(fallback.id);
  }, [workspacesQuery.isSuccess, activeWorkspace, workspaces, setActiveWorkspaceId]);

  if (workspacesQuery.isLoading || !activeWorkspace) {
    return <div className="auth-loading">Загружаю mochi 🍡…</div>;
  }

  return (
    <AuthenticatedApp
      user={user}
      onRecoveryCode={onRecoveryCode}
      workspaces={workspaces}
      activeWorkspace={activeWorkspace}
    />
  );
}

function AuthenticatedApp({
  user,
  onRecoveryCode,
  workspaces,
  activeWorkspace,
}: {
  user: AuthUser;
  onRecoveryCode: (code: string, title: string) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
}) {
  const [view, setView] = useState<View>("tasks");
  const tasksQuery = useTasks(activeWorkspace.id);
  const notesQuery = useNotes(activeWorkspace.id);
  const groupsQuery = useNoteGroups(activeWorkspace.id);
  useLiveSync();

  const tasks = tasksQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  useTaskReminders(tasks);

  return (
    <div className="app">
      <Sidebar
        view={view}
        onChange={setView}
        taskCount={tasks.length}
        noteCount={notes.length}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
      />

      <div className="main">
        <MobileHeader workspaces={workspaces} activeWorkspace={activeWorkspace} />
        <TopBar tasks={tasks} notes={notes} user={user} onNavigate={setView} onRecoveryCode={onRecoveryCode} />

        {view === "tasks" && (
          <TaskBoard tasks={tasks} isLoading={tasksQuery.isLoading} workspaceId={activeWorkspace.id} />
        )}
        {view === "notes" && (
          <NotesBoard notes={notes} tasks={tasks} groups={groups} isLoading={notesQuery.isLoading} />
        )}
        {view === "calendar" && <CalendarView tasks={tasks} />}
        {view === "focus" && <FocusView />}
      </div>

      <BottomNav view={view} onChange={setView} taskCount={tasks.length} noteCount={notes.length} />
    </div>
  );
}
