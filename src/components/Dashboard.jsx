import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { decryptNote, encryptNote } from "../crypto.js";

const MAX_TITLE = 100;
const MAX_BODY = 20000;
const fmt = (iso) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

export default function Dashboard({ user, cryptoKey, onLogout }) {
  const [notes, setNotes] = useState([]); // cada nota: datos del servidor + title/body ya descifrados
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("view"); // view | edit | new
  const [query, setQuery] = useState("");

  // Al entrar: pedir las notas cifradas y descifrarlas AQUÍ con la clave maestra en memoria.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const raw = await api.listNotes();
        const opened = await Promise.all(
          raw.map(async (n) => {
            try {
              const plain = await decryptNote(cryptoKey, n);
              return { ...n, title: plain.title, body: plain.body };
            } catch {
              return { ...n, title: "(No se pudo descifrar)", body: "", broken: true };
            }
          })
        );
        if (!dead) setNotes(opened);
      } catch (err) {
        if (!dead) setLoadError(err.message);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [cryptoKey]);

  const selected = notes.find((n) => n.id === selectedId) || null;

  // La búsqueda ocurre en el navegador: el servidor no puede buscar en datos cifrados.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notes, query]);

  async function saveNote({ title, body }, id) {
    const sealed = await encryptNote(cryptoKey, { title, body }); // {ciphertext, iv}
    const saved = id ? await api.updateNote(id, sealed) : await api.createNote(sealed);
    const note = { ...saved, title, body };
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
    setSelectedId(note.id);
    setMode("view");
  }

  async function removeNote(id) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId(null);
    setMode("view");
  }

  const paneOpen = mode === "new" || !!selected;

  return (
    <div className="dash">
      <header className="topbar">
        <div className="brand">
          <i className="dot" />
          SafeNotes
        </div>
        <div className="topbar-right">
          <span className="who-small">{user.display_name}</span>
          <button className="btn ghost sm" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      <div className={`vault ${paneOpen ? "has-pane" : ""}`}>
        <aside className="list">
          <div className="list-head">
            <input
              type="search"
              placeholder="Buscar en tus notas"
              aria-label="Buscar en tus notas"
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="btn primary sm"
              onClick={() => {
                setSelectedId(null);
                setMode("new");
              }}
            >
              Nueva nota
            </button>
          </div>

          {loading && <p className="muted pad">Descifrando tus notas…</p>}
          {loadError && <p className="error">{loadError}</p>}
          {!loading && !loadError && notes.length === 0 && (
            <p className="muted pad">
              Tu bóveda está vacía. Crea tu primera nota y se cifrará antes de salir de este navegador.
            </p>
          )}
          {!loading && notes.length > 0 && filtered.length === 0 && (
            <p className="muted pad">Ninguna nota coincide con la búsqueda.</p>
          )}

          <ul>
            {filtered.map((n, i) => (
              <li key={n.id}>
                <button
                  className={`row ${n.id === selectedId && mode !== "new" ? "on" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                  onClick={() => {
                    setSelectedId(n.id);
                    setMode("view");
                  }}
                >
                  <strong>{n.title || "(Sin título)"}</strong>
                  <span>{fmt(n.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="pane">
          <button
            className="link back"
            onClick={() => {
              setSelectedId(null);
              setMode("view");
            }}
          >
            Volver a la lista
          </button>

          {mode === "new" && (
            <NoteEditor
              key="new"
              onSave={(data) => saveNote(data, null)}
              onCancel={() => setMode("view")}
            />
          )}
          {mode === "edit" && selected && (
            <NoteEditor
              key={`edit-${selected.id}`}
              initial={selected}
              onSave={(data) => saveNote(data, selected.id)}
              onCancel={() => setMode("view")}
            />
          )}
          {mode === "view" && selected && (
            <NoteView
              key={selected.id}
              note={selected}
              onEdit={() => setMode("edit")}
              onDelete={() => removeNote(selected.id)}
            />
          )}
          {mode === "view" && !selected && (
            <div className="empty">
              <h2>Elige una nota o crea una nueva</h2>
              <p className="muted">
                Todo lo que ves aquí se descifró en este navegador. El servidor solo tiene el texto cifrado.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function NoteView({ note, onEdit, onDelete }) {
  const [reveal, setReveal] = useState(false);
  const [raw, setRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("No se pudo copiar. Selecciona el texto manualmente.");
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <article className="note-view">
      <h2>{note.title || "(Sin título)"}</h2>
      <p className="muted">
        Creada {fmt(note.created_at)}. Última edición {fmt(note.updated_at)}.
      </p>

      <div className="secret-wrap">
        <pre className={`secret ${reveal ? "open" : ""}`}>{note.body || "(Nota sin contenido)"}</pre>
        {!reveal && (
          <button className="btn ghost sm unveil" onClick={() => setReveal(true)}>
            Mostrar contenido
          </button>
        )}
      </div>

      <div className="actions">
        {reveal && (
          <button className="btn ghost sm" onClick={() => setReveal(false)}>Ocultar</button>
        )}
        <button className="btn ghost sm" onClick={copy}>{copied ? "Copiado" : "Copiar contenido"}</button>
        <button className="btn ghost sm" onClick={onEdit}>Editar</button>
        {!confirming ? (
          <button className="btn ghost sm danger" onClick={() => setConfirming(true)}>Eliminar</button>
        ) : (
          <>
            <button className="btn primary sm" onClick={remove} disabled={busy}>
              {busy ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button className="btn ghost sm" onClick={() => setConfirming(false)} disabled={busy}>
              Cancelar
            </button>
          </>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <button className="link" onClick={() => setRaw(!raw)}>
        {raw ? "Ocultar lo que guarda el servidor" : "Ver lo que guarda el servidor"}
      </button>
      {raw && (
        <div className="raw">
          <p><strong>iv</strong> {note.iv}</p>
          <p><strong>ciphertext</strong> {note.ciphertext}</p>
        </div>
      )}
    </article>
  );
}

function NoteEditor({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!title.trim()) {
      setError("Escribe un título para la nota.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({ title: title.trim(), body });
    } catch (err) {
      setError(err.message || "No se pudo guardar la nota.");
      setBusy(false);
    }
  }

  return (
    <form className="editor" onSubmit={submit}>
      <h2>{initial ? "Editar nota" : "Nueva nota"}</h2>
      <div className="field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          type="text"
          maxLength={MAX_TITLE}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="body">Contenido</label>
        <textarea
          id="body"
          maxLength={MAX_BODY}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={busy}
        />
        <small className="muted">{body.length.toLocaleString("es-MX")} / {MAX_BODY.toLocaleString("es-MX")} caracteres</small>
      </div>
      <p className="muted">Se cifrará con AES-GCM en este navegador antes de enviarse.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn primary" disabled={busy}>{busy ? "Cifrando y guardando…" : "Guardar nota"}</button>
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
      </div>
    </form>
  );
}
