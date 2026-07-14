import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../api";
import { useSetActiveWorkspaceId } from "../api";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal";
import { JoinWorkspaceModal } from "./JoinWorkspaceModal";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
}

export function WorkspaceSwitcher({ workspaces, activeWorkspace }: Props) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const setActiveWorkspaceId = useSetActiveWorkspaceId();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="workspace-switcher" ref={rootRef}>
      <button className="workspace-current" onClick={() => setOpen((v) => !v)}>
        <span className="workspace-current-name">{activeWorkspace.isPersonal ? "🏠" : "👥"} {activeWorkspace.name}</span>
        <span className="workspace-caret">▾</span>
      </button>

      {open && (
        <div className="workspace-dropdown">
          {workspaces.map((w) => (
            <button
              key={w.id}
              className={`workspace-option ${w.id === activeWorkspace.id ? "on" : ""}`}
              onClick={() => {
                setActiveWorkspaceId(w.id);
                setOpen(false);
              }}
            >
              {w.isPersonal ? "🏠" : "👥"} {w.name}
            </button>
          ))}
          <div className="workspace-dropdown-divider" />
          <button
            className="workspace-option"
            onClick={() => {
              setShowCreate(true);
              setOpen(false);
            }}
          >
            ＋ Новый workspace
          </button>
          <button
            className="workspace-option"
            onClick={() => {
              setShowJoin(true);
              setOpen(false);
            }}
          >
            🔑 Присоединиться по коду
          </button>
          <button
            className="workspace-option"
            onClick={() => {
              setShowSettings(true);
              setOpen(false);
            }}
          >
            ⚙️ Настройки «{activeWorkspace.name}»
          </button>
        </div>
      )}

      {showCreate && <CreateWorkspaceModal onDone={() => setShowCreate(false)} />}
      {showJoin && <JoinWorkspaceModal onDone={() => setShowJoin(false)} />}
      {showSettings && <WorkspaceSettingsModal workspace={activeWorkspace} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
