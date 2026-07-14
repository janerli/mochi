import { useState } from "react";
import { useLogin, useRegister, useResetPassword } from "../api";

type Mode = "login" | "register" | "reset";

export function LoginView({ onRecoveryCode }: { onRecoveryCode: (code: string, title: string) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const login = useLogin();
  const register = useRegister();
  const resetPassword = useResetPassword();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") {
      login.mutate({ email, password });
    } else if (mode === "register") {
      register.mutate(
        { email, password },
        { onSuccess: (user) => onRecoveryCode(user.recoveryCode, "Сохрани код восстановления 🍡") },
      );
    } else {
      resetPassword.mutate(
        { email, recoveryCode, newPassword },
        { onSuccess: (user) => onRecoveryCode(user.recoveryCode, "Пароль сброшен — вот новый код") },
      );
    }
  }

  const active = mode === "login" ? login : mode === "register" ? register : resetPassword;

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo" style={{ justifyContent: "center", marginBottom: 8 }}>
          <div className="logo-mark" />
          <div className="logo-word">
            mo<span>chi</span>
          </div>
        </div>
        <p className="auth-subtitle">
          {mode === "login" && "С возвращением 🌸"}
          {mode === "register" && "Заведём аккаунт 🍡"}
          {mode === "reset" && "Восстановим доступ 🔑"}
        </p>

        <input
          type="email"
          autoFocus
          placeholder="Почта"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {mode === "reset" && (
          <input
            placeholder="Код восстановления"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            required
          />
        )}

        <input
          type="password"
          placeholder={mode === "reset" ? "Новый пароль" : "Пароль"}
          value={mode === "reset" ? newPassword : password}
          onChange={(e) => (mode === "reset" ? setNewPassword(e.target.value) : setPassword(e.target.value))}
          minLength={6}
          required
        />

        {active.isError && <p className="auth-error">{(active.error as Error).message}</p>}

        <button type="submit" className="btn-primary" disabled={active.isPending} style={{ justifyContent: "center" }}>
          {mode === "login" && "Войти"}
          {mode === "register" && "Зарегистрироваться"}
          {mode === "reset" && "Сбросить пароль"}
        </button>

        {mode === "login" && (
          <>
            <button type="button" className="auth-switch" onClick={() => setMode("register")}>
              Нет аккаунта? Создать
            </button>
            <button type="button" className="auth-switch" onClick={() => setMode("reset")}>
              Забыл(а) пароль?
            </button>
          </>
        )}
        {mode !== "login" && (
          <button type="button" className="auth-switch" onClick={() => setMode("login")}>
            Уже есть аккаунт? Войти
          </button>
        )}
      </form>
    </div>
  );
}
