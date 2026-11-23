import { useEffect, useState } from "react";
import { useReveal } from "../hooks.js";

const PHRASES = [
  "Contraseña del banco: Tr0ub4dor&3",
  "Clave del wifi de casa: lunes-2026",
  "Token de producción: sk_live_9f2a71",
  "Frase de recuperación: cobre luna árbol",
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const noise = (n) =>
  Array.from({ length: Math.max(0, n) }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

/** El momento memorable de la página: una frase que se cifra y se descifra sola. */
function CipherDemo() {
  const [text, setText] = useState(PHRASES[0]);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let dead = false;
    const timers = [];
    const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)));

    const morph = async (target, isSealed) => {
      const steps = 16;
      for (let s = 1; s <= steps && !dead; s++) {
        const n = Math.floor((target.length * s) / steps);
        setText(target.slice(0, n) + noise(target.length - n));
        await wait(42);
      }
      if (!dead) {
        setText(target);
        setSealed(isSealed);
      }
    };

    (async () => {
      let i = 0;
      while (!dead) {
        const plain = PHRASES[i % PHRASES.length];
        await morph(plain, false);
        await wait(2400);
        setSealed(true);
        await morph(noise(plain.length + 10), true);
        await wait(2000);
        i += 1;
      }
    })();

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={`demo ${sealed ? "sealed" : ""}`} aria-live="off">
      <p className="demo-state">{sealed ? "Esto es lo que ve el servidor" : "Esto es lo que escribes"}</p>
      <p className="demo-text">{text}</p>
    </div>
  );
}

const STEPS = [
  ["Se deriva tu clave", "Con tu contraseña y una sal pública, tu navegador calcula una clave AES de 256 bits usando PBKDF2 (600 000 iteraciones). La clave no se puede exportar y no se envía."],
  ["Se cifra cada nota", "El título y el cuerpo se cifran con AES-GCM, con un vector de inicialización nuevo para cada nota, antes de salir de tu equipo."],
  ["El servidor guarda ruido", "La API recibe únicamente el texto cifrado y el IV. No existe ninguna columna con títulos ni contenido."],
  ["Se descifra al volver", "Cuando abres tu bóveda, las notas llegan cifradas y se abren en tu navegador con la clave que está en memoria."],
];

const GUARDS = [
  ["Argon2id", "La contraseña de acceso se guarda como hash lento y con sal, nunca en claro."],
  ["Sesión HttpOnly", "El JWT vive en una cookie que JavaScript no puede leer, con protección CSRF."],
  ["Bloqueo de cuenta", "Cinco intentos fallidos bloquean el acceso durante 15 minutos."],
  ["Límite de peticiones", "Cada ruta tiene un tope por minuto para frenar la fuerza bruta."],
  ["Aislamiento por usuario", "Cada consulta filtra por dueño y los identificadores son UUID imposibles de adivinar."],
  ["Cabeceras estrictas", "CSP, CORS con orígenes explícitos y bloqueo de marcos y de tipos MIME falsos."],
];

export default function Landing({ onLogin, onRegister }) {
  useReveal();
  return (
    <>
      <header className="nav">
        <div className="brand">
          <i className="dot" />
          SafeNotes <span className="muted">E2EE</span>
        </div>
        <nav>
          <button className="btn ghost sm" onClick={onLogin}>Iniciar sesión</button>
          <button className="btn primary sm" onClick={onRegister}>Crear cuenta</button>
        </nav>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Lo que guardas aquí solo lo puedes leer tú.</h1>
          <p className="lead">
            Una bóveda para contraseñas, claves y notas privadas. Todo se cifra en tu navegador antes de
            enviarse, así que el servidor guarda texto que no puede leer.
          </p>
          <div className="cta-row">
            <button className="btn primary" onClick={onRegister}>Crear mi bóveda</button>
            <button className="btn ghost" onClick={onLogin}>Ya tengo cuenta</button>
          </div>
          <CipherDemo />
        </section>

        <section className="block">
          <h2 className="reveal">Qué pasa con cada nota</h2>
          <ol className="steps">
            {STEPS.map(([title, text], i) => (
              <li className="step reveal" key={title}>
                <span className="num">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="block split">
          <div className="reveal">
            <h2>En tu pantalla</h2>
            <p className="plain">
              Tarjeta del banco{"\n"}NIP: 4821{"\n"}Respuesta secreta: Ciudad de México
            </p>
            <p className="muted">Solo tú ves esto, y solo mientras tu clave esté en memoria.</p>
          </div>
          <div className="reveal">
            <h2>En la base de datos</h2>
            <p className="plain cipher">
              kQ3vX9mT+0rZ8aWb2LfN7yHcP1sUeJdG4xOiVt5R6nBqMwY0zAhKjC8lEoSgFu2D1pXvTn7Qa/ZmRb9cLkW3yHe5sJf
            </p>
            <p className="muted">
              El servidor conoce tu correo, tu nombre, el hash de tu contraseña y las fechas. No conoce
              títulos, contenido ni tu clave maestra.
            </p>
          </div>
        </section>

        <section className="block">
          <h2 className="reveal">Protecciones que rodean la bóveda</h2>
          <dl className="guards">
            {GUARDS.map(([term, desc]) => (
              <div className="guard reveal" key={term}>
                <dt>{term}</dt>
                <dd>{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="block closing reveal">
          <h2>Si olvidas tu contraseña, tus notas no se pueden recuperar.</h2>
          <p className="lead">Esa es la prueba de que nadie más puede abrirlas. Guárdala bien.</p>
          <button className="btn primary" onClick={onRegister}>Crear mi bóveda</button>
        </section>
      </main>

      <footer className="foot">SafeNotes E2EE. Proyecto de Seguridad Informática.</footer>
    </>
  );
}
