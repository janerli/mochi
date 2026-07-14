import { useEffect } from "react";
import type { Task } from "./api";

const STORAGE_KEY = "mochi-notified-tasks";
const CHECK_INTERVAL_MS = 30_000;
const LATE_GRACE_MS = 60 * 60 * 1000; // still fire if the app was closed until up to 1h after the due date

function loadNotified(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveNotified(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Client-side only — reminders fire while mochi is open (browser tab or the
// desktop app), via the standard Notification API. No server push involved:
// no service worker, no VAPID keys, nothing to run when the app isn't open.
export function useTaskReminders(tasks: Task[]) {
  useEffect(() => {
    if (typeof Notification === "undefined") return;

    function checkReminders() {
      if (Notification.permission !== "granted") return;

      const notified = loadNotified();
      const now = Date.now();
      let changed = false;

      for (const task of tasks) {
        if (!task.dueDate || task.reminderMinutesBefore == null || task.status === "done") continue;

        const dueTime = new Date(task.dueDate).getTime();
        const reminderTime = dueTime - task.reminderMinutesBefore * 60_000;
        const alreadyNotified = notified[task.id] === task.dueDate;

        if (!alreadyNotified && now >= reminderTime && now <= dueTime + LATE_GRACE_MS) {
          const n = new Notification(`🍡 ${task.title}`, {
            body:
              task.reminderMinutesBefore === 0
                ? "Дедлайн прямо сейчас"
                : `Дедлайн через ${task.reminderMinutesBefore < 60 ? `${task.reminderMinutesBefore} мин` : `${Math.round(task.reminderMinutesBefore / 60)} ч`}`,
            tag: `mochi-task-${task.id}`,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };

          notified[task.id] = task.dueDate;
          changed = true;
        }
      }

      // prune entries for tasks that no longer exist or are long past, so
      // localStorage doesn't grow forever
      const activeIds = new Set(tasks.map((t) => t.id));
      for (const id of Object.keys(notified)) {
        if (!activeIds.has(id)) {
          delete notified[id];
          changed = true;
        }
      }

      if (changed) saveNotified(notified);
    }

    checkReminders();
    const interval = window.setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [tasks]);
}
