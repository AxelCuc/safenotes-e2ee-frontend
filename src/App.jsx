import { useCallback, useEffect, useState } from "react";
import { api, setCsrf, setUnauthorizedHandler } from "./api.js";
import { cryptoAvailable, deriveMasterKey } from "./crypto.js";
import Background from "./components/Background.jsx";
import Landing from "./components/Landing.jsx";
import AuthForm from "./components/AuthForm.jsx";
import Dashboard from "./components/Dashboard.jsx";

/**
 * status:
 *   boot        -> preguntando al servidor si ya hay sesión
 *   guest       -> sin sesión (landing / login / registro)
 *   locked      -> la cookie de sesión sigue válida, pero la clave maestra no está en memoria
 *   vault       -> sesión + clave maestra en memoria: se puede cifrar y descifrar
 *   unsupported -> el navegador no ofrece Web Crypto (contexto no seguro)
 */
export default function App() {
  const [status, setStatus] = useState("boot");
  const [view, setView] = useState("landing"); // landing | login | register
  const [session, setSession] = useState(null);
  const [masterKey, setMasterKey] = useState(null); // CryptoKey no extraíble, solo en memoria
  const [notice, setNotice] = useState("");

  const backToGuest = useCallback((message = "") => {
    setCsrf(null);
    setMasterKey(null);
    setSession(null);
    setNotice(message);
    setView(message ? "login" : "landing");
    setStatus("guest");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => backToGuest("Tu sesión expiró. Inicia sesión de nuevo."));
    if (!cryptoAvailable()) {
      setStatus("unsupported");
      return;
    }
    api
      .me()
      .then((s) => {
        setCsrf(s.csrf_token);
        setSession(s);
        setStatus("locked");
      })
      .catch(() => setStatus("guest"));
  }, [backToGuest]);

  async function login(email, password) {
    const s = await api.login({ email, password });
    // La clave maestra se deriva AQUÍ, en el navegador. Nunca se envía a ningún lado.
    const key = await deriveMasterKey(password, s.kdf_salt, s.kdf_iterations);
    setCsrf(s.csrf_token);
    setSession(s);
    setMasterKey(key);
    setNotice("");
    setStatus("vault");
  }

  async function register({ email, display_name, password }) {
    await api.register({ email, display_name, password });
    await login(email, password);
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* si falla, igualmente limpiamos la memoria local */
    }
    backToGuest();
  }

  let screen;
  if (status === "boot") {
    screen = <div className="center"><span className="pulse" /></div>;
  } else if (status === "unsupported") {
    screen = (
      <div className="center">
        <div className="plain-msg">
          <h1>Este navegador no puede cifrar</h1>
          <p>
            La Web Crypto API solo funciona en conexiones seguras. Abre la aplicación desde
            http://localhost:5173 o http://127.0.0.1:5173 en el mismo equipo donde corre el servidor.
          </p>
        </div>
      </div>
    );
  } else if (status === "vault") {
    screen = <Dashboard user={session.user} cryptoKey={masterKey} onLogout={logout} />;
  } else if (status === "locked") {
    screen = (
      <AuthForm
        mode="unlock"
        email={session.user.email}
        name={session.user.display_name}
        onSubmit={({ password }) => login(session.user.email, password)}
        onLogout={logout}
      />
    );
  } else if (view === "login" || view === "register") {
    screen = (
      <AuthForm
        mode={view}
        notice={notice}
        onSubmit={(v) => (view === "login" ? login(v.email, v.password) : register(v))}
        onSwitch={() => {
          setNotice("");
          setView(view === "login" ? "register" : "login");
        }}
        onBack={() => {
          setNotice("");
          setView("landing");
        }}
      />
    );
  } else {
    screen = <Landing onLogin={() => setView("login")} onRegister={() => setView("register")} />;
  }

  return (
    <>
      <Background />
      <div className="screen" key={`${status}-${view}`}>
        {screen}
      </div>
    </>
  );
}
