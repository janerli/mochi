import { useEffect, useState } from "react";
import type { AuthUser, Note, Task } from "../api";
import { useLogout } from "../api";
import { Avatar } from "./Avatar";
import { SearchBox } from "./SearchBox";
import { SettingsModal } from "./SettingsModal";
import type { View } from "./Sidebar";

interface Props {
  tasks: Task[];
  notes: Note[];
  user: AuthUser;
  onNavigate: (view: View) => void;
  onRecoveryCode: (code: string, title: string) => void;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function TopBar({ tasks, notes, user, onNavigate, onRecoveryCode }: Props) {
  const logout = useLogout();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("mochi-theme") as "light" | "dark") ?? "light",
  );
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mochi-theme", theme);
  }, [theme]);

  const doneToday = tasks.filter((t) => t.status === "done" && isToday(t.updatedAt)).length;

  const rawDateLabel = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateLabel = rawDateLabel.charAt(0).toUpperCase() + rawDateLabel.slice(1);

  return (
    <header className="topbar">
      <div className="greeting">
        <h1>Привет{user.name ? `, ${user.name}` : ""} 🌸</h1>
        <p>{dateLabel}</p>
      </div>
      <SearchBox tasks={tasks} notes={notes} onNavigate={onNavigate} />
      {doneToday > 0 && <div className="chip streak">✅ {doneToday} сегодня</div>}
      {notifyPermission === "default" && (
        <button
          className="btn-ghost"
          onClick={() => Notification.requestPermission().then(setNotifyPermission)}
        >
          🔔 Включить напоминания
        </button>
      )}
      <div className="theme-toggle">
        <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
          ☀️
        </button>
        <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          🌙
        </button>
      </div>
      <button
        className="btn-ghost profile-button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Настройки профиля"
      >
        <Avatar avatar={user.avatar} fallbackLetter={user.name || user.email} title={user.name || user.email} />
        {user.name && <span className="profile-button-name">{user.name}</span>}
      </button>
      <button className="btn-ghost" onClick={() => logout.mutate()}>
        Выйти
      </button>

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} onRecoveryCode={onRecoveryCode} />
      )}
    </header>
  );
}
