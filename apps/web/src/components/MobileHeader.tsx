import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { Workspace } from "../api";

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
}

// Sidebar (logo + workspace switcher) is hidden below the .bottom-nav
// breakpoint — this stands in for the workspace switcher only, shown via
// the same breakpoint. See styles.css .mobile-header.
export function MobileHeader({ workspaces, activeWorkspace }: Props) {
  return (
    <div className="mobile-header">
      <div className="logo">
        <div className="logo-mark" />
        <div className="logo-word">
          mo<span>chi</span>
        </div>
      </div>
      <WorkspaceSwitcher workspaces={workspaces} activeWorkspace={activeWorkspace} />
    </div>
  );
}
