/**
 * Toda la criptografía vive aquí y usa SOLO la Web Crypto API nativa.
 *
 *  - PBKDF2-HMAC-SHA256 : contraseña + sal  ->  clave maestra AES-256
 *  - AES-GCM (256 bits) : cifra/descifra {título, cuerpo} con un IV aleatorio por nota
 *
 * La clave maestra se crea como NO EXTRAÍBLE (extractable = false): ni siquiera
 * el código de esta página puede leer sus bytes ni enviarlos a ningún lado.
 * Solo existe en memoria; al cerrar o recargar la pestaña desaparece.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const MIN_ITERATIONS = 100_000; // por si un servidor comprometido intentara debilitar el KDF
const IV_BYTES = 12;

export const cryptoAvailable = () =>
  typeof window !== "undefined" && !!(window.crypto && window.crypto.subtle);

// ---------- base64 <-> bytes (por tramos, para que no se rompa con textos largos) ----------
export function bytesToB64(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function b64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Contraseña + sal pública (del servidor) -> CryptoKey AES-GCM de 256 bits. */
export async function deriveMasterKey(password, saltB64, iterations) {
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS) {
    throw new Error("El servidor envió parámetros de derivación inseguros.");
  }
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false, // no extraíble
    ["encrypt", "decrypt"]
  );
}

/** {title, body} -> { ciphertext, iv } (ambos en base64). Es lo ÚNICO que viaja al servidor. */
export async function encryptNote(key, { title, body }) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES)); // IV nuevo en cada cifrado
  const plain = encoder.encode(JSON.stringify({ v: 1, title, body }));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return { ciphertext: bytesToB64(new Uint8Array(sealed)), iv: bytesToB64(iv) };
}

/** { ciphertext, iv } -> {title, body}. Lanza error si la clave es incorrecta o el dato fue alterado. */
export async function decryptNote(key, { ciphertext, iv }) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(iv) },
    key,
    b64ToBytes(ciphertext)
  );
  const data = JSON.parse(decoder.decode(plain));
  return { title: String(data.title ?? ""), body: String(data.body ?? "") };
}
