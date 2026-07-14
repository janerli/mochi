import { useState } from "react";

const TIPS = [
  "Маленький перерыв тоже часть плана 🌸",
  "Не забудь заглянуть в заметки 📝",
  "Один шаг за раз — этого достаточно 🍡",
  "Разбей большую задачу на пару маленьких",
  "Ты справляешься лучше, чем кажется",
];

export function Mascot() {
  const [tipIndex, setTipIndex] = useState(0);

  return (
    <div className="mascot-card">
      <button
        className="mascot"
        onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
        aria-label="Услышать ещё один совет от моти"
      >
        <span className="blush l" />
        <span className="blush r" />
      </button>
      <div className="mascot-tip">{TIPS[tipIndex]}</div>
      <div className="mascot-hint">нажми, чтобы услышать ещё</div>
    </div>
  );
}
