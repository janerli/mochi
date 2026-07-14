import { useMemo, useState } from "react";
import type { Task } from "../api";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const PRIORITY_DOT: Record<Task["priority"], string> = { low: "mint", medium: "butter", high: "pink" };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildGrid(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // JS getDay(): 0=Sun..6=Sat -> convert to Monday-first index
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();

  const days = useMemo(() => buildGrid(cursor), [cursor]);
  const rawMonthLabel = cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  return (
    <section className="view">
      <div className="view-head">
        <h2>{monthLabel}</h2>
        <div className="spacer-flex" />
        <button className="btn-ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
          ← пред.
        </button>
        <button className="btn-ghost" onClick={() => setCursor(new Date())}>
          сегодня
        </button>
        <button className="btn-ghost" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
          след. →
        </button>
      </div>

      <div className="calendar">
        {WEEKDAYS.map((w) => (
          <div className="cal-weekday" key={w}>
            {w}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`cal-cell ${inMonth ? "" : "outside"} ${sameDay(day, today) ? "today" : ""}`}
            >
              <span className="cal-date">{day.getDate()}</span>
              <div className="cal-tasks">
                {dayTasks.map((t) => (
                  <span key={t.id} className={`cal-task dot-${PRIORITY_DOT[t.priority]}`} title={t.title}>
                    {new Date(t.dueDate!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {t.title}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
