import { useEffect, useRef, useState } from "react";
import { useFocusSessions, useLogFocusSession } from "../api";

type Mode = "work" | "break";

const DURATIONS: Record<Mode, number> = { work: 25 * 60, break: 5 * 60 };
const MODE_LABEL: Record<Mode, string> = { work: "Фокус", break: "Перерыв" };

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function FocusView() {
  const [mode, setMode] = useState<Mode>("work");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const sessionsQuery = useFocusSessions();
  const logSession = useLogFocusSession();
  const sessionsToday = (sessionsQuery.data ?? []).filter((s) => isToday(s.completedAt)).length;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const nextMode: Mode = mode === "work" ? "break" : "work";
          if (mode === "work") logSession.mutate(DURATIONS.work / 60);
          setMode(nextMode);
          return DURATIONS[nextMode];
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  const total = DURATIONS[mode];
  const progress = 1 - secondsLeft / total;

  function reset() {
    setRunning(false);
    setMode("work");
    setSecondsLeft(DURATIONS.work);
  }

  function switchMode(next: Mode) {
    setRunning(false);
    setMode(next);
    setSecondsLeft(DURATIONS[next]);
  }

  return (
    <section className="view">
      <div className="view-head">
        <h2>Фокус-сессия</h2>
      </div>

      <div className="focus-wrap">
        <div className="focus-tabs">
          <button className={`filter-chip ${mode === "work" ? "on" : ""}`} onClick={() => switchMode("work")}>
            Фокус 25 мин
          </button>
          <button className={`filter-chip ${mode === "break" ? "on" : ""}`} onClick={() => switchMode("break")}>
            Перерыв 5 мин
          </button>
        </div>

        <div className={`focus-ring mode-${mode}`} style={{ ["--progress" as string]: progress }}>
          <div className="focus-time">{formatTime(secondsLeft)}</div>
        </div>
        <div className="chip streak">{MODE_LABEL[mode]}</div>

        <div className="focus-controls">
          <button className="btn-primary" onClick={() => setRunning((r) => !r)}>
            {running ? "⏸ Пауза" : "▶ Старт"}
          </button>
          <button className="btn-ghost" onClick={reset}>
            ↺ Сброс
          </button>
        </div>

        <p className="empty-hint">
          {sessionsToday === 0 ? "Ещё не завершено ни одной сессии сегодня" : `Завершено сессий сегодня: ${sessionsToday} 🍡`}
        </p>
      </div>
    </section>
  );
}
