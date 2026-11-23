// Mismas reglas que el backend (app/schemas.py): se validan aquí para avisar rápido,
// pero la validación que cuenta es la del servidor.
export const EMAIL_RE =
  /^[a-z0-9._%+\-]{1,64}@(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
export const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ._-]{1,39}$/;
export const PASSWORD_CHARS_RE = /^[\x21-\x7E]+$/;

export function isValidEmail(value) {
  const e = value.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) && !e.includes("..");
}

export function passwordChecks(p) {
  return [
    { ok: p.length >= 12 && p.length <= 128, label: "Entre 12 y 128 caracteres" },
    { ok: /[a-z]/.test(p), label: "Una minúscula" },
    { ok: /[A-Z]/.test(p), label: "Una mayúscula" },
    { ok: /\d/.test(p), label: "Un número" },
    { ok: /[^A-Za-z0-9]/.test(p), label: "Un símbolo (por ejemplo ! # $ %)" },
    { ok: p.length > 0 && PASSWORD_CHARS_RE.test(p), label: "Solo ASCII visible, sin espacios" },
  ];
}
