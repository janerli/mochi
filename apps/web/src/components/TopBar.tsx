import { useEffect, useState } from "react";
import type { Note, Task } from "../api";
import { useLogout } from "../api";
import { SearchBox } from "./SearchBox";
import { SettingsModal } from "./SettingsModal";
import type { View } from "./Sidebar";

interface Props {
  tasks: Task[];
  notes: Note[];
  email: string;
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

export function TopBar({ tasks, notes, email, onNavigate, onRecoveryCode }: Props) {
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
        <h1>Привет 🌸</h1>
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
      <div className="avatar" title={email} />
      <button className="btn-ghost" onClick={() => setSettingsOpen(true)} aria-label="Настройки">
        ⚙️
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
