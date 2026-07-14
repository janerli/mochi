import { useState } from "react";
import { useChangePassword, useMe, useRegenerateRecoveryCode, useUpdateProfile } from "../api";
import { AVATAR_PRESETS, Avatar } from "./Avatar";

interface Props {
  onClose: () => void;
  onRecoveryCode: (code: string, title: string) => void;
}

export function SettingsModal({ onClose, onRecoveryCode }: Props) {
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(me.data?.name ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changeDone, setChangeDone] = useState(false);

  const [regenPassword, setRegenPassword] = useState("");

  const changePassword = useChangePassword();
  const regenerateCode = useRegenerateRecoveryCode();

  function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaved(false);
    updateProfile.mutate({ name }, { onSuccess: () => setProfileSaved(true) });
  }

  function pickAvatar(key: string) {
    setProfileSaved(false);
    updateProfile.mutate({ avatar: key }, { onSuccess: () => setProfileSaved(true) });
  }

  function submitChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeDone(false);
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setChangeDone(true);
          setCurrentPassword("");
          setNewPassword("");
        },
      },
    );
  }

  function submitRegenerate(e: React.FormEvent) {
    e.preventDefault();
    regenerateCode.mutate(
      { password: regenPassword },
      {
        onSuccess: (data) => {
          setRegenPassword("");
          onRecoveryCode(data.recoveryCode, "Новый код восстановления");
          onClose();
        },
      },
    );
  }

  return (
    <div className="note-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="note-modal" style={{ width: "min(440px, 100%)" }}>
        <div className="note-modal-head">
          <h3 style={{ fontFamily: "'Mochi Display'", margin: 0 }}>Настройки</h3>
          <button type="button" className="note-modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <form className="new-form" onSubmit={submitProfile}>
          <p className="field-label" style={{ marginBottom: -4 }}>
            Профиль
          </p>
          <div className="profile-name-row">
            <Avatar avatar={me.data?.avatar} fallbackLetter={name || me.data?.email} size={48} />
            <input
              placeholder="Как тебя называть?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              style={{ flex: 1 }}
            />
          </div>
          <div className="avatar-picker">
            {AVATAR_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={me.data?.avatar === p.key ? "selected" : ""}
                onClick={() => pickAvatar(p.key)}
                aria-label={p.key}
              >
                <Avatar avatar={p.key} size={36} />
              </button>
            ))}
          </div>
          {profileSaved && <p className="mascot-tip" style={{ margin: 0 }}>Сохранено ✓</p>}
          <button type="submit" className="btn-primary" disabled={updateProfile.isPending}>
            Сохранить имя
          </button>
        </form>

        <form className="new-form" onSubmit={submitChangePassword}>
          <p className="field-label" style={{ marginBottom: -4 }}>
            Сменить пароль
          </p>
          <input
            type="password"
            placeholder="Текущий пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          {changePassword.isError && <p className="auth-error">{(changePassword.error as Error).message}</p>}
          {changeDone && <p className="mascot-tip" style={{ margin: 0 }}>Пароль обновлён ✓</p>}
          <button type="submit" className="btn-primary" disabled={changePassword.isPending}>
            Сохранить пароль
          </button>
        </form>

        <form className="new-form" onSubmit={submitRegenerate}>
          <p className="field-label" style={{ marginBottom: -4 }}>
            Получить новый код восстановления
          </p>
          <p className="empty-hint" style={{ padding: 0 }}>
            Старый код перестанет работать. Понадобится текущий пароль.
          </p>
          <input
            type="password"
            placeholder="Пароль для подтверждения"
            value={regenPassword}
            onChange={(e) => setRegenPassword(e.target.value)}
            required
          />
          {regenerateCode.isError && <p className="auth-error">{(regenerateCode.error as Error).message}</p>}
          <button type="submit" className="btn-ghost" disabled={regenerateCode.isPending}>
            Сгенерировать новый код
          </button>
        </form>
      </div>
    </div>
  );
}
