import { useState } from "react";
import { NAME_RE, PASSWORD_CHARS_RE, isValidEmail, passwordChecks } from "../validators.js";

const COPY = {
  login: {
    title: "Entra a tu bóveda",
    sub: "Tu contraseña abre la sesión y también deriva, dentro de este navegador, la clave que descifra tus notas.",
    button: "Iniciar sesión",
  },
  register: {
    title: "Crea tu bóveda",
    sub: "Elige una contraseña larga. Si la olvidas, nadie puede recuperar tus notas: ni siquiera el servidor.",
    button: "Crear cuenta",
  },
  unlock: {
    title: "Desbloquea tu bóveda",
    sub: "Tu sesión sigue abierta, pero la clave de cifrado solo vive en la memoria de la pestaña y se perdió al recargar. Escribe tu contraseña para derivarla otra vez.",
    button: "Desbloquear",
  },
};

export default function AuthForm({ mode, email: lockedEmail, name, notice, onSubmit, onSwitch, onBack, onLogout }) {
  const [email, setEmail] = useState(lockedEmail || "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const isUnlock = mode === "unlock";
  const checks = passwordChecks(password);
  const copy = COPY[mode];

  function validate() {
    if (!isUnlock && !isValidEmail(email)) return "Escribe un correo válido.";
    if (isRegister) {
      if (!NAME_RE.test(displayName.trim()))
        return "El nombre debe tener de 2 a 40 caracteres: letras, números, espacio, punto, guion o guion bajo.";
      if (!checks.every((c) => c.ok)) return "La contraseña no cumple todos los requisitos de la lista.";
    } else if (!password || password.length > 128 || !PASSWORD_CHARS_RE.test(password)) {
      return "Escribe tu contraseña (solo caracteres ASCII visibles, sin espacios).";
    }
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit({ email: email.trim().toLowerCase(), display_name: displayName.trim(), password });
    } catch (err) {
      setError(err.message || "Ocurrió un error inesperado.");
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-side">
        <p className="auth-brand">SafeNotes</p>
        <h2>Cifrado antes de salir de tu pantalla.</h2>
        <p>Lo que se guarda en el servidor es ruido. La llave nunca viaja.</p>
      </section>

      <form className="auth-form" onSubmit={submit} noValidate>
        {onBack && (
          <button type="button" className="link" onClick={onBack}>
            Volver al inicio
          </button>
        )}
        <h1>{copy.title}</h1>
        <p className="sub">{copy.sub}</p>
        {notice && <p className="warn" role="status">{notice}</p>}

        {isUnlock ? (
          <p className="who">
            <strong>{name}</strong>
            <span>{lockedEmail}</span>
          </p>
        ) : (
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

        {isRegister && (
          <div className="field">
            <label htmlFor="name">Nombre para mostrar</label>
            <input
              id="name"
              type="text"
              autoComplete="nickname"
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="pw">
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoFocus={isUnlock}
            />
            <button type="button" className="link" onClick={() => setShow(!show)}>
              {show ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {isRegister && (
          <ul className="checks" aria-label="Requisitos de la contraseña">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "ok" : ""}>
                {c.label}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? (isRegister ? "Creando y derivando clave…" : "Derivando clave…") : copy.button}
        </button>

        {onSwitch && (
          <p className="switch">
            {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <button type="button" className="link" onClick={onSwitch}>
              {isRegister ? "Inicia sesión" : "Crea una"}
            </button>
          </p>
        )}
        {onLogout && (
          <p className="switch">
            <button type="button" className="link" onClick={onLogout}>
              Cerrar sesión
            </button>
          </p>
        )}
      </form>
    </main>
  );
}
