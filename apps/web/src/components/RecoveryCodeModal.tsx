import { useState } from "react";

interface Props {
  code: string;
  title: string;
  onDone: () => void;
}

export function RecoveryCodeModal({ code, title, onDone }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="note-modal-overlay">
      <div className="note-modal recovery-modal">
        <h3>{title}</h3>
        <p className="auth-subtitle" style={{ margin: "0 0 4px" }}>
          Если забудешь пароль — только этот код сможет его сбросить. Сохрани
          его в надёжном месте (менеджер паролей, заметка не в mochi 🙂).
          Показываем один раз.
        </p>

        <div className="recovery-code">{code}</div>

        <button type="button" className="btn-ghost" onClick={copy} style={{ alignSelf: "center" }}>
          {copied ? "Скопировано ✓" : "Скопировать"}
        </button>

        <label className="pin-check" style={{ justifyContent: "center", marginTop: 8 }}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Я сохранил(а) код
        </label>

        <button type="button" className="btn-primary" disabled={!confirmed} onClick={onDone} style={{ justifyContent: "center" }}>
          Продолжить
        </button>
      </div>
    </div>
  );
}
